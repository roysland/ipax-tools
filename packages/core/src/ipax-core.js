// Derived from IPAX 2 r.20260517 by Santiago Bustelo (https://bustelo.com.ar) — license pending
import { hexToOklch, relativeLuminanceWCAG, calculateWcagContrast } from './ipax-color-math.js';
import * as APCABridge from './ipax-apca-bridge.js';
import * as Ergo from './ipax-ergonomics.js';
import * as Dict from './ipax-dictionary.js';

/** @typedef {import('./types.js').Oklch} Oklch */
/** @typedef {import('./types.js').ScoringMode} ScoringMode */
/** @typedef {import('./types.js').ForceContext} ForceContext */
/** @typedef {import('./types.js').Warning} Warning */
/** @typedef {import('./types.js').WcagData} WcagData */
/** @typedef {import('./types.js').ApcaData} ApcaData */
/** @typedef {import('./types.js').IpaxScoreResult} IpaxScoreResult */

/**
 * Maps a WCAG contrast ratio to a compliance score (0–3) and grade.
 * `graphical` mode uses the SC 1.4.11 non-text floor (3:1 minimum) instead
 * of the body/large-text thresholds, and omits fontSize since it doesn't
 * apply to non-text elements.
 *
 * @param {number} ratio - WCAG contrast ratio, 1–21.
 * @param {ScoringMode} mode
 * @returns {WcagData}
 */
function _getWcagData(ratio, mode) {
    let score = 0, grade = "Fail", fs = null;
    if (mode === 'graphical') {
        // WCAG 2.1 SC 1.4.11 — non-text content: 3:1 is the compliance floor
        if (ratio >= 7.0) { score = 3; grade = "AAA"; }
        else if (ratio >= 4.5) { score = 2; grade = "AA"; }
        else if (ratio >= 3.0) { score = 1; grade = "1.4.11 Pass"; }
        return { score, ratio: parseFloat(ratio.toFixed(2)), grade, fontSize: null };
    }
    if (ratio >= 7.0) { score = 3; grade = "AAA"; fs = 16; }
    else if (ratio >= 4.5) { score = 2; grade = "AA"; fs = 16; }
    else if (ratio >= 3.0) { score = 1; grade = "AA (Large text)"; fs = 24; }
    return { score, ratio: parseFloat(ratio.toFixed(2)), grade, fontSize: fs };
}

/**
 * Maps an APCA Lc magnitude to a compliance score (0–5) and grade, plus
 * the font-size/usage data for that Lc (skipped in `graphical` mode, since
 * font sizing doesn't apply to non-text elements).
 *
 * @param {number} absLc - `Math.abs(apcaLc)`.
 * @param {number} rawLc - Signed APCA Lc.
 * @param {number} wt - CSS font-weight, 100–900.
 * @param {ScoringMode} mode
 * @returns {ApcaData}
 */
function _getApcaData(absLc, rawLc, wt, mode) {
    let score = 0, grade = "Fail";
    if (absLc >= 90) { score = 5; grade = "Gold"; }
    else if (absLc >= 75) { score = 4; grade = "Silver"; }
    else if (absLc >= 60) { score = 3; grade = "Bronze"; }
    else if (absLc >= 45) { score = 2; grade = "Standard"; }
    else if (absLc >= 30) { score = 1; grade = "Large text only"; }
    const font = mode === 'graphical'
        ? { sizePx: null, usage: { bodyTextAllowed: false, spotTextAllowed: false, errorCode: 'n/a-graphical' } }
        : APCABridge.getFontData(rawLc, wt);
    return { score, lc: parseFloat(rawLc.toFixed(1)), grade, font };
}

/**
 * Interpolates how far `val` has progressed through a compliance tier's
 * [lo, hi) band, scaled to 0.0–0.9 — the fractional part of the score within
 * that tier (e.g. WCAG tier 1 spans 3.0:1–4.5:1; a ratio of 3.75 is halfway
 * through, giving 0.45). Never reaches 1.0: crossing into the next whole
 * point requires actually clearing the next tier's threshold, not just
 * approaching it — see the reward clamp in getIPAXscore for why that matters.
 *
 * @param {number} val
 * @param {number} level - Compliance tier (1 or 2; tier 3 has no band, it's the ceiling).
 * @param {Record<number, [number, number]>} bands - `{ [level]: [lo, hi] }`.
 * @returns {number} 0.0–0.9.
 */
function _getDecimal(val, level, bands) {
    if (!bands[level]) return 0;
    const [lo, hi] = bands[level];
    if (val >= hi) return 0.9;
    if (val <= lo) return 0.0;
    return parseFloat((((val - lo) / (hi - lo)) * 0.9).toFixed(1));
}

