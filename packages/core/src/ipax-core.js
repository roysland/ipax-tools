// Derived from IPAX 2 r.20260517 by Santiago Bustelo (https://bustelo.com.ar) — license pending
import { hexToOklch, relativeLuminanceWCAG, calculateWcagContrast } from './ipax-color-math.js';
import * as APCABridge from './ipax-apca-bridge.js';
import * as Ergo from './ipax-ergonomics.js';
import * as Dict from './ipax-dictionary.js';

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

function _getDecimal(val, level, bands) {
    if (!bands[level]) return 0;
    const [lo, hi] = bands[level];
    if (val >= hi) return 0.9;
    if (val <= lo) return 0.0;
    return parseFloat((((val - lo) / (hi - lo)) * 0.9).toFixed(1));
}

function _buildJSON(finalScore, wcag, apca, totPen, rawWarn, txtH, bgH, dark, colorData, mode) {
    const rounded = parseFloat(finalScore.toFixed(1));
    const ipaxInt = Math.floor(rounded);

    const ipaxChar = ipaxInt < 1 ? 'X' : ipaxInt.toString();
    const wcagChar = wcag.score < 1 ? 'X' : wcag.score.toString();

    const ipaxString = (ipaxInt < wcag.score) ? `${ipaxChar}(${wcagChar})` : ipaxChar;

    const mapHit = (arr) => arr.map(rule => {
        const hit = rawWarn.find(w => w.slug === rule.slug);
        return { slug: rule.slug, label: rule.label, val: hit ? parseFloat(hit.val.toFixed(2)) : 0 };
    });

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
