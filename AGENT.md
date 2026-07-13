# ipax — Agent Instructions

ipax evaluates perceptual readability of color pairs. It goes beyond WCAG contrast ratios by modelling the visual system: penalties for phenomena like chromostereopsis, halation, and S-cone strain can drag a passing WCAG pair down to an unusable score, and rewards for good background choices can lift a pair above its raw contrast.

The MCP server is registered under the key `ipax` and exposes four tools.

---

## Scoring model

**Score range: 0–5.** The score is continuous (e.g. 3.4), but the floor integer is what matters:

| Score | Meaning | APCA Lc | WCAG |
|---|---|---|---|
| 5 | Gold — ideal for all uses | ≥ 90 | AAA |
| 4 | Silver — excellent | 75–90 | AAA |
| 3 | Bronze — production-ready for body text | 60–75 | AAA |
| 2 | Standard — UI labels, large text | 45–60 | AA |
| 1 | Large text / graphical elements only | 30–45 | ≥ 3:1 |
| 0 | Fail | < 30 | Fail |

**Score string.** `result.string` is the display form. It shows the IPAX score; if perceptual penalties drag it below WCAG, the WCAG level appears in parentheses: `"2(3)"` means the pair passes WCAG AAA but only scores 2 on perceptual grounds. `"X(2)"` means WCAG AA but perceptually unusable.

**Minimum target for production text: score ≥ 3.**

---

## When to use each tool

**`ipax_evaluate`** — single pair check. Use when the user asks whether two specific colors work together, or to diagnose why a pair looks bad despite passing WCAG.

**`ipax_find`** — color generation. Use when the user needs to find color combinations at a brand hue, generate design tokens, or wants "what works near this color". Returns ranked bg+text pairs with `color-mix()` CSS snippets ready to use.

**`ipax_palette`** — palette audit. Use when the user has a set of UI colors and wants to know which pairs are too similar to distinguish (including under color-blindness). Flags pairs below the ΔE threshold and runs deuteranopia + protanopia simulations.

**`ipax_stack`** — component-level check. Use when evaluating a real UI layer stack: page background → card/surface → text. Handles semi-transparent surfaces (e.g. `rgba(0,0,0,0.05)`) by compositing them before scoring.

---

## Interpreting results

### `ipax_evaluate` output

```
result.score          // float, e.g. 3.4
result.string         // display string, e.g. "3" or "2(3)"
result.apca.lc        // signed Lc value; negative = light-on-dark
result.apca.grade     // "Gold" | "Silver" | "Bronze" | "Standard" | "Large text only" | "Fail"
result.apca.font      // { sizePx, usage } — minimum font size at the given weight
result.wcag.ratio     // e.g. 7.23
result.wcag.grade     // "AAA" | "AA" | "AA (Large text)" | "1.4.11 Pass" | "Fail"
result.details.penalties  // array — items with val > 0 are active
result.details.rewards    // array — items with val > 0 are active
```

**Active penalties to report to the user:**

| slug | Plain-language meaning |
|---|---|
| `jitter` | Low luminance contrast — edges vibrate even if hue contrast is high |
| `chromostereopsis` | Adjacent saturated opposing hues — depth illusion, eye strain |
| `s_cone` | Blue text on anything — fovea lacks S-cones, cannot focus |
| `sim_contrast` | Highly chromatic background distorts neutral text appearance |
| `halation` | Bright text on dark background — glowing bleed effect |
| `mydriasis` | Near-pure black background (#000) — maximum pupil dilation, astigmatism |
| `glare` | Near-pure white background (L > 0.96) — intraocular straylight |
| `hk_effect` | High-chroma color inflating perceived contrast |

**Active rewards:** `paper_tone`, `chromatic_relief`, `achromatic_tint_contrast` — these indicate the pair uses a perceptually favourable combination and the score has been boosted accordingly.

### `ipax_find` output

```
results[n].score          // IPAX score
results[n].bg.hex         // background hex
results[n].text.hex       // text hex
results[n].colorMix       // color-mix() CSS string (null if grid point needs no mixing)
results[n].apca.polarity  // "dark-on-light" | "light-on-dark"
```

Use `colorMix` directly in CSS. If null, the bg/text hex values are the result.

### `ipax_palette` output

```
pairs[n].deltaE           // perceptual distance in OKLCh
pairs[n].conflict         // true if below threshold
pairs[n].cvd              // { deuteranopia, protanopia } — each has deltaE + conflict
```

A `conflict: true` pair cannot reliably be used as a foreground/background combination in UI. CVD conflicts are separate — a pair can be fine normally but fail under color blindness.

### `ipax_stack` output

```
layers.surface.effective  // resolved hex after alpha compositing
layers.fg.effective       // resolved hex after alpha compositing
scores.fg_over_surface    // { score, wcag, apca } — the primary text readability score
scores.fg_over_canvas     // score if surface were absent (useful for overlap regions)
scores.surface_over_canvas // score for the surface layer itself (borders, UI chrome)
scores.hover              // present only if hover colors were passed
```

Always report `fg_over_surface` as the primary result. `surface_over_canvas` matters for cards with visible borders or focus rings.

---

## Common workflows

**"Does this color pair work?"**
→ `ipax_evaluate`. Report the score, grade, and any active penalties. If score < 3 but wcag.grade is AA/AAA, explain that perceptual penalties are the cause.

**"Find me text colors for our brand blue (#0066cc)"**
→ `ipax_find` with `hue: 220` (or derive from the hex). Set `base: "#0066cc"` to bias the CSS hints toward the brand color.

**"Check our design tokens / color palette"**
→ `ipax_palette` with all the colors. Report conflicting pairs and any CVD failures separately.

**"Does this card component work?"**
→ `ipax_stack` with `canvas` = page bg, `surface` = card background, `fg` = card text. If the card has a hover state, include `surface_hover` or `fg_hover`.

**"Why does this look bad even though it passes WCAG?"**
→ `ipax_evaluate`. Look for active penalties in `details.penalties`. The penalty slugs above map directly to visual phenomena you can explain.

---

## Notes

- All color inputs accept any CSS format: `#hex`, `rgb()`, `rgba()`, `oklch()`, `color-mix()`, and CSS named colors.
- Semi-transparent colors in `ipax_evaluate` should use `--flatten-over` / `flatten_over` to composite before scoring; `ipax_stack` does this automatically.
- `mode: "graphical"` uses WCAG 1.4.11 non-text contrast thresholds instead of text sizing. Use it for icons, borders, and focus rings.
- Font weight affects the minimum readable size lookup — use `weight: 700` when checking bold UI labels.
