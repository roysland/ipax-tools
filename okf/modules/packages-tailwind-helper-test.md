---
commit: 32ec6d241895f6210adf31c4593da24d47c3fc3a
description: 'Codebase knowledge for module: packages/tailwind-helper/test'
files:
- packages/tailwind-helper/test/detect-format.test.js
- packages/tailwind-helper/test/palette.test.js
- packages/tailwind-helper/test/report.test.js
- packages/tailwind-helper/test/scan-usage.test.js
tags:
- module
timestamp: '2026-07-13'
title: packages/tailwind-helper/test
type: Module
---

### What it does
The `tailwind-helper` package provides utilities to extract color palettes from Tailwind CSS configurations and scan project source code for usage of these colors. It supports both Tailwind v3 (via `tailwind.config.js`) and v4 (via CSS `@theme` declarations) to generate reports identifying unused palette colors and unknown utility classes.

### Public interface

*   **`detectTailwindFormat(rootPath, options)`**
    *   `rootPath`: string (path to project root)
    *   `options`: `{ format?: 'v3' | 'v4' }`
    *   Returns: `Promise<{ format: 'v3' | 'v4', configPath?: string }>`
*   **`extractPalette(rootPath, options)`**
    *   `rootPath`: string
    *   `options`: `{ format?: 'v3' | 'v4' }`
    *   Returns: `Promise<{ mode: 'override' | 'extend', customColors: Array, effectivePalette: Array, format: 'v3' | 'v4' }>`
*   **`scanUsage(rootPath, options)`**
    *   `rootPath`: string
    *   `options`: `{ patterns: string[] }`
    *   Returns: `Promise<{ matches: Array<{ utility: string, colorName: string, line: number }> }>`
*   **`buildReport(rootPath, options)`**
    *   `rootPath`: string
    *   `options`: `{ format?: 'v3' | 'v4', patterns: string[] }`
    *   Returns: `Promise<{ palette: Object, unusedPaletteColors: Array, unknownClassColors: Array, limitations: string[] }>`

### Key invariants
*   **Version separation**: The system must distinguish between v3 and v4 formats because v3 relies on JavaScript configuration files, while v4 relies on CSS-based theme declarations.
*   **Palette resolution**: In `extend` mode, the `effectivePalette` must always include the union of custom user-defined colors and the default Tailwind CSS color palette.
*   **Static analysis limits**: The scanner is restricted to static string matching; dynamically constructed class names (e.g., template literals) are intentionally excluded from detection.

### Non-obvious decisions
*   **Explicit `override` vs `extend` modes**: The system differentiates between these modes because `override` mode replaces the default Tailwind palette entirely, whereas `extend` mode merges with it. This distinction is critical for the `effectivePalette` calculation, as it determines whether the report should flag unused default colors or only unused custom colors.
*   **Manual fixture-based testing**: The test suite uses physical file system fixtures (`fixtures/v3-project`, etc.) rather than mocking the file system. This ensures that the logic correctly interacts with real Tailwind configuration parsing, which often involves complex `require()` chains or CSS parsing that is difficult to mock reliably.
