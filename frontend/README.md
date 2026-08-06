# Frontend

The active F-list Profile Editor frontend uses React 19, TypeScript, Vite 8, Tiptap 3, and Wouter.

## Scripts

- `npm run dev` starts the development server.
- `npm run lint` checks JavaScript, TypeScript, React, and Hooks rules.
- `npm run typecheck` runs the TypeScript 7 compiler without emitting files.
- `npm test` runs the Vitest suite once.
- `npm run build` type-checks and creates the production bundle.
- `npm run check` runs every required quality gate.
- `npm run preview` serves the production build locally.

Use `npm ci` for reproducible installs from `package-lock.json`.

## BBCode import

The editor sidebar's **Import** action accepts pasted F-list profile BBCode and replaces the current visual document. Supported formatting remains editable and exports back to readable BBCode. Unavailable `[img=…]`, `[icon]…[/icon]`, and `[eicon]…[/eicon]` content is rendered with a REPLACE ME image, while unsupported tags remain visible as text rather than being discarded.
