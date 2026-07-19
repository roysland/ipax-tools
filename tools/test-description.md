# IPAX surround fragility testing

Two complementary instruments for measuring how much of a color pair's IPAX comfort score depends on the assumption that the pair's background controls the whole visual field (fullscreen viewing), versus real windowed/desktop conditions where wallpaper and chrome set the eye's adaptation state instead.

Both share the same 16-pair suite (groups A–D: peak-contrast white, paper tones, dark mode, reduced contrast), the same precomputed IPAX scores and surround-fragile.mjs fragility grades, the same environmental setup screen (time of day, room lighting, photophobic sensitivity — the last persisted once in localStorage and shared across both tools), and the same JSON export shape for downstream analysis.

---

## 1. fragility-test.html — sequential absolute rating

**What it captures:** For each of the 16 pairs, shown twice (once isolated/"clean," once inside a simulated disturbed desktop — drifting gradient wallpaper, fake browser chrome, dock, side windows), the participant rates sustained reading comfort on a 3-point scale: comfortable / tolerable / draining. 32 ratings per run. The 32 trials are shuffled (Fisher-Yates) so clean and disturbed pairs are interleaved rather than run as two blocks — otherwise disturbed, always last, would pick up all the session's accumulated fatigue and look worse for that reason alone, especially for ME/CFS-type users. A 2200ms neutral-gray pause between every pair resets pupil/chromatic adaptation so one pair's carryover doesn't bleed into the next rating; this is long enough for pupil/retinal adaptation to actually stabilize (a shorter ~900ms pause risked a partial reset). Progress is reported per-phase (e.g. "Clean · 3/16") using a counter computed after shuffling, so it still reads as meaningful despite the randomized order.

**What it measures:** Preference in an absolute sense — how a pair feels on its own, in a given context. Comparing a pair's clean rating to its disturbed rating gives a per-pair estimate of real-world fragility, to be checked against the engine's computed fragility score.

**Caveats:**

- Absolute categorical scales drift — "tolerable" on a good day and a fatigued day may not mean the same thing, especially with ME/CFS-type variability.
- The disturbed surround is one fixed hue/lightness (purple-pink gradient) — findings describe fragility under that surround, not surrounds in general.
- Self-report only; no objective measure (e.g. dwell time, reaction time) backs up the rating.

---

## 2. fragility-compare.html — forced-choice relative comparison

**What it captures:** For each pair, clean and disturbed versions are shown one at a time, fullscreen, in temporal sequence — never side by side. Each condition displays for 4 seconds, in randomized order per trial (also randomized across pairs), separated by a 2200ms neutral-gray blank so the eye reaches a stable adaptation state for each condition before the next one appears. After both conditions have been shown, a neutral gray judgment screen asks "First / Same / Second," resolved internally to clean_better / disturbed_better / same. 16 comparisons per run. Judgment input is only accepted once the judgment stage is reached — a keypress during a stimulus or the blank is ignored rather than misattributed to the wrong trial.

This test originally showed both conditions simultaneously, split-screen. That was changed: the model's core premise is that the surround sets the eye's physical adaptation state (pupil dilation, light adaptation), and the visual system adapts to the average luminance of the whole field of view — putting both conditions on screen at once let the bright, chaotic disturbed half bleed into the adaptation state of the eye reading the clean half, undermining the thing being measured. Sequential fullscreen presentation with an inter-stimulus pause eliminates that.

**What it measures:** Relative sensitivity — whether a person can detect any difference between clean and disturbed for a given pair, and which way it goes. This is more sensitive to small effects than the absolute scale, and functions like the eye-exam "better/worse/same" paradigm rather than a subjective label.

**Caveats:**

- `disturbed_better` is not evidence that clutter helps reading — it's a signal to investigate. It most plausibly means the surround's ambient luminance shifted adaptation baseline enough to reduce felt glare on high-glare pairs (a real, useful finding), or it's forced-choice noise on a near-indifferent pair (the participant picked a side rather than commit to "same"). Distinguishing the two requires aggregating judgment against fragility grade, not reading rows individually.
- Recency bias is possible: the judgment prompt follows immediately after "second," so a participant could weight the most recently seen condition more heavily than the first. Nothing in the design corrects for this beyond randomizing which condition is shown first.
- A fixed 4-second exposure may not surface sustained-reading fatigue the way the absolute test's open-ended dwell time does — it answers "which was more comfortable in that window," not "which is more draining to read for ten minutes."
- Same fixed-surround-color caveat as in the sequential test applies.

---

## How the two relate

Neither replaces the other. The sequential test gives absolute, fatigue-sensitive labels per condition; the comparison test gives a more sensitive, relative cross-check of the same clean/disturbed contrast, now measured under conditions (sequential, not simultaneous exposure) consistent with the adaptation mechanism both tests are trying to probe. The strongest evidence for or against a pair's fragility score is where both agree — e.g., a pair rated "draining" in test 1 and rated clean_better in test 2 corroborates a real fragility effect. Disagreement between the two instruments is informative: it suggests measurement noise, or that the absolute scale and the relative one are picking up different aspects of the experience.