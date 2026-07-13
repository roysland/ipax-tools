---
commit: 32ec6d241895f6210adf31c4593da24d47c3fc3a
description: 'Codebase knowledge for module: packages/core/test'
files:
- packages/core/test/golden.test.js
tags:
- module
timestamp: '2026-07-13'
title: packages/core/test
type: Module
---

### What it does
This module provides a regression testing suite for the `getIPAXscore` function, ensuring that core accessibility calculations remain consistent across vendor library updates. It uses a golden snapshot pattern to validate that specific input color and style combinations produce expected scoring outputs, guarding against unintended behavior changes.

### Public interface
*   **`getIPAXscore(foreground: string, background: string, ...args: any[]): { score: number, string: string, wcag: { score: number }, apca: { score: number } }`**
    *   Calculates the accessibility score based on color contrast and style parameters. Imported from `packages/core/index.js`.

### Key invariants
*   **Tier Integrity**: For scores below WCAG tier 3, the ergonomic reward component must not cause the final score to round up into the next WCAG tier. The score must remain within the range `[complianceLevel, complianceLevel + 0.9]`.
*   **Vendor Stability**: Any change in the output of `getIPAXscore` must be explicitly verified against the `vendor/r.20260712` diffs. The test suite acts as a gatekeeper to ensure that vendor-ported logic does not deviate from documented expectations.

### Non-obvious decisions
*   **Floating point epsilon in assertions**: The regression guard uses `1e-9` when comparing the score against the compliance level. This is a defensive measure against IEEE 754 floating-point precision errors that could otherwise cause false-negative test failures during boundary comparisons.
*   **Manual Golden Suite**: Rather than using a snapshot testing library (like Jest snapshots), the suite uses a hardcoded `CASES` array. This ensures that the expected values are explicitly documented in the source code, forcing developers to manually acknowledge and update the expected values when vendor logic changes.
