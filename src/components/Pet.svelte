<script lang="ts">
    interface Props {
        state: {
            x: number;
            y: number;
            thinking: boolean;
            bubble: string;
            bubbleVisible: boolean;
        };
        labels: Record<string, string>;
        onClick: () => void;
        onDoubleClick: () => void;
        onContextMenu: (event: MouseEvent) => void;
        onMove: (x: number, y: number) => void;
    }

    let { state, labels, onClick, onDoubleClick, onContextMenu, onMove }: Props = $props();

    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    let clickTimer: ReturnType<typeof setTimeout> | null = null;

    function clamp(value: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, value));
    }

    function pointerDown(event: PointerEvent) {
        if (event.button !== 0) return;
        dragging = true;
        moved = false;
        startX = event.clientX;
        startY = event.clientY;
        originX = state.x;
        originY = state.y;
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }

    function pointerMove(event: PointerEvent) {
        if (!dragging) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
        if (!moved) return;
        state.x = clamp(originX + dx, 8, window.innerWidth - 76);
        state.y = clamp(originY + dy, 8, window.innerHeight - 88);
    }

    function pointerUp(event: PointerEvent) {
        if (!dragging) return;
        dragging = false;
        try {
            (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
        } catch (error) {
            // ignore
        }
        if (moved) {
            onMove(state.x, state.y);
            return;
        }
        if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
            onDoubleClick();
            return;
        }
        clickTimer = setTimeout(() => {
            clickTimer = null;
            onClick();
        }, 220);
    }
</script>

<div class="aipet-root" style={`left:${state.x}px;top:${state.y}px;`}>
    {#if state.bubbleVisible}
        <div class="aipet-bubble">{state.bubble}</div>
    {/if}
    <button
        type="button"
        class="aipet"
        class:aipet--thinking={state.thinking}
        aria-label={labels.petTip}
        title={labels.petTip}
        onpointerdown={pointerDown}
        onpointermove={pointerMove}
        onpointerup={pointerUp}
        oncontextmenu={(event) => {
            event.preventDefault();
            onContextMenu(event);
        }}
    >
        <svg class="aipet__svg" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
            <defs>
                <linearGradient id="aipet-body" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#60a5fa" />
                    <stop offset="1" stop-color="#8b5cf6" />
                </linearGradient>
            </defs>
            <line x1="32" y1="13" x2="32" y2="7" stroke="#8b5cf6" stroke-width="2.4" stroke-linecap="round" />
            <circle class="aipet__antenna" cx="32" cy="6" r="3" fill="#f472b6" />
            <rect x="13" y="15" width="38" height="30" rx="11" fill="url(#aipet-body)" />
            <rect x="18" y="22" width="28" height="16" rx="7" fill="#0f172a" opacity=".82" />
            <circle class="aipet__eye aipet__eye--left" cx="26" cy="30" r="3" fill="#e0f2fe" />
            <circle class="aipet__eye aipet__eye--right" cx="38" cy="30" r="3" fill="#e0f2fe" />
            <rect x="26" y="37" width="12" height="2" rx="1" fill="#bfdbfe" opacity=".8" />
            <rect x="20" y="45" width="24" height="11" rx="5" fill="url(#aipet-body)" />
            <circle cx="8" cy="34" r="4" fill="#93c5fd" />
            <circle cx="56" cy="34" r="4" fill="#93c5fd" />
        </svg>
    </button>
</div>

<style>
    .aipet-root {
        position: fixed;
        z-index: 35;
        user-select: none;
        -webkit-user-select: none;
    }

    .aipet {
        position: relative;
        display: block;
        width: 64px;
        height: 64px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: color-mix(in srgb, var(--b3-theme-surface) 86%, transparent);
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
        cursor: grab;
        transition: transform 0.16s ease;
    }

    .aipet:hover {
        transform: translateY(-2px) scale(1.03);
    }

    .aipet:active {
        cursor: grabbing;
    }

    .aipet--thinking {
        animation: aipet-bob 1.1s ease-in-out infinite;
    }

    .aipet--thinking .aipet__eye {
        animation: aipet-blink 0.9s ease-in-out infinite;
    }

    .aipet--thinking .aipet__antenna {
        animation: aipet-pulse 0.8s ease-in-out infinite;
    }

    .aipet__svg {
        display: block;
        width: 64px;
        height: 64px;
        pointer-events: none;
    }

    .aipet-bubble {
        position: absolute;
        right: 0;
        bottom: 76px;
        min-width: 120px;
        max-width: 240px;
        padding: 8px 12px;
        border: 1px solid var(--b3-border-color);
        border-radius: 10px;
        background: var(--b3-theme-surface);
        color: var(--b3-theme-on-surface);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
        font-size: 12px;
        line-height: 1.5;
        white-space: pre-wrap;
    }

    .aipet-bubble::after {
        content: "";
        position: absolute;
        right: 24px;
        bottom: -6px;
        width: 10px;
        height: 10px;
        border-right: 1px solid var(--b3-border-color);
        border-bottom: 1px solid var(--b3-border-color);
        background: var(--b3-theme-surface);
        transform: rotate(45deg);
    }

    @keyframes aipet-bob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
    }

    @keyframes aipet-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.35; }
    }

    @keyframes aipet-pulse {
        0%, 100% { fill: #f472b6; }
        50% { fill: #fbbf24; }
    }
</style>
