# AI Document Pet

A small robot lives in the bottom-right corner of SiYuan.

- **Click** the robot to summarize the current document with SiYuan's built-in AI.
- **Double-click** it to batch-summarize documents in the current notebook into a new summary document.
- **Right-click** it for the same actions and settings.

After a single-document summary you get a preview with **Insert at top**, **Append to end**, **Copy**, and **Discard**. The written section uses an `## AI 摘要` heading and a trailing divider.

Optional post-processing:

- Add 3–5 AI-generated tags to the document.
- Add a deterministic title image (inline SVG, no network request).

Rebuilt with Vite 8 + TypeScript + Svelte 5.

## Requirements

- SiYuan desktop 3.7.0+.
- A working AI model configured in **Settings → AI**.

## Data impact

- Reads the current document Markdown, the document attributes, and the notebook document list.
- Writes the summary, tags, and title image only when you confirm them.
- AI requests go to the local SiYuan kernel only.

## Development

```bash
pnpm install
pnpm dev
pnpm check
pnpm build
```
