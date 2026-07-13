---
commit: 32ec6d241895f6210adf31c4593da24d47c3fc3a
description: 'Codebase knowledge for module: packages/core/src'
files:
- packages/core/src/apca-w3.d.ts
- packages/core/src/apca-w3.js
- packages/core/src/ipax-apca-bridge.js
- packages/core/src/ipax-color-math.js
- packages/core/src/ipax-core.js
- packages/core/src/ipax-dictionary.js
- packages/core/src/ipax-ergonomics.js
- packages/core/src/types.js
tags:
- module
timestamp: '2026-07-13'
title: packages/core/src
type: Module
---

### What it does
The `packages/core` module provides a multi-standard accessibility scoring engine that combines WCAG 2.x contrast ratios, APCA (Advanced Perceptual Contrast Algorithm) Lc values, and custom ergonomic penalties. It evaluates color pairs for visual comfort and compliance, applying perceptual heuristics to adjust scores based on human visual system limitations like chromostereopsis and S-cone strain.

### Public interface
- `getIPAXscore(textHex: string, bgHex: string, forceContext?: ForceContext, fontWt?: number, mode?: ScoringMode): IpaxScoreResult`
  - The primary entry point for calculating accessibility scores.
- `hexToOklch(hex: string): Oklch | null`
  - Converts sRGB hex to the OKLCh color space for ergonomic analysis.
- `relativeLuminanceWCAG(hex: string): number`
  - Calculates WCAG 2.x relative luminance (0–1).
- `calculateWcagContrast(txtY: number, bgY: number): number`
  - Computes the standard WCAG contrast ratio (1–21).

### Key invariants
- **Compliance Ceiling**: Ergonomic rewards can increase a score within a compliance tier (e.g., from 2.0 to 2.9), but they can never push a score into the next tier (e.g., 3.0).
- **Luminance Pipelines**: WCAG contrast, APCA contrast, and IPAX ergonomic modeling use distinct, non-interchangeable luminance calculations. WCAG uses sRGB-linearized luminance, APCA uses its own `sRGBtoY` function, and IPAX ergonomics uses OKLCh-derived luminance.
- **APCA Magic Numbers**: The APCA font lookup table uses `999` (prohibited) and `777` (spot-text only) as sentinel values to indicate that a contrast level is insufficient for standard body text.

### Non-obvious decisions
- **OKLCh for Ergonomics**: While WCAG and APCA require specific, standardized luminance pipelines, the module uses OKLCh for ergonomic modeling. This is because OKLCh provides a perceptually uniform space that better models human visual phenomena (like hue induction and jitter) that are not captured by the older, non-uniform sRGB-based formulas.
- **Scoring Gating**: The `_getDecimal` and `_getApcaData` functions implement a "reward clamp." This prevents high-chroma colors from artificially inflating a score to a higher compliance grade, ensuring that ergonomic "bonuses" do not override the strict requirements of the underlying accessibility standards.
- **Graphical Mode**: The `graphical` mode (an IPAX-specific extension) bypasses font-size calculations and applies a 3:1 non-text contrast floor (SC 1.4.11). It also applies a 1.5x multiplier to edge-sensitive ergonomic penalties (like chromostereopsis) because thin strokes, such as borders and icons, are more susceptible to spatial-frequency degradation than large text blocks.
