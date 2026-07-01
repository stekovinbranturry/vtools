# vkit

Personal developer tools, available both as a CLI and a Chrome extension.

## Packages

- `@v-kit/core` — shared VS Code Marketplace logic (parse/resolve/build URL).
- `@v-kit/cli` — Ink-based terminal app. Binary: `vkit`.
- `vkit-extension` — Chrome new-tab dashboard (Vite + React + Tailwind).

## Develop

```sh
pnpm install
pnpm build              # build all
pnpm dev                # watch all
pnpm test               # run tests
```

## CLI

Interactive dashboard and script-mode commands. See [apps/cli/readme.md](apps/cli/readme.md) for full usage.

**Tools:** VS Code / Cursor extension install & sync, Node port viewer (macOS).

```sh
pnpm --filter @v-kit/cli build
node apps/cli/dist/cli.js            # interactive dashboard
node apps/cli/dist/cli.js vsix esbenp.prettier-vscode
node apps/cli/dist/cli.js vsix-sync
```

Install globally:

```sh
npm install -g @v-kit/cli
# or: cd apps/cli && pnpm link --global
```

## Publish to npm

Published packages: **`@v-kit/core`** (library) and **`@v-kit/cli`** (CLI). Both stay on the **same version** (Changesets `fixed` group).

**Publishing is CI-only** — do not run `npm publish` or `pnpm release` locally. The [Release workflow](.github/workflows/release.yml) handles build, provenance, and npm publish.

### One-time setup

1. On [npmjs.com](https://www.npmjs.com/), create an **Automation** access token with publish permission.
2. In GitHub repo **Settings → Secrets and variables → Actions**, add `NPM_TOKEN` with that token.
3. Ensure `@v-kit/cli` and `@v-kit/core` exist under the `v-kit` npm org and the token can publish to them.

### Release flow

1. When changing publishable packages, add a changeset and commit it with your feature:
   ```sh
   pnpm changeset
   ```
2. Merge to `main`.
3. CI opens a **Version Packages** PR (version bump + CHANGELOG).
4. Merge that PR → CI publishes to npm and pushes git tags.

### Local only (no publish)

```sh
pnpm changeset version   # preview version bump locally
pnpm build               # verify build
```

## Extension

```sh
pnpm --filter vkit-extension build
# load apps/extension/dist as an unpacked extension in Chrome
```
