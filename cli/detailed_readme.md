# ipax-cli — Technical Reference

## Architecture overview

The CLI is a pure-Node.js ESM tool. All commands share a single color parsing pipeline and scoring engine. There are no runtime dependencies beyond the bundled `apca-w3.js`.

```
index.js          ← CLI entry, arg parsing, token resolution, subcommand routing
├── ipax-core.js         ← IPAX scoring engine (getIPAXscore)
│   ├── ipax-color-math.js    ← OKLCh conversions, WCAG Y, contrast ratio
│   ├── ipax-apca-bridge.js   ← APCA Lc, font sizing lookup
│   ├── ipax-ergonomics.js    ← Biological penalties and rewards
│   └── ipax-dictionary.js    ← Penalty/reward slug labels
├── parse-color.js       ← Universal color parser (hex, rgb, oklch, color-mix, named)
├── ipax-find.js         ← OKLCh grid search
├── ipax-palette.js      ← ΔE matrix, Machado CVD simulation
└── ipax-stack.js        ← Porter-Duff layer compositor
```

---

## The IPAX scoring model

### Step 1 — Compliance ceiling

Two separate compliance grades are computed:

**WCAG** (relative luminance, Rec.709):
```
Y = 0.2126·Rlin + 0.7152·Glin + 0.0722·Blin
ratio = (Ymax + 0.05) / (Ymin + 0.05)
```

| Ratio | Score | Grade |
|-------|-------|-------|
| ≥ 7.0 | 3 | AAA |
| ≥ 4.5 | 2 | AA |
| ≥ 3.0 | 1 | AA (Large text) |
| < 3.0 | 0 | Fail |

In `--mode graphical` the grades shift: 3:1 = Pass (SC 1.4.11), 4.5:1 = AA, 7:1 = AAA.

**APCA** (Accessible Perceptual Contrast Algorithm, SAPC 0.0.98G-4g):

APCA uses a perceptual power-curve model and is sign-sensitive (positive Lc = dark text on light bg, negative = light on dark). The magnitude |Lc| determines the grade:

| |Lc| | Score | Grade |
|------|-------|-------|
| ≥ 90 | 5 | Gold |
| ≥ 75 | 4 | Silver |
| ≥ 60 | 3 | Bronze |
| ≥ 45 | 2 | Standard |
| ≥ 30 | 1 | Large text only |
| < 30 | 0 | Fail |

The **compliance ceiling** is `min(wcag.score, apca.score)`. A pair cannot score higher than both standards allow.

### Step 2 — Decimal interpolation

Within each compliance band, a continuous decimal is computed from both metrics and the minimum is taken. This gives smooth 0.0–0.9 increments within each integer band rather than hard steps:

```
wcagDecimal = (ratio - bandLo) / (bandHi - bandLo) × 0.9
apcaDecimal = (|Lc| - bandLo) / (bandHi - bandLo) × 0.9
rawScore = band + min(wcagDecimal, apcaDecimal)
```

### Step 3 — Ergonomic penalties

Penalties are subtracted from rawScore. They model physical vision phenomena that make colors uncomfortable even when the contrast ratio is technically sufficient.

**Isoluminant jitter** — Chromatic edges appear to vibrate when both colors have similar lightness but different hues. Triggered when `ΔL < 0.15` (OKLCh) OR `ΔY < 0.08` (physical luminance) and both colors have chroma > 0.05:

```
isoActivation = max(0, 1 - (ΔL / 0.15))
chromaFactor  = min(1.0, (C_txt + C_bg) × 2.0)
penalty       = min(1.5, 1.5 × isoActivation × chromaFactor)
```

The dual condition (OKLCh L and physical Y) catches cases where the Helmholtz-Kohlrausch effect makes a chromatic color appear lighter than its physical luminance suggests.

**Chromostereopsis** — Binocular depth illusion caused by longitudinal chromatic aberration. Red and blue stimulate different focal planes on the retina, making high-chroma hue-opponent pairs appear to float at different depths. Activated when both colors have C > 0.12 and hue difference > 30°:

