# ipax-tools

> **Based on the work of Santiago Bustelo** — [bustelo.com.ar](https://www.bustelo.com.ar/) · [icograma.com](https://icograma.com/index.php)
>
> The IPAX scoring engine, ergonomics model, and perceptual dictionary are derived from his IPAX 2 system, used with his permission under CC-BY attribution terms (granted 2026-06-10). See [NOTICE](./NOTICE) for full attribution.
>
> The APCA contrast algorithm (`apca-w3.js`) is copyright © 2019-2022 Andrew Somers / Myndex Research, used under the W3 license for web content accessibility.

A toolkit for scoring color pairs on accessibility and visual comfort — going beyond standard contrast ratios by factoring in how human vision actually experiences color, so a pair that passes the legal accessibility threshold can still be flagged if it causes eye strain.

## Structure

This is an npm workspaces monorepo:

| Package | What it is |
|---|---|
| [`packages/core`](./packages/core) | `@ipax/core` — the canonical scoring engine. Everything below depends on this; none of them carry their own copy of the scoring logic. |
| [`cli`](./cli) | `ipax-cli` — command-line tool and MCP server for scoring color pairs, searching palettes, and compositing layered UI stacks. |
| `src`, `public` | The browser sandbox app (Vite) for interactively exploring scores. |
| [`vendor`](./vendor) | Untouched snapshots of upstream IPAX engine drops from Santiago, kept for diffing when porting updates — see `packages/core/README.md` for that workflow. |

Planned: a Tailwind build-time plugin/lint, and possibly a Figma plugin and Chrome devtools extension, all built on `@ipax/core`.

## License

See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
