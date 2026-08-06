# Project audit

Updated 2026-08-06.

## Completed in this pass

- Upgraded the active frontend to React 19.2.8, Tiptap 3.29.2, Vite 8.2, ESLint 10.8, and the current compatible supporting packages.
- Replaced the older SWC Vite plugin with Vite 8's official React 6 plugin, which uses the current Oxc-based transform.
- Added strict TypeScript checking for the existing TSX source and the supported TypeScript 7/TypeScript 6 tooling bridge.
- Added ESLint coverage for TS and TSX files. Previously, most application source was not linted.
- Added Vitest regression coverage for BBCode paragraphs, overlapping marks, colors, alignment, quotes, collapses, indentation, and lists.
- Fixed Linux build failures caused by incorrectly cased imports.
- Reworked editor registration so toolbar state subscribes to the editor instance instead of polling a mutable ref during render.
- Added typed Tiptap commands for the custom collapse and quote extensions.
- Removed duplicate color, blockquote, and image extension registrations that could produce order-dependent editor behavior at runtime.
- Corrected the FAQ: profile content is not currently persisted locally; it only remains in the active tab until export.
- Added a tolerant F-list BBCode importer for editable text formatting, colors, links, alignment, indentation, quotes, collapses, lists, rules, and line breaks.
- Added a left-side Import action and accessible paste dialog that deliberately replaces the current document after confirmation.
- Added visual REPLACE ME placeholders for unavailable inline images and character icons.
- Preserved unsupported tags as visible text and report them after import so an import cannot silently discard profile content.
- Added import and supported round-trip regression coverage.
- Normalized profile-level `[indent]` wrappers during import so collapsible
  sections inherit an editable 3em indent without remaining trapped inside a
  narrower parent container.
- Replaced the legacy frontend's plaintext registry credential with a
  `TIPTAP_PRO_TOKEN` environment-variable reference.
- Added a responsive 16em minimum width for collapsible sections and made the
  editor gap between adjacent collapses reflect their explicit grouping state.
- Matched the website's 15px minimum collapse text height on the outer editor
  collapse container as an explicit layout floor.
- Rebuilt collapse and quote presentation around the website's actual CSS box
  model: separate header/body styling, normal text line-height, reset title
  input metrics, 10px quote padding, 2px quote margins, and no invented quote
  label or enclosing collapse card.
- Restored the website's rounded quote corners. Import now distinguishes a
  visible line break between adjacent `[collapse]` tags from directly touching
  tags, and export preserves that boundary instead of canonicalizing both forms
  to the same output. Each dropdown has explicit Join/Unjoin controls for that
  boundary and a Remove action that unwraps it without deleting its content.
- Made dropdown titles safely editable through an empty intermediate value, so
  deleting the final character no longer immediately restores `Details`.
- Made Join-next availability react to every editor transaction and clarified
  its direction in the control label. Inserting a dropdown from inside another
  now creates an adjacent sibling rather than an accidental nested dropdown.
- Added a high-priority `Ctrl/Cmd+Enter` dropdown-exit command that inserts and
  focuses a paragraph immediately after the nearest dropdown, while preserving
  Tiptap's default hard-break shortcut outside dropdowns. Matched the website's
  full 10px content margin on all four sides of expanded dropdown bodies.
- Matched expanded dropdown state styling: the header and body now form one
  `#235a8f` surface, the expanded title changes to `#eeeeee`, and intrinsic
  content height unfolds over 200ms without unmounting editor content. Profile
  horizontal rules now use the website's `#082d44` color.
- Preserved imported eicons as semantic named nodes, previewed them from F-list's
  public eicon image path with a local 50px fallback, and serialized them back to
  canonical `[eicon]name[/eicon]` BBCode. Eicons are selectable inline atoms that
  can be dragged between text positions, while line alignment continues to use
  F-list's paragraph-level left, centre, right, and justify semantics. Ordinary
  `[img]` placeholders continue to ask for an inline image. Rebuilt the F-list
  colour picker with named options, active-state feedback, viewport-aware
  placement, and keyboard navigation.

## Matters requiring attention

### 1. Complete the BBCode product contract

The importer now covers the editor's current feature set, but a canonical supported-BBCode matrix still needs to be verified against F-list itself. Add explicit decisions and tests for deeply nested structures, malformed markup recovery, every F-list-only tag, user-entered brackets and collapse titles, profile length limits, and exact round-trip expectations.

### 2. Add persistence and recovery

The editor currently loses work when the tab is closed or reloaded. Add versioned local persistence for the Tiptap JSON document, autosave status, recovery after malformed/stale data, and a deliberate “new profile” action. Keep storage behind an interface so browser storage can later be replaced without changing the view model.

### 3. Replace the image placeholder workflow

Inserted images are read as local data URLs, but export deliberately emits `REPLACE ME WITH YOUR INLINE`. Decide whether the product should request an already-hosted URL, integrate an allowed upload flow, or keep placeholders with a clearer guided replacement step. Imported eicons now load directly from F-list by normalized name and retain their canonical BBCode; the preview therefore depends on F-list's static image availability, with a bundled fallback when an image cannot load.

### 4. Establish stricter MVVM boundaries

`EditorEngineContext` is a useful command façade, but it still mixes view-model behavior with browser concerns such as file pickers. Move editor commands/state into an editor feature view model and put clipboard, file selection, persistence, and toast behavior behind small service interfaces. Views should bind to state and invoke commands without performing editor or browser orchestration.

### 5. Expand regression coverage

The serializer now has a unit-test foundation, but the custom Tiptap commands and React interactions are untested. Add tests for quote-selection splitting, collapse insertion/toggling, indent bounds, export failure states, keyboard shortcuts, routing, and a browser-level edit-to-copy smoke path.

### 6. Control bundle growth

The production JavaScript bundle is currently about 631 kB minified (197 kB gzip), which triggers Vite's chunk-size warning. Measure the Tiptap and extension footprint, lazy-load secondary routes, and establish a bundle budget before more editor features are added.

### 7. Remove or archive dead project trees

`frontend-legacy` and the placeholder `Backend` remain committed, and the repository root contains an empty `package-lock.json`. Confirm whether history alone is sufficient, then delete or archive these trees so contributors have one obvious application and one package boundary.

### 8. Add continuous integration

Run `npm ci` and `npm run check` on every pull request using a supported Node version. Add dependency update automation and retain the lockfile so builds remain reproducible.

### 9. Verify accessibility and responsive behavior

Perform keyboard and screen-reader checks for the toolbar, color dialog, collapse title input, draggable indent handles, focus management, and status messages. The current toast implementation is visual-only and should use an accessible live region.

### 10. Define deployment routing

The app uses client-side routing. Its deployment target must rewrite unknown routes such as `/faq` to `index.html`; otherwise direct navigation and refresh can return 404.
