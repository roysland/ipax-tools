# ipax-cli

> **Based on the work of Santiago Bustelo** — [bustelo.com.ar](https://www.bustelo.com.ar/) · [icograma.com](https://icograma.com/index.php)
>
> The IPAX scoring engine, ergonomics model, and perceptual dictionary are derived from his IPAX 2 system, used with his permission under CC-BY attribution terms (granted 2026-06-10). See [NOTICE](./NOTICE) for full attribution.
>
> The APCA contrast algorithm (`apca-w3.js`) is copyright © 2019-2022 Andrew Somers / Myndex Research, used under the W3 license for web content accessibility.

A command-line tool that scores color pairs for accessibility and visual comfort. It goes beyond standard contrast ratios by factoring in how human vision actually experiences color — so a pair that passes the legal accessibility threshold can still score poorly if it causes eye strain.

## What the score means

The **IPAX score** runs from 0 to 5:

| Score | Meaning |
|-------|---------|
| 0 | Fails accessibility. Do not use. |
| 1 | Passes for large text only (≥ 24 px). |
| 2 | Passes AA — acceptable for normal body text. |
| 3 | Solid AA. Good for most UI contexts. |
| 4 | Approaching AAA. Comfortable for extended reading. |
| 5 | AAA with high perceptual comfort. Best possible. |

A score like `X(1)` means the pair passes WCAG level 1 (large text), but ergonomic penalties dragged the score below the compliance floor. The parenthesis only ever appears when the score is *lower* than the WCAG grade — ergonomics can never push the number outside the parentheses into the next legal grade.

## Installation

```bash
npm link   # or add to your PATH
```

## The four commands

### 1. Evaluate a color pair

```bash
ipax <background> <text>
```

```bash
ipax "#f0f0f0" "#111111" --pretty
```

```
IPAX Score:  5  (5)
Base Size:   16px
APCA Lc:     96.4  (dark-on-light)
WCAG:        16.57  (AAA)

Penalties:   No active penalties
Rewards:     Chromatic Relief: +0.20
```

The default output is JSON (pipe-friendly). Add `--pretty` for human-readable output.

**Common options:**

| Flag | What it does |
|------|-------------|
| `--pretty` | Human-readable output |
| `--context dark\|light` | Override the automatic dark/light detection |
| `--weight 700` | Font weight — affects minimum safe size recommendation |
| `--mode graphical` | Evaluate as a UI element (border, icon) instead of text — uses the 3:1 WCAG threshold |
| `--flatten-over white` | Composite a semi-transparent `rgba()` color over a background before evaluating |

**Color formats accepted:**

```
#fff  #ffffff  rgb(255,0,0)  rgba(255,0,0,0.5)
oklch(0.6 0.2 30)  oklab(0.6 0.1 -0.05)
color-mix(in oklch, red 60%, white)
white  black  cornflowerblue  (any CSS named color)
var(token-name)  (with --token-file)
```

---

### 2. Find valid color pairs at a hue

```bash
ipax find <hue-angle>
```

Give it a hue (0–360°, same as the H value in `oklch()`), and it searches the OKLCh color space to find pairs that meet your target score — all in the same hue family.

```bash
ipax find 25 --target 3 --output css
```

```css
/* ipax find  H:25  target:3 */
/* Baseline  IPAX 5  AAA  APCA Gold  dark-on-light */
:root { --bg: oklch(0.95 0 25); --text: oklch(0.05 0 25); }

@media (prefers-contrast: more) { :root { ... } }
@media (prefers-contrast: less) { :root { ... } }
@media (prefers-color-scheme: dark) { :root { ... } }
```

This is the command to reach for when you know "I need a warm-red color scheme" and want the tool to hand you ready-to-use CSS variables — including variants for system preferences.

**Key options:**

| Flag | Default | What it does |
|------|---------|-------------|
| `--target 4` | 3 | Minimum acceptable IPAX score |
| `--count 5` | 3 | How many results to return |
| `--variants prefers-contrast,prefers-color-scheme` | — | Generate `@media` query variants |
| `--output css\|json\|pretty` | json | Output format |
| `--base oklch(0.6 0.25 25)` | — | Anchor color for `color-mix()` hints |

---

### 3. Check a full palette for conflicts

```bash
ipax palette <color1> <color2> [color3 ...]
```

Checks every pair in your palette to see if they're distinguishable — both for normal vision and for color-blind users.

```bash
ipax palette "#e74c3c" "#3498db" "#2ecc71" "#f39c12" --output pretty
```

```
Palette: 4 colors  |  6 pairs  |  ΔE threshold < 25

Normal Vision  [✗ 2 conflicts]
     #E74C3C  ↔  #3498DB  ΔE 31.6
  ✗  #3498DB  ↔  #2ECC71  ΔE 24.5  ← CONFLICT
  ...

Deuteranopia  [✗ 5 conflicts]
  ✗  #E74C3C  ↔  #2ECC71  ΔE 11.3  ← CONFLICT
  ...
```

A ΔE below 25 means two colors can be confused for each other. The CVD simulation (deuteranopia and protanopia) shows what users with red-green color blindness actually see.

**Options:**

| Flag | Default | What it does |
|------|---------|-------------|
| `--threshold 20` | 25 | ΔE value below which a pair is flagged |
| `--no-cvd` | — | Skip color-blindness simulation |
| `--output json\|pretty` | json | Output format |

---

### 4. Validate a layer stack

```bash
ipax stack --canvas <color> --surface <color> --fg <color>
```

Real UIs have layers: a page background, a card on top, text on the card. This command composites your layers together (handling `rgba()` transparency) and scores each pair.

```bash
ipax stack \
  --canvas white \
  --surface "rgba(0,0,0,0.05)" \
  --fg "#333" \
  --surface-hover "rgba(0,0,0,0.15)" \
  --output pretty
```

```
Layer Stack (rest):
  Canvas:   white  →  #FFFFFF
  Surface:  rgba(0,0,0,0.05)  →  #F2F2F2  (composited)
  Fg:       #333  →  #333333

Scores (rest):
  fg / surface:  IPAX 5  WCAG 12.6  (AAA)
  fg / canvas:   IPAX 4  WCAG 14.1  (AAA)

Layer Stack (hover/focus):
  Surface:  rgba(0,0,0,0.15)  →  #D9D9D9  (composited)

Scores (hover/focus):
  fg / surface:  IPAX 4.3  WCAG 10.4  (Δ -0.7)  ← DEGRADED
```

A score drop of more than 0.4 between the rest and hover state is flagged as **DEGRADED** — meaning the interaction state has meaningfully worse accessibility than the resting state.

---

## Design token support

Any command accepts `var(token-name)` color values when paired with `--token-file`:

```bash
# tokens.json
{ "bg": "#f5f0e8", "text": "#2d1a08", "card": "rgba(0,0,0,0.04)" }

ipax var(bg) var(text) --token-file tokens.json
ipax stack --canvas var(bg) --surface var(card) --fg var(text) --token-file tokens.json
ipax palette var(bg) var(text) var(card) --token-file tokens.json
```

---

## Graphical / non-text mode

For UI elements that aren't text — focus rings, borders, icons, chart segments — add `--mode graphical`:

```bash
ipax "#005fcc" white --mode graphical --pretty
```

This switches the compliance threshold from 4.5:1 (text) to 3:1 (WCAG 1.4.11 non-text content), and amplifies the penalties for edge-degrading effects like chromostereopsis and jitter — which matter more for thin strokes than for body text.

---

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error (missing args, bad flag value) |
| 2 | Color parse error |
| 3 | No results found (find command) |