```
hueActivation = min(1, (|ΔH| - 30) / 60)
penalty       = min(2.0, C_txt × C_bg × 25 × hueActivation)
```

**S-cone (foveal short-wavelength) strain** — High-chroma blue (H ≈ 260°) at low lightness is processed primarily by the S-cone system, which has low spatial acuity and fatigues quickly. Penalizes dark, saturated blues used as text:

```
blueActivation = max(0, 1 - |H - 260| / 30)
penalty        = min(1.0, C × 3.0) × blueActivation
```

**Simultaneous contrast** — A neutral or low-chroma foreground takes on a perceived hue shift when placed against a chromatic background (hue induction). Most pronounced when background hue opposes foreground at ≈ 120° and background chroma is high:

```
bgStrength         = clamp((C_bg - 0.08) / 0.06)
txtSusceptibility  = clamp(1 - C_txt / 0.06)
opponentActivation = exp(-(|ΔH| - 120)² / (2 × 50²))
penalty            = min(1.0, bgStrength × txtSusceptibility × opponentActivation)
```

The three chroma-based penalties are capped collectively at 2.0 before being applied.

**Halation** (dark mode only) — Light text on a very dark background causes the bright letters to appear to bloom and smear, reducing apparent sharpness. Activated in dark contexts when bg.L < 0.25 and text.L > 0.75:

```
penalty = 0.8 × (ΔL)^2.5 × bgActivation × txtActivation
```

**Mydriasis** (dark mode only) — Extremely dark backgrounds (bg.L < 0.04) cause the pupil to dilate maximally, increasing chromatic aberration across the entire scene:

```
penalty = 0.4 × (1 - bg.L / 0.04)
```

**Macular glare** (light mode only) — Near-white backgrounds (bg.L > 0.96) scatter light across the macula, reducing local contrast sensitivity. Maximum penalty of 1.0 at bg.L = 1.0:

```
penalty = min(1.0, (bg.L - 0.96) / 0.04)
```

**Helmholtz-Kohlrausch effect** — Highly saturated red and blue hues appear perceptually brighter than their luminance suggests. This can cause the APCA model to overestimate contrast for highly chromatic colors when |Lc| ≥ 75. Applied as a penalty to prevent over-rewarding these pairs:

```
hkStrength(color) = exp(-H²/2500) or exp(-(H-270)²/2500)  [red or blue proximity]
                    × min(1, (C - 0.08) / 0.20) × 0.5
penalty = max(hkStrength(txt), hkStrength(bg))
```

### Step 4 — Ergonomic rewards

