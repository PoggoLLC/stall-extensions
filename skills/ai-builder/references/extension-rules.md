# Stall Extension Rules

## Hard Constraints

- Keep `stall.config.ts` unchanged.
- Keep `stall.build.ts` unchanged.
- Avoid adding external libraries/packages not already in template policy.
- Use shared modules listed in `stall.build.ts` to minimize bundle size.
- Keep `dist/index.js` small (`<=100 KB` target, never exceed `500 KB`).
- Keep `src/extension.json.version` equal to `package.json.version`.

## Required Commands

```bash
bun run test
bun run build
python3 scripts/check_extension_compliance.py --extension-root . --template-root ../templates
```

## Shared Modules Policy

- react
- react-dom
- react/jsx-runtime
- react/jsx-dev-runtime
- sonner
- dexie-react-hooks
- framer-motion
- @use-stall/icons
- @use-stall/ui
- @use-stall/types
- @use-stall/core
- react-router-dom
- zustand
- zustand/middleware

## Entry and Lookup Alignment

- Ensure `src/extension.json.entrypoint.id` maps to a real lookup group or page id.
- Ensure lookup actions navigate using `/extensions/<extension-id>/...`.
- Ensure `src/index.ts` exports `app`, `config`, `ui`, and utilities.
