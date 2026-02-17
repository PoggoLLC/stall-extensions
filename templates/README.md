# Stall Extension Template

Starter template for building Stall Flex extensions.

## Prerequisites

- [Bun](https://bun.sh/) installed

## Setup

```bash
bun install
```

## Commands

```bash
bun run test
bun run dev
bun run build
```

`dev` and `build` run `bun test` first to validate extension contract compliance.

## Architecture

- `src/extension.json`: Extension metadata and entrypoint.
- `src/app.ts`: Main extension contract (`pages` + `lookup`).
- `src/look-up.ts`: Lookup group definitions and inline actions.
- `src/ui.tsx`: Exposed page component registry for runtime loading.
- `src/utils.ts`: Shared utility helpers.
- `stall.build.ts`: Build pipeline (single bundled output).
- `stall.config.ts`: Dev watcher + local serve/build entry.
- `store.test.ts`: Standard architecture tests (Bun test runner).

## Shared Modules

For optimization, we have shared modules that allow us to minimize the bundle size of your extension. We recommend using these libraries/packages, including React. Packages are already added as peer dependencies and in the build file. A large bundle size might result in your extension being rejected.

- sonner
- dexie-react-hooks
- framer-motion
- @use-stall/icons
- @use-stall/ui
- @use-stall/types
- @use-stall/core
- react-router-dom
- zustand

## Before Publishing

1. Update `src/extension.json` (`id`, `name`, `description`, `repo`, `homepage`, `entrypoint`).
2. Update `package.json` (`name`, `version`).
3. Adjust lookup routes in `src/look-up.ts` to match your extension `id`.
4. Run `bun run build` and verify `dist/index.js` is generated.
