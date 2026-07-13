### What this project is
This project is a specialized accessibility evaluation toolkit designed to calculate perceptual color contrast scores using the IPAX system. It enables developers and designers to audit color palettes, analyze contrast against multiple standards (WCAG, APCA, and ergonomic heuristics), and integrate these checks into Tailwind CSS-based workflows. The core value lies in its ability to bridge strict regulatory compliance with biological visual comfort modeling.

### Architecture
The system follows a layered architecture:
*   **Core Engine (`packages/core`)**: Acts as the source of truth, housing the mathematical models for color space conversion (sRGB to OKLCH) and accessibility scoring. It is consumed by all other modules.
*   **CLI Layer (`packages/cli`)**: Provides an interface for direct evaluation, grid searching, and stack composition. It uses a sub-process model to isolate the CLI environment from integration tools like the Model Context Protocol (MCP).
*   **Utility Layer (`packages/tailwind-helper`)**: Extends the core engine to perform static analysis on Tailwind CSS projects. It bridges the gap between raw CSS/JS configuration files and the scoring engine by extracting palettes and scanning source code for usage.
*   **Data Flow**: Inputs (hex/tokens) are parsed and normalized into OKLCH or sRGB-linearized luminance, processed by the core scoring engine, and then returned as structured results or reports.

### Module map
*   **`packages/cli`** → Provides command-line tools for IPAX scoring, palette analysis, and stack composition.
*   **`packages/core`** → Exposes the primary API for accessibility scoring, ergonomic modeling, and color math.
*   **`packages/core/src`** → Contains the internal implementation of APCA, WCAG, and ergonomic heuristic algorithms.
*   **`packages/core/test`** → Maintains regression tests and golden snapshots for scoring consistency.
*   **`packages/tailwind-helper`** → Orchestrates palette extraction and usage scanning for Tailwind CSS projects.
*   **`packages/tailwind-helper/src`** → Implements static analysis logic for Tailwind v3 and v4 configurations.
*   **`packages/tailwind-helper/test`** → Validates configuration parsing and usage scanning via file-system fixtures.
*   **`vendor/r.20260712`** → Houses the vendor-provided reference implementation for core accessibility logic.

### Getting started
1.  **Install dependencies**: Run `npm install` in the root directory.
2.  **Run the CLI**: Execute `node packages/cli/index.js --help` to view available sub-commands for contrast evaluation.
3.  **Analyze a project**: Use `node packages/tailwind-helper/bin.js --root <path-to-project>` to generate a color usage report for a Tailwind-based codebase.

### Key design decisions
*   **OKLCH for Ergonomics**: The system uses OKLCH specifically for ergonomic modeling (jitter, H-K effect) because its perceptual uniformity captures human visual phenomena that standard sRGB-based WCAG/APCA algorithms ignore.
*   **Manual CLI Parsing**: Both the CLI and Tailwind helper use manual flag parsing instead of external libraries to minimize dependency bloat and ensure precise control over token resolution and sub-process isolation.
*   **Compliance Clamping**: To ensure reliability, ergonomic "rewards" are strictly gated; they can improve a score within a tier but are mathematically prevented from promoting a color pair into a higher compliance grade.
*   **Static Analysis over Runtime**: The Tailwind helper relies on static regex scanning and direct execution of config files rather than full AST parsing or build-pipeline integration, prioritizing performance and simplicity over support for dynamic class names.
*   **Golden Snapshot Testing**: The core engine uses a manual, hardcoded golden suite rather than automated snapshot libraries to force explicit developer verification of any changes to the underlying accessibility logic.