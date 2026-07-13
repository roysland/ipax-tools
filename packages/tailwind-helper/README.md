# @ipax/tailwind-helper

Extracts a Tailwind project's custom color palette and scans project source for
Tailwind color-utility class usage, then cross-references the two. This is
groundwork for the planned Tailwind build-time plugin/lint mentioned in the
repo root README — it does not yet depend on `@ipax/core` or wire into
`ipax-cli`.

## What it does

- **Palette extraction** — reads a project's custom color palette from either:
  - Tailwind v3: `theme.colors` / `theme.extend.colors` in `tailwind.config.{js,cjs,mjs}`
  - Tailwind v4: `--color-*` custom properties inside `@theme { ... }` blocks in CSS
- **Usage scanning** — statically scans source files for Tailwind color utility
  classes (`bg-`, `text-`, `border-`, `ring-`, etc.) and reports:
  - `unusedPaletteColors` — declared colors never referenced in source
  - `unknownClassColors` — classes referencing colors not in the declared/default palette

## Usage

Programmatic:

```js
import { buildReport } from '@ipax/tailwind-helper';

const report = await buildReport('/path/to/project', {
  format: 'auto',        // 'v3' | 'v4' | 'auto'
  patterns: ['src/**/*.{jsx,tsx,html}'],
});
```

CLI:

```bash
ipax-tailwind --root . --output pretty
ipax-tailwind --root ./app --format v4 --css src/theme.css --output json
```

## v1 limitations

- **Dynamically-constructed class names are not detected** — e.g.
  `` `bg-${color}-500` `` will be silently missed. Usage scanning is static
  whole-file regex matching only, not a JS/TS AST walk and not Tailwind's own
  compiler/content-scanning.
- **TypeScript Tailwind configs (`tailwind.config.ts`) are not supported** in
  v1 — convert to `.js`/`.cjs`/`.mjs`, or pass an explicit palette.
- **v3 config files are executed** (via dynamic `import()`) to reliably
  resolve `require()` calls, spreads of `tailwindcss/colors`, and
  function-form `theme.colors`. This runs the target project's own code —
  same trust model as running its `vite.config`/`eslint.config`. Do not point
  this at untrusted project directories.
- **v4 CSS discovery scans all `*.css` files** under the project root for
  `@theme` blocks by default; pass `css` explicitly for large projects to
  avoid scanning irrelevant stylesheets.
- Usage scanning matches raw file text, not just `class`/`className`
  attributes — this intentionally also catches `clsx()`/`cva()` usage, at the
  cost of rare false positives inside comments or unrelated strings.

## Deferred to v2

- AST-based usage scanning (precise `className`/`class` attribute extraction)
- Executing Tailwind's real compiler/content-globbing for ground-truth usage
- `@ipax/core` integration (scoring extracted color pairs)
- `ipax-cli` subcommand wiring (`ipax tailwind ...`)
