# DevTools CLI Design

Date: 2026-06-10  
Status: Approved

## Goal

Port the `devtools-newtab` Chrome extension tools to an Ink-based CLI (`my-ink-cli`), starting with the VSIX downloader. Copy logic locally (no shared package yet).

## UX

- `my-ink-cli` — interactive dashboard (tool picker → VSIX form)
- `my-ink-cli vsix <extension> [--version] [--out]` — script mode, no TUI

## Structure

```
source/
├── cli.tsx
├── app.tsx
├── lib/marketplace.ts
└── tools/
    ├── registry.ts
    ├── Dashboard.tsx
    └── vsix/
        ├── download.ts
        └── VsixApp.tsx
```

## Dependencies

- ink-text-input@5, ink-spinner@5, ink-select-input@5 (Ink 4 compatible)

## Out of scope

- Monorepo / shared package with browser extension
- Mac wallpaper and other browser-only UI
- Tools beyond VSIX downloader
