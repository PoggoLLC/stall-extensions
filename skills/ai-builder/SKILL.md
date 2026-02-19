---
name: stall-extension-ai-builder
description: Build or update Stall store extensions from the official template with strict compliance checks. Use when a user asks to create, modify, optimize, or prepare a Stall extension for submission while keeping template architecture and build contracts intact.
---

# Stall Extension Ai Builder

## Overview

Implement extension features without breaking Stall's extension contract. Preserve the template build/runtime wiring, enforce version and size constraints, and verify output before submission.

## Workflow

1. Use `stall-extensions/templates/` as the source of truth.
2. Keep `stall.config.ts` unchanged (treat `store.config` references as this file).
3. Keep `stall.build.ts` unchanged.
4. Implement feature work primarily in `src/`.
5. Avoid installing new external libraries/packages.
6. Prefer shared modules already defined in `stall.build.ts`:
`react`, `react-dom`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `sonner`, `dexie-react-hooks`, `framer-motion`, `@use-stall/icons`, `@use-stall/ui`, `@use-stall/types`, `@use-stall/core`, `react-router-dom`, `zustand`, `zustand/middleware`.
7. Keep `dist/index.js` small:
`<=100 KB` target, `>100 KB` requires explicit justification, `>500 KB` is unacceptable.
8. Run tests and build:
`bun run test`, then `bun run build`.
9. Verify compliance with `scripts/check_extension_compliance.py`.

## Required File Contract

- Keep `src/index.ts` exporting `app`, `config`, `ui`, and shared utilities.
- Keep `src/extension.json` as the authoritative extension metadata.
- Keep `src/app.ts` defining extension `pages` and `lookup`.
- Keep `src/look-up.ts` lookup groups/actions aligned with `extension.json.entrypoint`.
- Update lookup navigation routes to include extension id:
`/extensions/<extension-id>/...`.

## Versioning Rules

- Bump `package.json` version for each extension release/update.
- Match `src/extension.json.version` to `package.json.version` exactly.
- Ensure PR summaries include version-change context.

## Build and Validation Procedure

1. Run `bun run test`.
2. Run `bun run build`.
3. Confirm `dist/index.js` exists.
4. Check bundle size:
`wc -c dist/index.js`.
5. Run the compliance checker:
`python3 scripts/check_extension_compliance.py --extension-root <path-to-extension> --template-root <path-to-template>`.
6. If `dist/index.js > 100 KB`, include a concrete justification in review notes.

## Editing Guardrails

- Do not rewrite `stall.build.ts` to support new packages.
- Do not rewrite `stall.config.ts` behavior or port contract.
- Do not add unrelated repository-wide changes.
- Keep diffs scoped to extension functionality and required metadata/version updates.
- Prefer minimal imports and existing `@use-stall/*` primitives to reduce bundle size.

## Resources

- Use `references/extension-rules.md` for the condensed contract checklist.
- Use `scripts/check_extension_compliance.py` for deterministic policy checks.

## Output Expectations

- Produce extension code that passes `bun run test` and `bun run build`.
- Preserve template build/config files unchanged.
- Keep artifact size aligned with store acceptance expectations.
- Report any unavoidable exception explicitly with technical justification.
