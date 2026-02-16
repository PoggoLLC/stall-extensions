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

## Approval Rules
- Use only Stall libraries for UI and icons:
  - `@use-stall/ui`
  - `@use-stall/icons`
- Use interfaces from:
  - `@use-stall/types`
- Do not introduce external libraries/frameworks.

## Before Publishing
1. Update `src/extension.json` (`id`, `name`, `description`, `repo`, `homepage`, `entrypoint`).
2. Update `package.json` (`name`, `version`).
3. Adjust lookup routes in `src/look-up.ts` to match your extension `id`.
4. Run `bun run build` and verify `dist/index.js` is generated.
