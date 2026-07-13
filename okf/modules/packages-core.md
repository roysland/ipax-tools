---
commit: 32ec6d241895f6210adf31c4593da24d47c3fc3a
description: 'Codebase knowledge for module: packages/core'
files:
- packages/core/index.js
tags:
- module
timestamp: '2026-07-13'
title: packages/core
type: Module
---

### What it does
The `packages/core` module serves as the primary entry point for the IPAX calculation engine, exposing core logic for color math, ergonomics, and accessibility scoring. It aggregates specialized utilities from the `src/` directory to provide a unified API for external consumers like the CLI or web applications.

### Public interface

*   **`getIPAXscore(params)`**: Calculates the IPAX score based on provided input parameters.
*   **`hexToOklch(hex)`**: Converts a hexadecimal color string to the OKLCH color space.
*   **`relativeLuminanceWCAG(color)`**: Calculates the relative luminance of a color according to WCAG standards.
*   **`getY(color)`**: Retrieves the Y (luminance) component of a color.
*   **`calculateWcagContrast(colorA, colorB)`**: Computes the WCAG contrast ratio between two colors.
*   **`APCABridge`**: Namespace containing utilities for APCA (Advanced Perceptual Contrast Algorithm) integration.
*   **`Ergonomics`**: Namespace containing logic related to ergonomic design constraints.
*   **`Dictionary`**: Namespace containing shared terminology or configuration constants used across the monorepo.

### Key invariants
*   **Module Encapsulation**: All business logic must reside within `packages/core/src` and be exported through this index file; direct imports from `src/` by external packages are discouraged.
*   **Color Space Consistency**: Color math utilities assume inputs are compatible with the internal color representation used by the `ipax-color-math` module.

### Non-obvious decisions
*   **Namespace Exports**: The use of `export * as [Name]` for `APCABridge`, `Ergonomics`, and `Dictionary` forces consumers to access these utilities via a namespace object (e.g., `APCABridge.someFunction()`). This is chosen over named exports to prevent namespace pollution and to group related utilities logically, despite the slight increase in verbosity for the caller.
