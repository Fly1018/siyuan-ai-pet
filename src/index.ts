import { Plugin, Menu, showMessage, fetchSyncPost, getActiveEditor } from "siyuan";
import type { IProtyle } from "siyuan";
import { mount, unmount } from "svelte";
import Pet from "@/components/Pet.svelte";
import SummaryPanel from "@/components/SummaryPanel.svelte";
import PetSettings from "@/components/PetSettings.svelte";
import BatchDialog from "@/components/BatchDialog.svelte";
import { petState } from "@/pet-state.svelte";
import { svelteDialog } from "@/libs/dialog";
import { requestChat } from "@/ai";
import { pickTitleImage } from "@/cover";
import "./index.scss";

const DEFAULT_PROMPT = "请阅读下面的文档内容，用文档的主要语言生成一段简洁的摘要，必要时可用要点列表。只输出摘要正文，不要重复原文，也不要额外解释。请用 ==重点内容== 的形式标出关键词或关键句（每段或每条 1-3 处，不要整段高亮，也不要嵌套其他标记）。";
const DEFAULT_HEADING = "AI 摘要";
const DEFAULT_TAG_PROMPT = "从下面的文档中提取 3 到 5 个最能代表其主题的关键词，用作笔记标签。只输出关键词，用英文逗号分隔，不要带 # 号，不要编号，不要解释。";
const MAX_INPUT_CHARS = 20000;

interface PetSettingsData {
    prompt: string;
    autoTag: boolean;
    autoTitleImg: boolean;
}

interface ActiveDoc {
    id: string;
    notebookId: string;
}

export default class AiPet extends Plugin {
    private disposed = false;
    private busy = false;
    private abortController: AbortController | null = null;
    private petApp: ReturnType<typeof mount> | null = null;
    private petContainer: HTMLDivElement | null = null;
    private settings: PetSettingsData = { prompt: "", autoTag: true, autoTitleImg: true };
    private bubbleTimer: number | null = null;
    private summaryDialog: ReturnType<typeof svelteDialog> | undefined;
    private settingsDialog: ReturnType<typeof svelteDialog> | undefined;
    private batchDialog: ReturnType<typeof svelteDialog> | undefined;
    private pendingDocId = "";
    private pendingMarkdown = "";

    onload() {
        this.disposed = false;
    }

    async onLayoutReady() {
        if (this.disposed) return;
        await this.loadDataSafe();
        if (this.disposed) return;
        this.mountPet();
    }

    onunload() {
        this.disposed = true;
        this.abortController?.abort();
        this.abortController = null;
        if (this.bubbleTimer !== null) window.clearTimeout(this.bubbleTimer);
        this.summaryDialog?.close();
        this.settingsDialog?.close();
        this.batchDialog?.close();
        this.summaryDialog = undefined;
        this.settingsDialog = undefined;
        this.batchDialog = undefined;
        if (this.petApp) {
            unmount(this.petApp);
            this.petApp = null;
        }
        this.petContainer?.remove();
        this.petContainer = null;
        petState.bubbleVisible = false;
    }

    private t(key: string, fallback: string): string {
        const value = (this.i18n as Record<string, unknown>)[key];
        return typeof value === "string" && value ? value : fallback;
    }

    private tf(key: string, fallback: string, ...values: unknown[]): string {
        let index = 0;
        return this.t(key, fallback).replace(/%[ds]/g, () => {
            const value = values[index];
            index += 1;
            return value === undefined ? "" : String(value);
        });
    }

    private async loadDataSafe() {
        try {
            const state = await this.loadData("state");
            petState.x = window.innerWidth - 96;
            petState.y = window.innerHeight - 120;
            if (state && typeof state.x === "number" && typeof state.y === "number") {
                petState.x = Math.min(window.innerWidth - 76, Math.max(8, state.x));
                petState.y = Math.min(window.innerHeight - 88, Math.max(8, state.y));
            }
        } catch (error) {
            petState.x = window.innerWidth - 96;
            petState.y = window.innerHeight - 120;
        }
        try {
            const settings = await this.loadData("settings");
            if (settings && typeof settings === "object") {
                this.settings = {
                    prompt: typeof settings.prompt === "string" ? settings.prompt : "",
                    autoTag: settings.autoTag !== false,
                    autoTitleImg: settings.autoTitleImg !== false,
                };
            }
        } catch (error) {
            // defaults are fine
        }
    }

    private savePetState() {
        try {
            const request = this.saveData("state", { x: petState.x, y: petState.y });
            if (request && typeof request.then === "function") request.catch(() => undefined);
        } catch (error) {
            // ignore
        }
    }

    private saveSettings() {
        try {
            const request = this.saveData("settings", this.settings);
            if (request && typeof request.then === "function") request.catch(() => undefined);
        } catch (error) {
            // ignore
        }
    }

