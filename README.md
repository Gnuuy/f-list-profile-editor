# F-list Profile Editor

A React and Tiptap WYSIWYG editor that converts a visual profile into readable F-list BBCode.

The editor can also import pasted F-list BBCode into an editable visual document. Inline images, character icons, and eicons that cannot be fetched are represented by clear REPLACE ME placeholders.

## Active application

The maintained frontend is in [`frontend`](./frontend). The `frontend-legacy` directory contains the earlier Next.js implementation and is not part of the active build.

### Requirements

- Node.js 20.19+, 22.12+, or a newer supported release
- npm 10+

### Run locally

```bash
cd frontend
npm ci
npm run dev
```

### Quality checks

```bash
cd frontend
npm run check
```

`check` runs ESLint, unit tests, TypeScript type-checking, and the production build.

## Architecture

The active application separates React views from editor state and commands through context-backed view models:

- `src/pages` and `src/views` contain page and component views.
- `src/models` contains editor-domain configuration and invariants.
- `src/context` contains view-model state and command façades.
- `src/utilities` contains editor extensions, BBCode serialization, clipboard access, and notifications.

See [`PROJECT_AUDIT.md`](./PROJECT_AUDIT.md) for the recommended next refactors and known product gaps.
