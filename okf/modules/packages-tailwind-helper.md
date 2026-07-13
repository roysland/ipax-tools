---
commit: 32ec6d241895f6210adf31c4593da24d47c3fc3a
description: 'Codebase knowledge for module: packages/tailwind-helper'
files:
- packages/tailwind-helper/bin.js
- packages/tailwind-helper/index.js
tags:
- module
timestamp: '2026-07-13'
title: packages/tailwind-helper
type: Module
---

### What it does
The `tailwind-helper` package provides tools to analyze Tailwind CSS configurations and scan project source code for color usage. It generates reports identifying unused palette colors and unknown utility classes, supporting both Tailwind v3 (config-based) and v4 (CSS-based) architectures.

### Public interface
*   **`detectTailwindFormat(root: string): Promise<'v3' | 'v4' | 'unknown'>`**
    Analyzes the project structure at `root` to determine the Tailwind version.
*   **`extractPalette(root: string, options: { format?: 'v3' | 'v4' | 'auto', css?: string[] }): Promise<Palette>`**
    Parses the Tailwind configuration or CSS theme variables to extract the defined color palette.
*   **`scanUsage(root: string, patterns?: string[]): Promise<UsageReport>`**
    Scans files matching the provided glob patterns (or defaults) to identify Tailwind utility classes in use.
*   **`buildReport(root: string, options: { format?: 'v3' | 'v4' | 'auto', css?: string[], patterns?: string[] }): Promise<Report>`**
    Orchestrates the detection, extraction, and scanning processes to produce a comprehensive analysis report.

### Key invariants
*   **Path Resolution**: All file paths provided via CLI flags or options are resolved relative to the `root` directory before processing.
*   **Report Structure**: The output of `buildReport` must adhere to the `Report` type definition, ensuring consistent data structures for both JSON and pretty-printed CLI output.
*   **CLI Exit Codes**: A successful execution returns exit code 0, while errors (including invalid configurations or runtime failures) result in exit code 1.

### Non-obvious decisions
*   **Manual Flag Parsing**: The `bin.js` file implements a custom `parseFlags` function rather than using a standard library like `yargs` or `commander`. This likely minimizes dependency bloat for a specialized utility package, keeping the binary lightweight and fast to execute.
*   **Explicit CSS Pathing for v4**: The CLI requires an explicit `--css` flag for v4 scanning. This is necessary because Tailwind v4 moves theme configuration into CSS files, which lack a standard, predictable location compared to the traditional `tailwind.config.js` file used in v3.
