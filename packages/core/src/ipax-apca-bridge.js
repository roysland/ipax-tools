// Derived from IPAX 2 r.20260517 by Santiago Bustelo (https://bustelo.com.ar) — license pending
import { APCAcontrast, fontLookupAPCA, sRGBtoY } from './apca-w3.js';

export function getApcaYFromHex(hex) {
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!res) return 0;
    const r = parseInt(res[1], 16), g = parseInt(res[2], 16), b = parseInt(res[3], 16);
    return sRGBtoY([r, g, b]);
}

export function calculateContrast(txtY, bgY) {
    return APCAcontrast(txtY, bgY);
}

export function getFontData(lc, weight = 400) {
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

    let baseSize = (850 / (absLc - 25)) + 3;
    let weightFactor = weight < 400 ? Math.pow(400 / weight, 1.5) : Math.pow(400 / weight, 0.8);
    usageObj.sizePx = Math.max(12, Math.round(baseSize * weightFactor));
    return usageObj;
}
