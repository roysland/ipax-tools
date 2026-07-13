// Derived from IPAX 2 r.20260517 by Santiago Bustelo (https://bustelo.com.ar) — license pending
import { APCAcontrast, fontLookupAPCA, sRGBtoY } from './apca-w3.js';

/** @typedef {import('./types.js').FontData} FontData */

/**
 * APCA's own sRGB luminance (Y), distinct from both WCAG's relativeLuminanceWCAG
 * and IPAX's internal getY — APCA defines its own luminance/contrast pipeline
 * per the official apca-w3 reference implementation.
 *
 * @param {string} hex - `#rgb` or `#rrggbb`, with or without leading `#`.
 * @returns {number} `0` if `hex` is malformed.
 */
export function getApcaYFromHex(hex) {
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!res) return 0;
    const r = parseInt(res[1], 16), g = parseInt(res[2], 16), b = parseInt(res[3], 16);
    return sRGBtoY([r, g, b]);
}

/**
 * Signed APCA Lc contrast between text and background luminance. Sign
 * indicates polarity (positive = light text on dark bg or vice versa,
 * per APCA convention) — callers needing a magnitude should Math.abs it.
 *
 * @param {number} txtY - APCA luminance, from getApcaYFromHex.
 * @param {number} bgY - APCA luminance, from getApcaYFromHex.
 * @returns {number} Signed Lc, roughly -108 to 106.
 */
export function calculateContrast(txtY, bgY) {
    return APCAcontrast(txtY, bgY);
}

/**
 * Decodes APCA's minimum-font-size lookup table into a semantic usage object.
 * APCA's own lookup arrays use "magic numbers" (999, 777) to signal
 * failure states rather than sizes — 999 means invisible/prohibited for any
 * use, 777 means spot-text only (headlines, labels — never body copy).
 *
 * @param {number} lc - Signed or unsigned APCA Lc; only the magnitude is used.
 * @param {number} [weight=400] - CSS font-weight, 100–900.
 * @returns {FontData}
 */
export function getFontData(lc, weight = 400) {
    /** @type {FontData} */
    const usageObj = { sizePx: null, usage: { bodyTextAllowed: true, spotTextAllowed: true, errorCode: null } };
    const absLc = Math.abs(lc);

    if (absLc < 30) {
        usageObj.usage.bodyTextAllowed = false;
        usageObj.usage.spotTextAllowed = false;
        usageObj.usage.errorCode = 999;
        if (absLc > 25) {
            const baseSize = (850 / (absLc - 25)) + 3;
            const weightFactor = weight < 400 ? Math.pow(400 / weight, 1.5) : Math.pow(400 / weight, 0.8);
            usageObj.sizePx = Math.max(12, Math.round(baseSize * weightFactor));
        }
        return usageObj;
    }

    const fontArray = fontLookupAPCA(lc);
    if (fontArray && fontArray.length >= 10) {
        const wIdx = Math.max(1, Math.min(9, Math.round(weight / 100)));
        const size = fontArray[wIdx];

        if (size === 999 || size === 777) {
            const baseSize = (850 / (absLc - 25)) + 3;
            const weightFactor = weight < 400 ? Math.pow(400 / weight, 1.5) : Math.pow(400 / weight, 0.8);
            usageObj.sizePx = Math.max(12, Math.round(baseSize * weightFactor));
            usageObj.usage.bodyTextAllowed = false;
            usageObj.usage.spotTextAllowed = size === 777;
            usageObj.usage.errorCode = size;
            return usageObj;
        }
        usageObj.sizePx = Math.max(12, Math.round(size));
        return usageObj;
    }

    // Heuristic approximation if the lookup table didn't return a usable array.
    let baseSize = (850 / (absLc - 25)) + 3;
    let weightFactor = weight < 400 ? Math.pow(400 / weight, 1.5) : Math.pow(400 / weight, 0.8);
    usageObj.sizePx = Math.max(12, Math.round(baseSize * weightFactor));
    return usageObj;
}
