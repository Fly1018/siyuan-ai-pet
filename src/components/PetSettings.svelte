<script lang="ts">
    import { untrack } from "svelte";

    interface Settings {
        prompt: string;
        autoTag: boolean;
        autoTitleImg: boolean;
    }

    interface Props {
        labels: Record<string, string>;
        settings: Settings;
        onSave: (settings: Settings) => void;
        onCancel: () => void;
    }

    let { labels, settings, onSave, onCancel }: Props = $props();
    const initial = untrack(() => ({ ...settings }));
    let prompt = $state(initial.prompt);
    let autoTag = $state(initial.autoTag);
    let autoTitleImg = $state(initial.autoTitleImg);
</script>

<div class="aipet-settings">
    <label class="aipet-settings__field">
        <span>{labels.promptLabel}</span>
        <textarea class="b3-text-field fn__block" rows="8" bind:value={prompt} spellcheck="false"></textarea>
        <small>{labels.promptHint}</small>
    </label>
    <label class="aipet-settings__check">
        <input type="checkbox" class="b3-switch" bind:checked={autoTag} />
        <span>{labels.autoTagLabel}</span>
    </label>
    <label class="aipet-settings__check">
        <input type="checkbox" class="b3-switch" bind:checked={autoTitleImg} />
        <span>{labels.autoTitleImgLabel}</span>
    </label>
    <div class="aipet-settings__actions">
        <button type="button" class="b3-button b3-button--cancel" onclick={onCancel}>{labels.cancel}</button>
        <button
            type="button"
            class="b3-button b3-button--text"
            onclick={() => onSave({ prompt, autoTag, autoTitleImg })}
        >
            {labels.save}
        </button>
    </div>
</div>

<style>
    .aipet-settings {
        display: flex;
        flex-direction: column;
        gap: 14px;
        height: 100%;
        box-sizing: border-box;
        padding: 16px;
        overflow: auto;
    }

    .aipet-settings__field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 13px;
    }

    .aipet-settings__field small {
        color: var(--b3-theme-on-surface);
        font-size: 11px;
        line-height: 1.5;
    }

    .aipet-settings__check {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
    }

    .aipet-settings__actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: auto;
        padding-top: 10px;
    }
</style>