/**
 * Assembles the final public JSON shape, including the `string` notation
 * (e.g. "3", "X", "1(2)") — the parenthesized WCAG grade appears only when
 * the biological score is lower than what WCAG alone earned (ergonomic
 * penalties dragged it down), never the reverse.
 *
 * @param {number} finalScore
 * @param {WcagData} wcag
 * @param {ApcaData} apca
 * @param {number} totPen
 * @param {Warning[]} rawWarn
 * @param {string} txtH
 * @param {string} bgH
 * @param {boolean} dark
 * @param {{txtOklch: Oklch, bgOklch: Oklch, txtY: number, bgY: number, apcaTxtY: number, apcaBgY: number}} colorData
 * @param {ScoringMode} mode
 * @returns {IpaxScoreResult}
 */
function _buildJSON(finalScore, wcag, apca, totPen, rawWarn, txtH, bgH, dark, colorData, mode) {
    const rounded = parseFloat(finalScore.toFixed(1));
    const ipaxInt = Math.floor(rounded);

    const ipaxChar = ipaxInt < 1 ? 'X' : ipaxInt.toString();
    const wcagChar = wcag.score < 1 ? 'X' : wcag.score.toString();

    const ipaxString = (ipaxInt < wcag.score) ? `${ipaxChar}(${wcagChar})` : ipaxChar;

    /** @param {import('./types.js').DictionaryEntry[]} arr */
    const mapHit = (arr) => arr.map(rule => {
        const hit = rawWarn.find(w => w.slug === rule.slug);
        return { slug: rule.slug, label: rule.label, val: hit ? parseFloat(hit.val.toFixed(2)) : 0 };
    });

    /** @param {Oklch} o */
    const fmtOklch = (o) => ({
        l: parseFloat(o.l.toFixed(4)),
        c: parseFloat(o.c.toFixed(4)),
        h: parseFloat(o.h.toFixed(1))
    });

    return {
        input: { text: txtH, bg: bgH, darkMode: dark, ...(mode && mode !== 'text' && { mode }) },
        score: rounded,
        string: ipaxString,
        wcag: wcag,
        apca: apca,
        colors: {
            text: { oklch: fmtOklch(colorData.txtOklch), y: parseFloat(colorData.txtY.toFixed(6)), apcaY: parseFloat(colorData.apcaTxtY.toFixed(6)) },
            bg:   { oklch: fmtOklch(colorData.bgOklch),  y: parseFloat(colorData.bgY.toFixed(6)),  apcaY: parseFloat(colorData.apcaBgY.toFixed(6)) }
        },
        details: {
            totalPenalty: parseFloat(totPen.toFixed(2)),
            penalties: mapHit(Dict.penalties),
            rewards: mapHit(Dict.rewards)
        }
    };
}

/**
 * Scores a text/background color pair for accessibility (WCAG + APCA) and
 * perceptual comfort (IPAX ergonomics). The returned `score` is compliance-
 * gated: ergonomic rewards can raise it within the WCAG-earned compliance
 * tier (`complianceLevel` to `complianceLevel + 0.9`) but can never push it
 * into the next tier — a pair scoring WCAG AA can be boosted to 2.9 by
 * rewards, never rounded up to a false 3. See the `string` field for the
 * `X(1)`-style notation this produces when ergonomics disagrees with WCAG.
 *
 * @param {string} textHex - `#rrggbb`.
 * @param {string} bgHex - `#rrggbb`.
 * @param {ForceContext} [forceContext=null] - Override dark/light detection; `null` auto-detects from lightness.
 * @param {number} [fontWt=400] - CSS font-weight, 100–900. Affects APCA font-size lookup.
 * @param {ScoringMode} [mode='text'] - `'graphical'` scores non-text elements (borders, icons, focus rings) instead of body text.
 * @returns {IpaxScoreResult}
 * @throws {Error} If either hex color fails to parse.
 */
