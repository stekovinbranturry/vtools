# ztools

Personal developer tools, available both as a CLI and a Chrome extension.

## Packages

- `@ztools/core` — shared VS Code Marketplace logic (parse/resolve/build URL).
- `@ztools/cli` — Ink-based terminal app. Binary: `ztools`.
- `@ztools/extension` — Chrome new-tab dashboard (Vite + React + Tailwind).

## Develop

```sh
pnpm install
pnpm build              # build all
pnpm dev                # watch all
pnpm test               # run tests
```

## CLI

```sh
pnpm --filter @ztools/cli build
node apps/cli/dist/cli.js            # interactive dashboard
node apps/cli/dist/cli.js vsix esbenp.prettier-vscode
```

To install globally: `cd apps/cli && pnpm link --global` (exposes `ztools`).

## Extension

```sh
pnpm --filter @ztools/extension build
# load apps/extension/dist as an unpacked extension in Chrome
```
