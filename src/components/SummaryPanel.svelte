<script lang="ts">
    interface Props {
        labels: Record<string, string>;
        title: string;
        summary: string;
        onInsert: (mode: "prepend" | "append") => void;
        onCopy: () => void;
        onClose: () => void;
    }

    let { labels, title, summary, onInsert, onCopy, onClose }: Props = $props();

    function escapeHtml(text: string): string {
        return String(text).replace(/[&<>"']/g, (ch) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#39;",
        }[ch] as string));
    }

    const html = $derived(
        escapeHtml(summary)
            .replace(/==([^=\n]+)==/g, "<mark>$1</mark>")
            .replace(/\n/g, "<br>"),
    );
</script>

<div class="aipet-preview">
    <div class="aipet-preview__title">{title}</div>
    <div class="aipet-preview__body">{@html html}</div>
    <div class="aipet-preview__actions">
        <button type="button" class="b3-button b3-button--outline" onclick={() => onInsert("prepend")}>
            {labels.previewInsertTop}
        </button>
        <button type="button" class="b3-button b3-button--outline" onclick={() => onInsert("append")}>
            {labels.previewAppend}
        </button>
        <button type="button" class="b3-button b3-button--outline" onclick={onCopy}>{labels.previewCopy}</button>
        <button type="button" class="b3-button" onclick={onClose}>{labels.previewDiscard}</button>
    </div>
</div>

<style>
    .aipet-preview {
        display: flex;
        flex-direction: column;
        gap: 10px;
        height: 100%;
        min-height: 0;
        box-sizing: border-box;
        padding: 14px 16px;
    }

    .aipet-preview__title {
        font-weight: 600;
        font-size: 14px;
        color: var(--b3-theme-on-background);
    }

    .aipet-preview__body {
        flex: 1;
        min-height: 0;
        overflow: auto;
        padding: 12px;
        border: 1px solid var(--b3-border-color);
        border-radius: 6px;
        background: var(--b3-theme-background);
        color: var(--b3-theme-on-background);
        font-size: 14px;
        line-height: 1.75;
        white-space: normal;
        word-break: break-word;
    }

    .aipet-preview__body :global(mark) {
        background: var(--b3-highlight-background, #fff2a8);
        color: var(--b3-highlight-color, inherit);
        border-radius: 2px;
        padding: 0 1px;
    }

    .aipet-preview__actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
    }
</style>