export function getIPAXscore(textHex, bgHex, forceContext = null, fontWt = 400, mode = 'text') {
    const txtOklch = hexToOklch(textHex);
    const bgOklch = hexToOklch(bgHex);
    if (!txtOklch || !bgOklch) throw new Error('Invalid HEX colors provided to IPAXScore.');

    // WCAG relative luminance is computed directly from sRGB — not from OKLCH — per the WCAG spec.
    const txtY = relativeLuminanceWCAG(textHex);
    const bgY = relativeLuminanceWCAG(bgHex);
    const apcaTxtY = APCABridge.getApcaYFromHex(textHex);
    const apcaBgY = APCABridge.getApcaYFromHex(bgHex);

    const wcagRatio = calculateWcagContrast(txtY, bgY);
    const apcaLc = APCABridge.calculateContrast(apcaTxtY, apcaBgY);
    const absLc = Math.abs(apcaLc);

    const wcagData = _getWcagData(wcagRatio, mode);
    const apcaData = _getApcaData(absLc, apcaLc, fontWt, mode);

    // The stricter of the two standards sets the compliance ceiling rewards can't cross.
    let complianceLevel = Math.min(wcagData.score, apcaData.score);
    let rawScore = 0;

    if (complianceLevel < 3) {
        const wcagDec = _getDecimal(wcagRatio, complianceLevel, {1:[3.0, 4.5], 2:[4.5, 7.0]});
        const apcaDec = _getDecimal(absLc, complianceLevel, {1:[30, 60], 2:[60, 75]});
        rawScore = complianceLevel + Math.min(wcagDec, apcaDec);
    } else if (absLc < 75) {
        rawScore = 3 + Math.min(0.9, Math.max(0, (absLc - 60) / 15) * 0.9);
    } else {
        rawScore = absLc >= 90 ? 5 : 4;
    }

    const warnings = [];
    let totalPenalty = 0;

    const lumDelta = bgOklch.l - txtOklch.l; // positive = bg is lighter (positive polarity)
    const isDarkContext = forceContext === 'dark' ? true
        : forceContext === 'light' ? false
        : Math.abs(lumDelta) < 0.05 ? false  // deadband: ambiguous mid-tones default to light
        : lumDelta < 0;

    const deltaL = Math.abs(txtOklch.l - bgOklch.l);
    const deltaY = Math.abs(txtY - bgY);
    if ((deltaL < 0.15 || deltaY < 0.08) && txtOklch.c > 0.05 && bgOklch.c > 0.05) {
        const isoAct = Math.max(0, 1 - (deltaL / 0.15));
        const chromaF = Math.min(1.0, (txtOklch.c + bgOklch.c) * 2.0);
        // Graphical mode: thin strokes suffer more from jitter (edge bleeding)
        const jitterMult = mode === 'graphical' ? 1.5 : 1.0;
        const jitterPenalty = Math.min(1.5, parseFloat((1.5 * isoAct * chromaF * jitterMult).toFixed(2)));
        if (jitterPenalty > 0.2) {
            warnings.push({ slug: 'jitter', val: parseFloat(jitterPenalty.toFixed(2)) });
            totalPenalty += jitterPenalty;
        }
    }

    const ergoData = Ergo.calculatePenalties(txtOklch, bgOklch, isDarkContext);

    if (mode === 'graphical') {
        // Thin strokes (borders, focus rings, icons) are more susceptible to spatial-frequency
        // degradation from chromostereopsis, S-cone strain, and simultaneous contrast.
        const EDGE_SLUGS = new Set(['chromostereopsis', 's_cone', 'sim_contrast']);
        let newTotal = 0;
        for (const w of ergoData.warnings) {
            if (EDGE_SLUGS.has(w.slug)) w.val = parseFloat(Math.min(2.0, w.val * 1.5).toFixed(2));
            newTotal += w.val;
        }
        ergoData.totalPenalty = parseFloat(newTotal.toFixed(2));
    }

    totalPenalty += ergoData.totalPenalty;
    warnings.push(...ergoData.warnings);

    if (absLc >= 75) {
        // Helmholtz-Kohlrausch: high-chroma reds/blues read as lighter than their
        // luminance alone predicts, inflating perceived contrast beyond what APCA
        // measured — only relevant once APCA is already in "excellence zone" territory.
        // The 2500 divisor targets a ~50-degree Gaussian window around each hue.
        /** @param {Oklch} color */
        const calcHK = (color) => {
            if (color.c <= 0.08) return 0;
            const dRed = Math.min(color.h, 360 - color.h), dBlue = Math.abs(color.h - 270);
            const hueAct = Math.max(Math.exp(-Math.pow(dRed,2)/2500), Math.exp(-Math.pow(dBlue,2)/2500));
            return Math.min(0.5, 0.5 * hueAct * Math.min(1, (color.c - 0.08)/0.20));
        };
        const hkPenalty = Math.max(calcHK(txtOklch), calcHK(bgOklch));
        if (hkPenalty > 0.1) {
            totalPenalty += parseFloat(hkPenalty.toFixed(2));
            warnings.push({ slug: 'hk_effect', val: parseFloat(hkPenalty.toFixed(2)) });
        }
    }

    let finalScore = Math.max(0, rawScore - totalPenalty);

    const rewards = Ergo.calculateRewards(txtOklch, bgOklch, isDarkContext, finalScore, totalPenalty);
    if (rewards.totalReward > 0) {
        const boostedScore = finalScore + rewards.totalReward;
        // Ergonomic rewards are capped within the earned compliance tier: they can never
        // push the score into the next legal grade (e.g. AA's 2.x can't round up to a false 3).
        finalScore = complianceLevel < 3
            ? Math.min(complianceLevel + 0.9, boostedScore)
            : Math.min(5, boostedScore);
        warnings.push(...rewards.bonuses);
    }

    return _buildJSON(finalScore, wcagData, apcaData, totalPenalty, warnings, textHex, bgHex, isDarkContext,
        { txtOklch, bgOklch, txtY, bgY, apcaTxtY, apcaBgY }, mode);
}