    private mountPet() {
        this.petContainer = document.createElement("div");
        this.petContainer.className = "aipet-root-container";
        document.body.appendChild(this.petContainer);
        this.petApp = mount(Pet, {
            target: this.petContainer,
            props: {
                state: petState,
                labels: { petTip: this.t("petTip", "Click to summarize; double-click to summarize the notebook") },
                onClick: () => void this.summarize(),
                onDoubleClick: () => this.openBatch(),
                onContextMenu: (event: MouseEvent) => this.showMenu(event),
                onMove: () => this.savePetState(),
            },
        });
    }

    private showBubble(text: string, timeout = 5000) {
        if (this.bubbleTimer !== null) window.clearTimeout(this.bubbleTimer);
        petState.bubble = text;
        petState.bubbleVisible = true;
        this.bubbleTimer = window.setTimeout(() => {
            this.bubbleTimer = null;
            petState.bubbleVisible = false;
        }, timeout);
    }

    private showMenu(event: MouseEvent) {
        if (this.disposed) return;
        const menu = new Menu("aipet-menu");
        menu.addItem({
            icon: "iconSparkles",
            label: this.t("settingsTitle", "Document summary"),
            click: () => void this.summarize(),
        });
        menu.addItem({
            icon: "iconFiles",
            label: this.t("batchTitle", "Batch summarize documents"),
            click: () => this.openBatch(),
        });
        menu.addSeparator();
        menu.addItem({
            icon: "iconSettings",
            label: this.t("settings", "Settings"),
            click: () => this.openSettings(),
        });
        menu.open({ x: event.clientX, y: event.clientY });
    }

    private getActiveDoc(): ActiveDoc | null {
        try {
            const editor = getActiveEditor();
            const protyle = editor?.protyle as IProtyle | undefined;
            const id = protyle?.block?.rootID || "";
            if (!id) return null;
            return { id, notebookId: protyle?.notebookId || "" };
        } catch (error) {
            return null;
        }
    }

    private currentProtyle(): any {
        try {
            return getActiveEditor();
        } catch (error) {
            return null;
        }
    }

    private async getDocMarkdown(id: string): Promise<string> {
        const response = await fetchSyncPost("/api/export/exportMdContent", { id });
        if (!response || response.code !== 0) throw new Error(response?.msg || "exportMdContent");
        return String(response.data?.content || "");
    }

    private truncate(text: string): string {
        if (text.length <= MAX_INPUT_CHARS) return text;
        return text.slice(0, MAX_INPUT_CHARS);
    }

    private async requestAI(input: string, action: string): Promise<string> {
        const controller = new AbortController();
        this.abortController = controller;
        const timeout = window.setTimeout(() => controller.abort(), 120000);
        try {
            return await requestChat({
                input,
                action,
                signal: controller.signal,
                failedMessage: this.t("aiFailed", "AI request failed"),
            });
        } finally {
            window.clearTimeout(timeout);
            if (this.abortController === controller) this.abortController = null;
        }
    }

    private async summarize() {
        if (this.disposed) return;
        if (this.busy) {
            this.showBubble(this.t("busy", "Summarizing, please wait…"));
            return;
        }
        const doc = this.getActiveDoc();
        if (!doc) {
            this.showBubble(this.t("needDoc", "Open a document first"));
            return;
        }
        this.busy = true;
        petState.thinking = true;
        this.showBubble(this.t("summarizing", "AI is summarizing…"), 120000);
        try {
            const markdown = await this.getDocMarkdown(doc.id);
            if (!markdown.trim()) {
                this.showBubble(this.t("emptyDoc", "The document is empty"));
                return;
            }
            const input = this.truncate(markdown);
            if (input.length < markdown.length) {
                this.showBubble(this.t("summarizingLong", "The document was truncated before sending to the AI"));
            }
            const prompt = this.settings.prompt.trim() || this.t("summaryAction", DEFAULT_PROMPT);
            const summary = (await this.requestAI(input, prompt)).trim();
            if (!summary) {
                this.showBubble(this.t("emptySummary", "No summary was returned"));
                return;
            }
            this.pendingDocId = doc.id;
            this.pendingMarkdown = markdown;
            this.openPreview(summary);
            this.showBubble(this.t("previewTitle", "Summary preview"), 3000);
        } catch (error: any) {
            this.showBubble(error?.message || this.t("failed", "Summarize failed"), 6000);
        } finally {
            this.busy = false;
            petState.thinking = false;
        }
    }

