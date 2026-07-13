---
commit: 32ec6d241895f6210adf31c4593da24d47c3fc3a
description: 'Codebase knowledge for module: packages/tailwind-helper/test/fixtures/v3-project'
files:
- packages/tailwind-helper/test/fixtures/v3-project/tailwind.config.js
tags:
- module
timestamp: '2026-07-13'
title: packages/tailwind-helper/test/fixtures/v3-project
type: Module
---

### What it does
This file serves as a minimal Tailwind CSS v3 configuration fixture for the `tailwind-helper` test suite. It defines a custom color palette to verify that the package correctly extracts and scans color tokens from Tailwind configurations.

### Public interface
This module exports a standard CommonJS configuration object used by the Tailwind CSS engine:

*   `module.exports`: `{ content: string[], theme: { colors: Object } }`

### Key invariants
*   **Schema Compatibility**: The configuration must remain compatible with Tailwind CSS v3.x schema requirements to ensure the `tailwind-helper` package accurately reflects v3 behavior during testing.
*   **Fixture Isolation**: The `content` path is restricted to `./src/**/*.{js,jsx}` to ensure tests remain scoped to the fixture directory and do not attempt to scan the wider monorepo.

### Non-obvious decisions
*   **CommonJS over ESM**: Despite the modern monorepo structure, this fixture uses `module.exports` rather than `export default`. This is necessary because Tailwind CSS v3 configuration files are traditionally loaded via `require()` in Node.js environments, and using CommonJS ensures compatibility with the underlying Tailwind configuration loader without requiring additional transpilation steps in the test runner.
