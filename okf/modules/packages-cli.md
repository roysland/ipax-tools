---
commit: 32ec6d241895f6210adf31c4593da24d47c3fc3a
description: 'Codebase knowledge for module: packages/cli'
files:
- packages/cli/index.js
- packages/cli/ipax-find.js
- packages/cli/ipax-palette.js
- packages/cli/ipax-stack.js
- packages/cli/mcp-server.js
- packages/cli/parse-color.js
tags:
- module
timestamp: '2026-07-13'
title: packages/cli
type: Module
---

### What it does
The `packages/cli` module provides a command-line interface for evaluating perceptual color contrast using the IPAX scoring system. It supports direct pair evaluation, grid-based color searching, palette conflict analysis (including CVD simulation), and multi-layer stack composition.

### Public interface
The module exposes a primary entry point via `index.js` and specialized sub-command handlers:

*   **`index.js`**: The main CLI entry point.
    *   `usage(exitCode)`: Displays help and exits.
    *   `loadTokenFile(path)`: Parses JSON token files for `var()` resolution.
*   **`ipax-find.js`**:
    *   `runFind(argv)`: Executes a grid search for color pairs based on hue and constraints.
*   **`ipax-palette.js`**:
    *   `runPalette(argv)`: Analyzes a set of colors for ΔE conflicts, including optional CVD (deuteranopia/protanopia) simulation.
*   **`ipax-stack.js`**:
    *   `runStack(argv)`: Calculates contrast scores for foreground colors composited over multiple layers (canvas/surface).
*   **`mcp-server.js`**:
    *   `runCLI(args)`: A wrapper that executes the CLI as a sub-process for integration with Model Context Protocol clients.

### Key invariants
*   **Opaque Canvas**: In `ipax-stack.js`, the `--canvas` layer is treated as the absolute base and must be opaque to ensure valid perceptual scoring.
*   **Token Resolution**: All `var()` syntax must be resolved via `--token-file` before sub-command logic is executed to ensure consistent color input across all modules.
*   **Exit Codes**: 0 (success), 1 (general error), 2 (parse error), 3 (no results).
*   **Color Parsing**: All inputs are ultimately resolved to hex or Oklch values via `parse-color.js` before being passed to `@ipax/core`.

### Non-obvious decisions
*   **Manual Flag Parsing**: The CLI uses `splice` on `process.argv` to manually consume flags and their values rather than using a standard library like `yargs` or `commander`. This likely avoids dependency bloat and allows for the specific "pre-processing" requirement of resolving `var()` tokens before the sub-commands receive the arguments.
*   **Grid Search `1e-9` Epsilon**: In `ipax-find.js`, the `arange` function uses `1e-9` to handle floating-point precision errors when iterating through lightness and chroma steps.
*   **CVD Matrix Hardcoding**: The `ipax-palette.js` module implements its own linear algebra for CVD simulation (using Smith & Pokorny cone fundamentals) rather than relying on an external color-science library, likely to keep the CLI tool lightweight and dependency-free.
*   **Sub-process Execution for MCP**: The `mcp-server.js` uses `spawnSync` to call the CLI as a separate process rather than importing the logic directly. This ensures that the MCP server environment remains isolated and that the CLI's `process.exit` calls do not terminate the server itself.