    private openPreview(summary: string) {
        if (this.summaryDialog) return;
        let handle: ReturnType<typeof svelteDialog>;
        handle = svelteDialog({
            title: this.t("previewTitle", "Summary preview"),
            component: SummaryPanel,
            width: "600px",
            height: "520px",
            props: {
                labels: {
                    previewInsertTop: this.t("previewInsertTop", "Insert at top"),
                    previewAppend: this.t("previewAppend", "Append to end"),
                    previewCopy: this.t("previewCopy", "Copy"),
                    previewDiscard: this.t("previewDiscard", "Discard"),
                },
                title: this.t("previewTitle", "Summary preview"),
                summary,
                onInsert: (mode: "prepend" | "append") => void this.insertSummary(summary, mode, handle),
                onCopy: () => this.copyText(summary),
                onClose: () => handle.close(),
            },
            callback: () => {
                if (this.summaryDialog === handle) this.summaryDialog = undefined;
            },
        });
        this.summaryDialog = handle;
    }

    private async insertSummary(summary: string, mode: "prepend" | "append", handle: ReturnType<typeof svelteDialog>) {
        const docId = this.pendingDocId;
        if (!docId) return;
        const heading = this.t("summaryHeading", DEFAULT_HEADING);
        const markdown = `## ${heading}\n\n${summary}\n\n---\n`;
        try {
            const api = mode === "prepend" ? "/api/block/prependBlock" : "/api/block/appendBlock";
            const response = await fetchSyncPost(api, {
                parentID: docId,
                dataType: "markdown",
                data: markdown,
            });
            if (!response || response.code !== 0) throw new Error(response?.msg || api);
            handle.close();
            showMessage(this.t("done", "Summary written"), 4000);
            this.pendingDocId = "";
            await this.autoTag(docId, this.pendingMarkdown);
            await this.autoTitle(docId);
            try {
                this.currentProtyle()?.reload?.(false);
            } catch (error) {
                // best-effort
            }
        } catch (error: any) {
            showMessage(`${this.t("failed", "Summarize failed")}: ${error?.message || error}`, 6000, "error");
        }
    }

