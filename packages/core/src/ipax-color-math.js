// Derived from IPAX 2 r.20260517 by Santiago Bustelo (https://bustelo.com.ar) — license pending

/** @typedef {import('./types.js').Oklch} Oklch */

/**
 * Converts an sRGB hex color to OKLCh, via linear sRGB → LMS → OKLab → OKLCh.
 * Used for IPAX's own ergonomics modeling (jitter, chromostereopsis, S-cone
 * strain, hue induction, H-K) — not for WCAG or APCA contrast, which each
 * have their own official luminance pipelines (see relativeLuminanceWCAG
 * and ipax-apca-bridge.js's getApcaYFromHex).
 *
 * @param {string} hex - `#rgb` or `#rrggbb`, with or without leading `#`.
 * @returns {Oklch|null} `null` if `hex` doesn't match a 6-digit hex color.
 */
export function hexToOklch(hex) {
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!res) return null;
    const r = parseInt(res[1], 16) / 255, g = parseInt(res[2], 16) / 255, b = parseInt(res[3], 16) / 255;
    const lin = (/** @type {number} */ c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const rl = lin(r), gl = lin(g), bl = lin(b);
    const l = 0.41222*rl + 0.53633*gl + 0.05145*bl;
    const m = 0.2119 *rl + 0.6807 *gl + 0.1074 *bl;
    const s = 0.0883 *rl + 0.28172*gl + 0.62998*bl;
    const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
    const L  =  0.21045*l_ + 0.79362*m_ - 0.00407*s_;
    const a  =  1.97799*l_ - 2.42859*m_ + 0.45059*s_;
    const b_ =  0.0259 *l_ + 0.78277*m_ - 0.80868*s_;
    let H = Math.atan2(b_, a) * (180 / Math.PI);
    if (H < 0) H += 360;
    return { l: L, c: Math.sqrt(a*a + b_*b_), h: H, hex: hex.toUpperCase() };
}

/**
 * WCAG 2.x relative luminance (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance),
 * linearizing sRGB directly from the hex value. WCAG predates OKLCH (2008 vs.
 * 2020) and its contrast formula is defined purely in terms of sRGB — routing
 * it through OKLCH would be a different, non-standard computation that only
 * approximates the spec.
 *
 * @param {string} hex - `#rgb` or `#rrggbb`, with or without leading `#`.
 * @returns {number} Relative luminance, 0–1. `0` if `hex` is malformed.
 */
export function relativeLuminanceWCAG(hex) {
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!res) return 0;
    const r = parseInt(res[1], 16) / 255, g = parseInt(res[2], 16) / 255, b = parseInt(res[3], 16) / 255;
    const lin = (/** @type {number} */ c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Relative luminance (Y) of an OKLCh color, via OKLCh → OKLab → LMS → linear
 * sRGB, clamped to the sRGB gamut. This is IPAX's own internal luminance —
 * NOT the WCAG luminance (use relativeLuminanceWCAG for that) or the APCA
 * luminance (use ipax-apca-bridge.js's getApcaYFromHex).
 *
 * @param {number} L - OKLab lightness, 0–1.
 * @param {number} C - OKLCh chroma.
 * @param {number} H - OKLCh hue, degrees.
 * @returns {number} Relative luminance, 0–1.
 */
export function getY(L, C, H) {
    const hRad = H * Math.PI / 180;
    const a = C * Math.cos(hRad), b_ = C * Math.sin(hRad);
    const l_ = L + 0.39633*a + 0.2158 *b_;
    const m_ = L - 0.10556*a - 0.06385*b_;
    const s_ = L - 0.08948*a - 1.29149*b_;
    const R_lin = Math.max(0, Math.min(1,  4.0767*(l_**3) - 3.3077*(m_**3) + 0.2309*(s_**3)));
    const G_lin = Math.max(0, Math.min(1, -1.2684*(l_**3) + 2.6097*(m_**3) - 0.3413*(s_**3)));
    const B_lin = Math.max(0, Math.min(1, -0.0041*(l_**3) - 0.7034*(m_**3) + 1.7076*(s_**3)));
    return 0.2126*R_lin + 0.7152*G_lin + 0.0722*B_lin;
}

/**
 * WCAG 2.x contrast ratio between two relative luminances
 * (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio). Order-independent —
 * the lighter of the two is always treated as L1.
 *
 * @param {number} txtY - Relative luminance, 0–1.
 * @param {number} bgY - Relative luminance, 0–1.
 * @returns {number} Contrast ratio, 1–21.
 */
export function calculateWcagContrast(txtY, bgY) {
    const L1 = Math.max(txtY, bgY);
    const L2 = Math.min(txtY, bgY);
    return (L1 + 0.05) / (L2 + 0.05);
}
