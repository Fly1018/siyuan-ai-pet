<script lang="ts">
    import { onMount } from "svelte";

    interface DocRow {
        id: string;
        title: string;
    }

    interface Props {
        labels: Record<string, string>;
        load: () => Promise<{ notebook: string; docs: DocRow[] }>;
        run: (ids: string[], onProgress: (text: string) => void) => Promise<string>;
        onClose: () => void;
    }

    let { labels, load, run, onClose }: Props = $props();

    let docs = $state<DocRow[]>([]);
    let selected = $state<string[]>([]);
    let loading = $state(true);
    let busy = $state(false);
    let status = $state("");
    let error = $state(false);

    onMount(async () => {
        try {
            const result = await load();
            docs = result.docs;
            selected = docs.map((doc) => doc.id);
        } catch (e: any) {
            error = true;
            status = e?.message || labels.batchLoading;
        } finally {
            loading = false;
        }
    });

    function isSelected(id: string) {
        return selected.includes(id);
    }

    function toggle(id: string) {
        if (busy) return;
        selected = isSelected(id) ? selected.filter((item) => item !== id) : [...selected, id];
    }

    async function start() {
        if (busy || !selected.length) {
            if (!selected.length) {
                error = true;
                status = labels.batchNeedSelect;
            }
            return;
        }
        busy = true;
        error = false;
        status = labels.batchLoading;
        try {
            const message = await run([...selected], (text) => {
                status = text;
            });
            error = false;
            status = message;
        } catch (e: any) {
            error = true;
            status = e?.message || labels.aiFailed;
        } finally {
            busy = false;
        }
    }
</script>

<div class="aipet-batch">
    <div class="aipet-batch__hint">{labels.batchHint}</div>
    <div class="aipet-batch__list">
        {#if loading}
            <div class="aipet-batch__empty">{labels.batchLoading}</div>
        {:else if docs.length === 0}
            <div class="aipet-batch__empty">{labels.batchNoDocs}</div>
        {:else}
            {#each docs as doc (doc.id)}
                <label class="aipet-batch__item">
                    <input
                        type="checkbox"
                        class="b3-switch"
                        checked={isSelected(doc.id)}
                        disabled={busy}
                        onchange={() => toggle(doc.id)}
                    />
                    <span class="aipet-batch__title" title={doc.title}>{doc.title}</span>
                </label>
            {/each}
        {/if}
    </div>
    <div class="aipet-batch__selection">
        <button
            type="button"
            class="b3-button b3-button--outline"
            disabled={busy || loading}
            onclick={() => (selected = docs.map((doc) => doc.id))}
        >
            {labels.batchSelectAll}
        </button>
        <button
            type="button"
            class="b3-button b3-button--outline"
            disabled={busy || loading}
            onclick={() => (selected = [])}
        >
            {labels.batchSelectNone}
        </button>
        <span class="aipet-batch__count">{labels.batchSelected.replace("%s", String(selected.length))}</span>
    </div>
    <div class="aipet-batch__status" class:error>{status}</div>
    <div class="aipet-batch__actions">
        <button type="button" class="b3-button b3-button--cancel" onclick={onClose} disabled={busy}>
            {labels.batchClose}
        </button>
        <button
            type="button"
            class="b3-button b3-button--text"
            onclick={start}
            disabled={busy || loading || selected.length === 0}
        >
            {busy ? labels.batchRunningShort : labels.batchStart}
        </button>
    </div>
</div>

<style>
    .aipet-batch {
        display: flex;
        flex-direction: column;
        gap: 10px;
        height: 100%;
        min-height: 0;
        box-sizing: border-box;
        padding: 14px 16px;
    }

    .aipet-batch__hint {
        color: var(--b3-theme-on-surface);
        font-size: 12px;
        line-height: 1.5;
    }

    .aipet-batch__list {
        flex: 1;
        min-height: 0;
        overflow: auto;
        border: 1px solid var(--b3-border-color);
        border-radius: 6px;
        padding: 4px 8px;
    }

    .aipet-batch__item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 4px;
        border-bottom: 1px dashed var(--b3-border-color);
    }

    .aipet-batch__item:last-child {
        border-bottom: 0;
    }

    .aipet-batch__title {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .aipet-batch__empty {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;
        color: var(--b3-theme-on-surface);
        font-size: 13px;
    }

    .aipet-batch__selection {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .aipet-batch__count {
        margin-left: auto;
        color: var(--b3-theme-on-surface);
        font-size: 12px;
    }

    .aipet-batch__status {
        min-height: 20px;
        color: var(--b3-theme-on-surface);
        font-size: 12px;
        white-space: pre-wrap;
    }

    .aipet-batch__status.error {
        color: var(--b3-theme-error);
    }

    .aipet-batch__actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: auto;
    }
</style>