    private copyText(text: string) {
        const done = () => showMessage(this.t("copied", "Copied to clipboard"), 3000);
        const fail = () => showMessage(this.t("copyFailed", "Copy failed"), 4000, "error");
        try {
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(text).then(done).catch(() => fail());
            } else {
                fail();
            }
        } catch (error) {
            fail();
        }
    }

    private async getDocAttrs(id: string): Promise<Record<string, string>> {
        try {
            const response = await fetchSyncPost("/api/attr/getBlockAttrs", { id });
            return response?.code === 0 ? response.data || {} : {};
        } catch (error) {
            return {};
        }
    }

    private parseTags(raw: string): string[] {
        const tags: string[] = [];
        for (const part of String(raw || "").split(/[,，\n]/)) {
            const tag = part.trim().replace(/^#+/, "").replace(/^[-*•\s]+/, "").replace(/[.。!！?？]+$/, "");
            if (tag && tag.length <= 20 && !tags.includes(tag)) tags.push(tag);
        }
        return tags.slice(0, 5);
    }

    private async autoTag(docId: string, markdown: string) {
        if (!this.settings.autoTag || !markdown.trim()) return;
        try {
            const raw = await this.requestAI(
                this.truncate(markdown),
                this.t("tagPrompt", DEFAULT_TAG_PROMPT),
            );
            const tags = this.parseTags(raw);
            if (!tags.length) return;
            const attrs = await this.getDocAttrs(docId);
            const existing = typeof attrs.tags === "string"
                ? attrs.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
                : [];
            const merged = [...existing];
            for (const tag of tags) if (!merged.includes(tag)) merged.push(tag);
            await fetchSyncPost("/api/attr/setBlockAttrs", {
                id: docId,
                attrs: { tags: merged.join(",") },
            });
            showMessage(this.tf("tagDone", "Tags written: %s", tags.join(", ")), 4000);
        } catch (error) {
            console.warn("[siyuan-ai-pet] tagging failed", error);
        }
    }

    private async autoTitle(docId: string) {
        if (!this.settings.autoTitleImg) return;
        try {
            const attrs = await this.getDocAttrs(docId);
            if (typeof attrs["title-img"] === "string" && attrs["title-img"].trim()) return;
            const url = pickTitleImage(docId);
            await fetchSyncPost("/api/attr/setBlockAttrs", {
                id: docId,
                attrs: { "title-img": `background-image:url("${url}")` },
            });
            showMessage(this.t("titleImgDone", "Title image set"), 3000);
        } catch (error) {
            console.warn("[siyuan-ai-pet] title image failed", error);
        }
    }

    private openSettings() {
        if (this.settingsDialog) return;
        let handle: ReturnType<typeof svelteDialog>;
        handle = svelteDialog({
            title: this.t("settingsTitle", "Pet settings"),
            component: PetSettings,
            width: "560px",
            height: "560px",
            props: {
                labels: {
                    promptLabel: this.t("promptLabel", "AI summary prompt"),
                    promptHint: this.t("promptHint", "Leave empty to use the built-in summary prompt."),
                    autoTagLabel: this.t("autoTagLabel", "Add tags after summarizing"),
                    autoTitleImgLabel: this.t("autoTitleImgLabel", "Add a title image after summarizing"),
                    cancel: this.t("cancel", "Cancel"),
                    save: this.t("save", "Save"),
                },
                settings: { ...this.settings },
                onSave: (next: PetSettingsData) => {
                    this.settings = {
                        prompt: String(next.prompt || ""),
                        autoTag: Boolean(next.autoTag),
                        autoTitleImg: Boolean(next.autoTitleImg),
                    };
                    this.saveSettings();
                    handle.close();
                    this.showBubble(this.t("settingsSaved", "Saved"), 2500);
                },
                onCancel: () => handle.close(),
            },
            callback: () => {
                if (this.settingsDialog === handle) this.settingsDialog = undefined;
            },
        });
        this.settingsDialog = handle;
    }

    private openBatch() {
        if (this.batchDialog) return;
        const doc = this.getActiveDoc();
        if (!doc) {
            this.showBubble(this.t("needDoc", "Open a document first"));
            return;
        }
        const notebook = doc.notebookId;
        let handle: ReturnType<typeof svelteDialog>;
        handle = svelteDialog({
            title: this.t("batchTitle", "Batch summarize documents"),
            component: BatchDialog,
            width: "560px",
            height: "560px",
            props: {
                labels: {
                    batchHint: this.t("batchTitle", "Batch summarize documents"),
                    batchLoading: this.t("batchLoading", "Loading documents…"),
                    batchNoDocs: this.t("batchNoDocs", "This notebook has no documents"),
                    batchSelectAll: this.t("batchSelectAll", "Select all"),
                    batchSelectNone: this.t("batchSelectNone", "Select none"),
                    batchSelected: this.t("batchSelected", "%s selected"),
                    batchStart: this.t("batchStart", "Start"),
                    batchRunningShort: this.t("summarizing", "AI is summarizing…"),
                    batchClose: this.t("cancel", "Cancel"),
                    batchNeedSelect: this.t("batchNeedSelect", "Select at least one document"),
                    aiFailed: this.t("aiFailed", "AI request failed"),
                },
                load: async () => {
                    const response = await fetchSyncPost("/api/query/sql", {
                        stmt: `SELECT id, content FROM blocks WHERE type = 'd' AND box = '${notebook.replace(/'/g, "")}' ORDER BY updated DESC LIMIT 100`,
                    });
                    const docs = response?.code === 0 && Array.isArray(response.data)
                        ? response.data.map((row: any) => ({ id: row.id, title: row.content || "Untitled" }))
                        : [];
                    return { notebook, docs };
                },
                run: async (ids: string[], onProgress: (text: string) => void) => {
                    const sections: string[] = [];
                    let failed = 0;
                    for (let index = 0; index < ids.length; index += 1) {
                        if (this.disposed) break;
                        const id = ids[index];
                        onProgress(this.tf("batchRunning", "Summarizing %s / %s: %s", index + 1, ids.length, id));
                        try {
                            const markdown = await this.getDocMarkdown(id);
                            if (!markdown.trim()) continue;
                            const summary = (await this.requestAI(
                                this.truncate(markdown),
                                this.settings.prompt.trim() || this.t("summaryAction", DEFAULT_PROMPT),
                            )).trim();
                            if (summary) {
                                const title = markdown.match(/^#\s+(.+)$/m)?.[1] || id;
                                sections.push(`## ${title}\n\n${summary}`);
                            }
                        } catch (error) {
                            failed += 1;
                        }
                    }
                    if (!sections.length) throw new Error(this.t("batchNoDocs", "No documents were summarized"));
                    const title = this.t("batchDocTitle", "%s · AI Summary").replace("%s", new Date().toLocaleDateString());
                    const path = `/${title}`;
                    const response = await fetchSyncPost("/api/filetree/createDocWithMd", {
                        notebook,
                        path,
                        markdown: `# ${title}\n\n${sections.join("\n\n---\n\n")}\n`,
                    });
                    if (!response || response.code !== 0) {
                        throw new Error(response?.msg || this.t("batchCreateFailed", "Failed to create the summary document"));
                    }
                    return this.tf("batchCreated", "Summary document created: %s", path) +
                        (failed ? ` (${failed} failed)` : "");
                },
                onClose: () => handle.close(),
            },
            callback: () => {
                if (this.batchDialog === handle) this.batchDialog = undefined;
            },
        });
        this.batchDialog = handle;
    }
}