Rewards are added after penalties, but only if the raw score is already ≥ 2.0 (biologically gated — rewards don't rescue failing pairs):

```
biologicalActivation = smoothstep(2.0, 3.5, biologicalScore)
penaltyActivation    = max(0, 1 - totalPenalty / 0.8)
rewardGating         = biologicalActivation × penaltyActivation
```

**Paper tone** — A slightly warm off-white background (L ≈ 0.915) mimics the spectral properties of high-quality paper, which research associates with reduced eye fatigue for long reading sessions. Gaussian reward centered at L = 0.915, σ = 0.027, max = 0.2.

**Chromatic relief** — A near-neutral background (C < 0.03) reduces chromatic adaptation demands, since the visual system doesn't need to constantly re-adapt to a chromatic surround. Max reward 0.2.

**Achromatic tint contrast** — Neutral text (C < 0.02) on a subtle tinted background (0.03 < C_bg < 0.12) — the "Swiss design" idiom — is rewarded because the background provides subtle visual identity without imposing the accommodation costs of high chroma. Max reward 0.15.

All rewards combined are capped at 0.5 and gated by the biological activation function.

### Graphical mode adjustments

`--mode graphical` modifies the scoring for non-text UI elements (borders, focus rings, icons, chart segments):

1. WCAG threshold shifts: 3:1 = Pass (SC 1.4.11 non-text content)
2. Font sizing is marked N/A (no font size recommendation for graphical elements)
3. Edge-degradation penalties are amplified ×1.5: jitter, chromostereopsis, S-cone strain, simultaneous contrast. Thin strokes suffer more from all four because the spatial frequency of the edge engages different retinal processing than body text.

---

## Color parsing pipeline

`parseToHex(str)` resolves any color expression to an opaque `#RRGGBB` hex string.

### Supported input formats

| Format | Example |
|--------|---------|
| 3-digit hex | `#f0c` |
| 6-digit hex | `#ff00cc` |
| `rgb()` | `rgb(255, 0, 204)` |
| `rgba()` with alpha 1 | `rgba(255, 0, 204, 1.0)` |
| `rgba()` with alpha < 1 | Throws — use `--flatten-over` |
| `oklab()` | `oklab(0.6 0.1 -0.05)` |
| `oklch()` | `oklch(0.6 0.2 300)` |
| `color-mix()` | See below |
| CSS named color | `white`, `cornflowerblue`, `rebeccapurple` (148 colors) |

### `color-mix()` parsing

The parser handles the full CSS Color 5 `color-mix()` syntax:

```css
color-mix(in oklch, red 60%, white)
color-mix(in oklch, color-mix(in srgb, blue 50%, green), white 30%)
```

Supported color spaces: `oklch`, `oklab`, `srgb`, `srgb-linear`.

Hue interpolation for `oklch` uses the shorter arc (≤ 180°). Powerless hue handling: when a color has C < 0.001 (achromatic), its hue is treated as undefined and the other color's hue is used instead. Weight normalization follows the CSS spec — if only one weight is given, the other is `100% - w1`. If neither is given, both are 50%.

### Alpha compositing (`--flatten-over`)

Semi-transparent `rgba()` colors can be composited over a known background before evaluation using Porter-Duff Over:

```
Cout = Csrc × α + Cdst × (1 − α)
```

```bash
ipax "rgba(204, 34, 0, 0.6)" white --flatten-over white
```

The `--flatten-over` value is itself parsed through `parseToHex`, so any supported color format works.

### OKLCh gamut mapping

When generating colors in OKLCh space (`find` command, `resolveOklch`), the `clip-chroma` policy (default) performs a binary search to find the maximum in-gamut chroma at a given L and H:

```
lo = 0, hi = C
for 20 iterations:
    mid = (lo + hi) / 2
    if isInGamut(L, mid, H): lo = mid
    else: hi = mid
mappedC = lo
```

`clip-srgb` instead clamps each RGB channel to [0, 1], which preserves hue less faithfully but is faster.

---

## `ipax find` — OKLCh grid search

Searches the OKLCh color space at a fixed hue angle for pairs that meet a minimum IPAX score. The search is monochromatic (all results share the same H), which makes the output directly usable as CSS custom properties for a single-hue design system.

### Grid structure

The bg and text lightness ranges are searched independently to support dark/light pair discovery:

```
bgLVals  = arange(loL,  hiL,  stepL)     # background lightness
txtLVals = arange(txtLoL, txtHiL, stepL) # text lightness
cVals    = arange(loC, hiC, stepC)       # chroma (same range for both)
```

Pairs where `|bgL - txtL| < 0.25` are skipped — insufficient lightness separation.

Default ranges: bg L [0.05, 0.95], text L [0.05, 0.95], C [0.00, 0.40]. Step 0.05 for L, 0.02 for C. Default search space: ~90,000 pair evaluations, typically completes in < 1 second.

`--max-calls` caps evaluations for CI environments where runtime is bounded.

### Variant generation

`--variants prefers-contrast,prefers-color-scheme` generates additional pairs for system preference media queries:

| Variant | Strategy |
|---------|----------|
| `prefers-contrast: more` | Raises minScore by 1 |
| `prefers-contrast: less` | Lowers minScore by 1.5, caps at baseline − 0.1, sorts by lowest penalty (comfort-optimized) |
| `prefers-color-scheme: dark` | Restricts bg L to [0.05, 0.40], text L to [0.60, 0.95], forces dark context |
| Dark + more contrast | Combines both above adjustments |

The CSS output wraps each variant in its corresponding `@media` rule.

### `color-mix()` hints

When `--base` is provided, the output includes a `colorMix` hint for each result showing how to approximate the generated background from the base color using CSS `color-mix()`. The tint percentage is snapped to the nearest 5% for clean CSS:

```js
// bg is lighter than base:
color-mix(in oklch, var(--brand) 75%, white)
// bg is darker than base:
color-mix(in oklch, var(--brand) 80%, black)
```

---

## `ipax palette` — Distinctiveness sweeper

### ΔE_oklch formula

The perceptual distance between two OKLCh colors:

```
ΔL  = (L₂ − L₁) × 100
ΔC  = (C₂ − C₁) × 100
Δh  = shorter arc of (H₂ − H₁), normalized to (−180°, 180°]
ΔH  = 2 × √(C₁ × C₂) × 100 × sin(Δh/2)   [chord distance]

ΔE  = √(ΔL² + ΔC² + ΔH²)
```

Scaling by 100 puts ΔE on a comparable scale to CIELAB ΔE — values below 25 represent colors that are perceptually similar enough to risk confusion in data visualization or categorical UI contexts.

The chord-distance formula for ΔH uses the geometric mean of both chromas as a weight. When either color is achromatic (C ≈ 0), the hue term vanishes, which is physically correct — achromatic colors have no defined hue, so hue difference is meaningless.

### Machado CVD simulation

Color vision deficiency simulation uses the Machado et al. 2009 physiological model at severity = 1.0 (full dichromacy).

**Pipeline:**

```
sRGB (gamma) → sRGB linear → LMS → dichromatic projection → LMS → sRGB linear → sRGB (gamma) → clamp
```

**Matrices:**

sRGB linear → LMS (Smith & Pokorny cone fundamentals):
```
M_RGB_LMS = [[17.8824,    43.5161,   4.11935  ],
             [ 3.45565,   27.1554,   3.86714  ],
             [ 0.0299566,  0.184309,  1.46709 ]]
```

LMS → sRGB linear (inverse):
```
M_LMS_RGB = [[ 0.0809444479,  -0.130504409,    0.116721066  ],
             [-0.0102485335,   0.0540193266,  -0.113614708  ],
             [-0.000365296938, -0.00412161469,  0.693511405 ]]
```

Protanopia projection in LMS (L-cone absent — red/green confusion):
```
[0.0,      2.02344, -2.52581]   ← L' estimated from M and S
[0.0,      1.0,      0.0   ]   ← M unchanged
[0.0,      0.0,      1.0   ]   ← S unchanged
```

Deuteranopia projection in LMS (M-cone absent — red/green confusion):
```
[1.0,      0.0,     0.0    ]   ← L unchanged
[0.494207, 0.0,     1.24827]   ← M' estimated from L and S
[0.0,      0.0,     1.0    ]   ← S unchanged
```

**Verification:** White (L=65.52, M=34.48, S=1.68 in LMS) maps back to white after both projections. Red → deuteranopia ≈ `#939300` (yellow-olive), which matches the known phenomenology of how deuteranopes perceive red.

ΔE is computed in OKLCh space between the CVD-simulated hex values. A conflict means two palette colors collapse to near-identical percepts for that CVD type.

**Simulated CVD types:**
- **Protanopia** — L-cone absent (~1% of males). Poor red/long-wavelength sensitivity.
- **Deuteranopia** — M-cone absent (~1% of males). Poor green/medium-wavelength sensitivity.

Tritanopia (S-cone) is not implemented — it is very rare (< 0.01%) and blue stimuli are handled via the S-cone strain penalty in the ergonomics model.

---

## `ipax stack` — Layer compositor

### Compositing model

Layers are composited bottom-up using Porter-Duff Over:

```
C_out = C_fg × α + C_bg × (1 − α)
```

`flattenOver(colorStr, bgHex)` handles the compositing. It parses the color string's alpha channel, applies the formula in linear-light sRGB, then re-encodes to 8-bit hex. If the foreground is fully opaque (α = 1), it returns `null` and the original hex is used.

### Layer model

```
Canvas (base — must be opaque)
└── Surface (composited over canvas)
    └── Fg (composited over effective surface)
```

The two scored pairs are:

- **fg / surface** — What the user directly reads. The surface is the immediate background.
- **fg / canvas** — Whether the text still passes if the surface disappears (e.g., on high-contrast mode where background overlays are stripped).

### Hover/focus state validation

When `--surface-hover` or `--fg-hover` is provided, each hover layer is re-composited over the canvas and re-scored. The fg is re-composited over the hover surface even if fg itself hasn't changed — because a different surface color changes the effective fg luminance via compositing.

A `scoreDelta < −0.4` triggers `degraded: true`. This threshold catches meaningful regressions (half a band or more) while ignoring floating-point noise from minor compositing differences.

---

## Design token system (`--token-file`)

Tokens are resolved as a preprocessing step in `index.js`, before any subcommand routing. This means they work identically across all four commands.

**File format:** Flat JSON object, keys are token names, values are any color expression `parseToHex` can handle:

```json
{
  "bg-primary":    "#f5f0e8",
  "text-primary":  "#2d1a08",
  "brand":         "oklch(0.6 0.25 30)",
  "surface":       "rgba(0, 0, 0, 0.04)",
  "focus-ring":    "color-mix(in oklch, var(brand) 80%, white)"
}
```

Nested `var()` references within token values are not resolved — only top-level CLI argument tokens are substituted. If you need a token that references another token, resolve it manually in the JSON file.

**Resolution:** Any CLI argument matching `var(name)` is replaced with the token value before the argument is passed to the parser. An unrecognized token name exits with code 2.

---

## JSON output schemas

### Evaluate

```json
{
  "input": {
    "text": "#111111",
    "bg": "#F5F0E8",
    "darkMode": false,
    "mode": "graphical"   // only present when not "text"
  },
  "score": 4.8,
  "string": "4",          // IPAX string notation
  "wcag": {
    "score": 3,
    "ratio": 13.92,
    "grade": "AAA",
    "fontSize": 16        // null in graphical mode
  },
  "apca": {
    "score": 5,
    "lc": 94.1,           // signed: positive = dark-on-light
    "grade": "Gold",
    "font": {
      "sizePx": 16,
      "usage": {
        "bodyTextAllowed": true,
        "spotTextAllowed": true,
        "errorCode": null
      }
    }
  },
  "colors": {
    "text": { "oklch": {"l": 0.256, "c": 0.027, "h": 58.8}, "y": 0.016, "apcaY": 0.0084 },
    "bg":   { "oklch": {"l": 0.957, "c": 0.018, "h": 78.3}, "y": 0.887, "apcaY": 0.861  }
  },
  "details": {
    "totalPenalty": 0.0,
    "penalties": [
      {"slug": "jitter",           "label": "Isoluminant Jitter",          "val": 0},
      {"slug": "chromostereopsis", "label": "Chromostereopsis (Hue Clash)", "val": 0},
      {"slug": "s_cone",           "label": "Foveal S-Cone Strain",         "val": 0},
      {"slug": "sim_contrast",     "label": "Simultaneous Contrast",        "val": 0},
      {"slug": "halation",         "label": "Halation",                     "val": 0},
      {"slug": "mydriasis",        "label": "Mydriasis",                    "val": 0},
      {"slug": "glare",            "label": "Macular Glare",                "val": 0},
      {"slug": "hk_effect",        "label": "H-K Effect Inflation",         "val": 0}
    ],
    "rewards": [
      {"slug": "paper_tone",            "label": "Paper Tone",             "val": 0.18},
      {"slug": "chromatic_relief",      "label": "Chromatic Relief",       "val": 0},
      {"slug": "achromatic_tint_contrast", "label": "Achromatic Tint Contrast", "val": 0}
    ]
  }
}
```

### Palette

```json
{
  "palette": [
    {"input": "red", "hex": "#FF0000", "oklch": [0.628, 0.258, 29.2]}
  ],
  "threshold": 25,
  "pairs": [
    {
      "i": 0, "j": 1,
      "a": {"hex": "#FF0000", "oklch": [0.628, 0.258, 29.2]},
      "b": {"hex": "#00AA00", "oklch": [0.587, 0.196, 142.0]},
      "delta":   {"normal": 38.1, "deuteranopia": 12.8, "protanopia": 9.4},
      "conflict": {"normal": false, "deuteranopia": true, "protanopia": true}
    }
  ],
  "conflicts": [ /* same shape as pairs, filtered to conflict:true */ ],
  "summary": {
    "colors": 2, "pairs": 1, "threshold": 25,
    "conflicts": {"normal": 0, "deuteranopia": 1, "protanopia": 1}
  }
}
```

### Stack

```json
{
  "layers": {
    "canvas":  {"input": "white",              "effective": "#FFFFFF",  "composited": false},
    "surface": {"input": "rgba(0,0,0,0.05)",   "effective": "#F2F2F2", "composited": true},
    "fg":      {"input": "#333",               "effective": "#333333",  "composited": false}
  },
  "scores": {
    "fg_over_surface": {"score": 5, "wcag": {...}, "apca": {...}},
    "fg_over_canvas":  {"score": 4, "wcag": {...}, "apca": {...}}
  },
  "hover": {
    "layers": { /* same shape */ },
    "scores": { /* same shape */ },
    "delta": {
      "fg_over_surface": {"scoreDelta": -0.7, "degraded": true},
      "fg_over_canvas":  {"scoreDelta": 0.0,  "degraded": false}
    }
  }
}
```

---

## IPAX string notation

The `string` field in JSON output encodes compliance at a glance:

| String | Meaning |
|--------|---------|
| `5` | IPAX 5 |
| `3` | IPAX 3 |
| `X` | IPAX < 1, compliance also fails |
| `X(1)` | IPAX < 1, but WCAG score is 1 — ergonomics dragged it below the compliance floor |
| `2(3)` | IPAX 2, but WCAG score is 3 — ergonomics dragged it below the AAA compliance floor |

When `ipaxInt < wcag.score`, the WCAG grade is shown in parentheses to make visible that the ergonomic model is the limiting factor. Ergonomic rewards can never push the score outside the parentheses past the WCAG-earned compliance tier — a pair scoring AA (WCAG 2) can be boosted up to 2.9 by rewards, but never rounds up to a false 3, so the parenthesis notation is one-directional: it only ever shows the score being pulled *down*, never claiming a grade the pair didn't legally earn.

---

## Dark/light polarity detection

Dark mode is detected automatically from the luminance relationship between text and background. When `|bgL − txtL| < 0.05` (mid-tone deadband — both colors near the same lightness), the system defaults to light mode polarity. This prevents the penalty model from flipping randomly on near-isoluminant pairs, which would cause chaotic halation/glare results.

Override with `--context dark|light`.

APCA polarity (`apca.lc` sign) is independent — it is always the signed Lc from the APCA formula, where positive means dark-on-light.

---

## Performance notes

The grid search in `ipax find` evaluates approximately 90,000 pairs at default settings. Each evaluation runs the full IPAX scoring pipeline (OKLCh conversion, WCAG ratio, APCA contrast, APCA font lookup, ergonomics engine). On a modern CPU this completes in under one second.

`ipax palette` with N colors performs N×(N−1)/2 ΔE computations plus 2 CVD simulations per pair (deuteranopia + protanopia). For large palettes (N > 20), this may take a few hundred milliseconds. Pass `--no-cvd` to skip CVD simulation for a 3× speedup.

The `--max-calls` flag on `ipax find` caps the grid search at a fixed evaluation count and is intended for CI pipelines where deterministic runtime matters more than exhaustive search.
