---
commit: 32ec6d241895f6210adf31c4593da24d47c3fc3a
description: 'Codebase knowledge for module: packages/tailwind-helper/src'
files:
- packages/tailwind-helper/src/detect-format.js
- packages/tailwind-helper/src/extract-palette-css-v4.js
- packages/tailwind-helper/src/extract-palette-v3.js
- packages/tailwind-helper/src/palette.js
- packages/tailwind-helper/src/report.js
- packages/tailwind-helper/src/scan-usage.js
- packages/tailwind-helper/src/tailwind-default-color-names.js
- packages/tailwind-helper/src/types.js
tags:
- module
timestamp: '2026-07-13'
title: packages/tailwind-helper/src
type: Module
---

### What it does
The `tailwind-helper` package provides tools to extract color palettes from Tailwind CSS projects and scan source code for color utility usage. It supports both Tailwind v3 (config-based) and v4 (CSS `@theme` block-based) projects, enabling the generation of reports that identify unused palette colors and unknown class references.

### Public interface

*   **`detectTailwindFormat(root: string, opts?: { format?: 'v3'|'v4'|'auto' }): Promise<{format: 'v3'|'v4', configPath?: string}>`**
    Determines the Tailwind version and configuration method for a given project root.
*   **`extractPalette(root: string, opts?: { format?: 'v3'|'v4'|'auto', css?: string[] }): Promise<PaletteResult>`**
    Parses the project's color configuration and returns a `PaletteResult` containing custom and effective color definitions.
*   **`scanUsage(root: string, opts?: { patterns?: string[], ignore?: string[] }): Promise<UsageReport>`**
    Scans source files for Tailwind color utility classes using regex matching and returns a list of detected matches.
*   **`buildReport(root: string, opts?: { format?: 'v3'|'v4'|'auto', css?: string[], patterns?: string[], ignore?: string[] }): Promise<Report>`**
    Aggregates palette extraction and usage scanning into a comprehensive report identifying unused colors and unknown class usage.

### Key invariants

*   **Static Analysis Only:** The package does not execute the project's build pipeline or resolve dynamic class names (e.g., template literals like `bg-${color}-500`).
*   **v4 Override Model:** Tailwind v4 `@theme` declarations are treated as an `override` mode, as the CSS-based configuration replaces the default palette structure.
*   **Default Palette Awareness:** When in `extend` mode (v3), the `effectivePalette` must include the standard Tailwind default colors merged with the project's custom extensions.
*   **Config File Restrictions:** Tailwind v3 configuration files must be in `.js`, `.cjs`, or `.mjs` format; `.ts` files are explicitly unsupported to avoid complex transpilation requirements.

### Non-obvious decisions

*   **Runtime Execution of Config Files:** `extractPaletteV3` uses `import()` to execute the `tailwind.config.js` file directly. This is done to support complex configurations that use functions, spreads, or `require()` calls, which static parsing (like AST analysis) would fail to resolve accurately.
*   **Stubbing Theme Functions:** In `resolvePossibleFunction`, the config's theme function is called with a minimal `{ colors: {}, theme: () => ({}) }` stub. This is a defensive measure to extract color definitions without requiring the full Tailwind runtime environment or complex dependency injection.
*   **Regex-based Usage Scanning:** `scanUsage` uses a static regex (`CLASS_RE`) rather than a full CSS/HTML parser. This approach is chosen for performance and simplicity, accepting the trade-off that it may match text inside comments or strings, and will miss dynamically generated class names.
