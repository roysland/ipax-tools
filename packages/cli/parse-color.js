const NAMED_COLORS = {
    aliceblue: '#F0F8FF', antiquewhite: '#FAEBD7', aqua: '#00FFFF',
    aquamarine: '#7FFFD4', azure: '#F0FFFF', beige: '#F5F5DC',
    bisque: '#FFE4C4', black: '#000000', blanchedalmond: '#FFEBCD',
    blue: '#0000FF', blueviolet: '#8A2BE2', brown: '#A52A2A',
    burlywood: '#DEB887', cadetblue: '#5F9EA0', chartreuse: '#7FFF00',
    chocolate: '#D2691E', coral: '#FF7F50', cornflowerblue: '#6495ED',
    cornsilk: '#FFF8DC', crimson: '#DC143C', cyan: '#00FFFF',
    darkblue: '#00008B', darkcyan: '#008B8B', darkgoldenrod: '#B8860B',
    darkgray: '#A9A9A9', darkgreen: '#006400', darkgrey: '#A9A9A9',
    darkkhaki: '#BDB76B', darkmagenta: '#8B008B', darkolivegreen: '#556B2F',
    darkorange: '#FF8C00', darkorchid: '#9932CC', darkred: '#8B0000',
    darksalmon: '#E9967A', darkseagreen: '#8FBC8F', darkslateblue: '#483D8B',
    darkslategray: '#2F4F4F', darkslategrey: '#2F4F4F', darkturquoise: '#00CED1',
    darkviolet: '#9400D3', deeppink: '#FF1493', deepskyblue: '#00BFFF',
    dimgray: '#696969', dimgrey: '#696969', dodgerblue: '#1E90FF',
    firebrick: '#B22222', floralwhite: '#FFFAF0', forestgreen: '#228B22',
    fuchsia: '#FF00FF', gainsboro: '#DCDCDC', ghostwhite: '#F8F8FF',
    gold: '#FFD700', goldenrod: '#DAA520', gray: '#808080',
    green: '#008000', greenyellow: '#ADFF2F', grey: '#808080',
    honeydew: '#F0FFF0', hotpink: '#FF69B4', indianred: '#CD5C5C',
    indigo: '#4B0082', ivory: '#FFFFF0', khaki: '#F0E68C',
    lavender: '#E6E6FA', lavenderblush: '#FFF0F5', lawngreen: '#7CFC00',
    lemonchiffon: '#FFFACD', lightblue: '#ADD8E6', lightcoral: '#F08080',
    lightcyan: '#E0FFFF', lightgoldenrodyellow: '#FAFAD2', lightgray: '#D3D3D3',
    lightgreen: '#90EE90', lightgrey: '#D3D3D3', lightpink: '#FFB6C1',
    lightsalmon: '#FFA07A', lightseagreen: '#20B2AA', lightskyblue: '#87CEFA',
    lightslategray: '#778899', lightslategrey: '#778899', lightsteelblue: '#B0C4DE',
    lightyellow: '#FFFFE0', lime: '#00FF00', limegreen: '#32CD32',
    linen: '#FAF0E6', magenta: '#FF00FF', maroon: '#800000',
    mediumaquamarine: '#66CDAA', mediumblue: '#0000CD', mediumorchid: '#BA55D3',
    mediumpurple: '#9370DB', mediumseagreen: '#3CB371', mediumslateblue: '#7B68EE',
    mediumspringgreen: '#00FA9A', mediumturquoise: '#48D1CC', mediumvioletred: '#C71585',
    midnightblue: '#191970', mintcream: '#F5FFFA', mistyrose: '#FFE4E1',
    moccasin: '#FFE4B5', navajowhite: '#FFDEAD', navy: '#000080',
    oldlace: '#FDF5E6', olive: '#808000', olivedrab: '#6B8E23',
    orange: '#FFA500', orangered: '#FF4500', orchid: '#DA70D6',
    palegoldenrod: '#EEE8AA', palegreen: '#98FB98', paleturquoise: '#AFEEEE',
    palevioletred: '#DB7093', papayawhip: '#FFEFD5', peachpuff: '#FFDAB9',
    peru: '#CD853F', pink: '#FFC0CB', plum: '#DDA0DD',
    powderblue: '#B0E0E6', purple: '#800080', rebeccapurple: '#663399',
    red: '#FF0000', rosybrown: '#BC8F8F', royalblue: '#4169E1',
    saddlebrown: '#8B4513', salmon: '#FA8072', sandybrown: '#F4A460',
    seagreen: '#2E8B57', seashell: '#FFF5EE', sienna: '#A0522D',
    silver: '#C0C0C0', skyblue: '#87CEEB', slateblue: '#6A5ACD',
    slategray: '#708090', slategrey: '#708090', snow: '#FFFAFA',
    springgreen: '#00FF7F', steelblue: '#4682B4', tan: '#D2B48C',
    teal: '#008080', thistle: '#D8BFD8', tomato: '#FF6347',
    turquoise: '#40E0D0', violet: '#EE82EE', wheat: '#F5DEB3',
    white: '#FFFFFF', whitesmoke: '#F5F5F5', yellow: '#FFFF00',
    yellowgreen: '#9ACD32',
};

function linToSrgb(c) {
    return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function srgbToLin(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

// ── Hex ↔ color space conversions ────────────────────────────────────────────

function hexToLinearRgb(hex) {
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!res) return null;
    return {
        r: srgbToLin(parseInt(res[1], 16) / 255),
        g: srgbToLin(parseInt(res[2], 16) / 255),
        b: srgbToLin(parseInt(res[3], 16) / 255),
    };
}

function linearRgbToOklab(lr) {
    const l = 0.41222 * lr.r + 0.53633 * lr.g + 0.05145 * lr.b;
    const m = 0.21190 * lr.r + 0.68070 * lr.g + 0.10740 * lr.b;
    const s = 0.08830 * lr.r + 0.28172 * lr.g + 0.62998 * lr.b;
    const l_ = Math.cbrt(Math.max(0, l));
    const m_ = Math.cbrt(Math.max(0, m));
    const s_ = Math.cbrt(Math.max(0, s));
    return {
        L:  0.21045 * l_ + 0.79362 * m_ - 0.00407 * s_,
        a:  1.97799 * l_ - 2.42859 * m_ + 0.45059 * s_,
        b:  0.02590 * l_ + 0.78277 * m_ - 0.80868 * s_,
    };
}

function oklabToOklch({ L, a, b }) {
    let H = Math.atan2(b, a) * (180 / Math.PI);
    if (H < 0) H += 360;
    return { L, C: Math.sqrt(a * a + b * b), H };
}

function oklchToOklab({ L, C, H }) {
    const hRad = H * Math.PI / 180;
    return { L, a: C * Math.cos(hRad), b: C * Math.sin(hRad) };
}

function oklabToLinearRgb(L, a, b) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    return {
        r:  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    };
}

function linearRgbToHex(r, g, b) {
    const rr = Math.round(clamp(linToSrgb(r), 0, 1) * 255);
    const gg = Math.round(clamp(linToSrgb(g), 0, 1) * 255);
    const bb = Math.round(clamp(linToSrgb(b), 0, 1) * 255);
    const toHex = (v) => v.toString(16).padStart(2, '0').toUpperCase();
    return '#' + toHex(rr) + toHex(gg) + toHex(bb);
}

// ── Gamut utilities ───────────────────────────────────────────────────────────

function isInSrgbGamut(L, C, H) {
    const hRad = H * Math.PI / 180;
    const { r, g, b } = oklabToLinearRgb(L, C * Math.cos(hRad), C * Math.sin(hRad));
    const ε = 0.001;
    return r >= -ε && r <= 1 + ε && g >= -ε && g <= 1 + ε && b >= -ε && b <= 1 + ε;
}

function oklchValuesToHex(L, C, H) {
    const hRad = H * Math.PI / 180;
    const { r, g, b } = oklabToLinearRgb(L, C * Math.cos(hRad), C * Math.sin(hRad));
    return linearRgbToHex(r, g, b);
}

export function resolveOklch(L, C, H, gamutPolicy = 'clip-chroma') {
    let mappedC = C;
    let gamutMapped = false;
    if (!isInSrgbGamut(L, C, H)) {
        gamutMapped = true;
        if (gamutPolicy === 'clip-chroma') {
            let lo = 0, hi = C;
            for (let i = 0; i < 20; i++) {
                const mid = (lo + hi) / 2;
                if (isInSrgbGamut(L, mid, H)) lo = mid; else hi = mid;
            }
            mappedC = parseFloat(lo.toFixed(4));
        }
        // clip-srgb: linearRgbToHex already clamps each channel
    }
    return { L, C: mappedC, H, hex: oklchValuesToHex(L, mappedC, H), gamutMapped };
}

export function flattenOver(colorStr, bgHex) {
    if (!colorStr || !bgHex) return null;
    const trimmed = colorStr.trim();
    if (!/^rgba?\(/i.test(trimmed)) return null;
    const inner = trimmed.replace(/^rgba?\(/, '').replace(/\)$/, '').trim();
    const parts = inner.split(',').map(s => s.trim());
    if (parts.length < 4) return null;
    const alpha = parseFloat(parts[3]);
    if (isNaN(alpha) || alpha >= 1) return null;
    const toVal = v => /%$/.test(v) ? Math.round(parseFloat(v) * 2.55) : parseInt(v, 10);
    const fgR = clamp(toVal(parts[0]), 0, 255);
    const fgG = clamp(toVal(parts[1]), 0, 255);
    const fgB = clamp(toVal(parts[2]), 0, 255);
    const bg = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(bgHex);
    if (!bg) return null;
    const toHex = v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0').toUpperCase();
    return '#'
        + toHex(fgR * alpha + parseInt(bg[1], 16) * (1 - alpha))
        + toHex(fgG * alpha + parseInt(bg[2], 16) * (1 - alpha))
        + toHex(fgB * alpha + parseInt(bg[3], 16) * (1 - alpha));
}

// ── color-mix() implementation ────────────────────────────────────────────────

// Split a string at top-level commas (ignoring commas inside parentheses).
function splitAtTopLevelComma(str) {
    const parts = [];
    let depth = 0, current = '';
    for (const ch of str) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (ch === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
            continue;
        }
        current += ch;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

// Parse one color-mix() argument: "color [pct%]?" or "[pct%]? color".
function parseColorArg(arg) {
    const trailing = arg.match(/^(.*)\s+([\d.]+)%\s*$/);
    if (trailing) return { colorStr: trailing[1].trim(), pct: parseFloat(trailing[2]) };
    const leading = arg.match(/^([\d.]+)%\s+(.*?)\s*$/);
    if (leading) return { colorStr: leading[2].trim(), pct: parseFloat(leading[1]) };
    return { colorStr: arg.trim(), pct: null };
}

function mixColors(hex1, w1, hex2, w2, colorspace) {
    if (colorspace === 'oklch') {
        const c1 = oklabToOklch(linearRgbToOklab(hexToLinearRgb(hex1)));
        const c2 = oklabToOklch(linearRgbToOklab(hexToLinearRgb(hex2)));
        let h1 = c1.H, h2 = c2.H;
        // Powerless hue: achromatic colors carry the other color's hue.
        if (c1.C < 0.001) h1 = h2;
        else if (c2.C < 0.001) h2 = h1;
        else {
            // Shorter-arc hue interpolation (CSS default).
            const delta = h2 - h1;
            if (delta > 180) h1 += 360;
            else if (delta < -180) h2 += 360;
        }
        const mixed = oklchToOklab({
            L: c1.L * w1 + c2.L * w2,
            C: c1.C * w1 + c2.C * w2,
            H: ((h1 * w1 + h2 * w2) % 360 + 360) % 360,
        });
        const { r, g, b } = oklabToLinearRgb(mixed.L, mixed.a, mixed.b);
        return linearRgbToHex(r, g, b);
    }

    if (colorspace === 'oklab') {
        const c1 = linearRgbToOklab(hexToLinearRgb(hex1));
        const c2 = linearRgbToOklab(hexToLinearRgb(hex2));
        const { r, g, b } = oklabToLinearRgb(
            c1.L * w1 + c2.L * w2,
            c1.a * w1 + c2.a * w2,
            c1.b * w1 + c2.b * w2,
        );
        return linearRgbToHex(r, g, b);
    }

    if (colorspace === 'srgb-linear') {
        const c1 = hexToLinearRgb(hex1);
        const c2 = hexToLinearRgb(hex2);
        return linearRgbToHex(
            c1.r * w1 + c2.r * w2,
            c1.g * w1 + c2.g * w2,
            c1.b * w1 + c2.b * w2,
        );
    }

    if (colorspace === 'srgb') {
        // Mix in gamma-encoded sRGB (CSS spec default behaviour for 'srgb').
        const res1 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex1);
        const res2 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex2);
        if (!res1 || !res2) return null;
        const r = parseInt(res1[1], 16) / 255 * w1 + parseInt(res2[1], 16) / 255 * w2;
        const g = parseInt(res1[2], 16) / 255 * w1 + parseInt(res2[2], 16) / 255 * w2;
        const b = parseInt(res1[3], 16) / 255 * w1 + parseInt(res2[3], 16) / 255 * w2;
        const toHex = v => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0').toUpperCase();
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }

    return null; // unsupported color space
}

function parseColorMix(str) {
    // color-mix(in <colorspace>, <color1> [<pct>]?, <color2> [<pct>]?)
    const inner = str.replace(/^color-mix\(\s*/i, '').replace(/\s*\)$/, '').trim();

    const inMatch = inner.match(/^in\s+([a-z-]+)\s*,\s*/i);
    if (!inMatch) return null;

    const colorspace = inMatch[1].toLowerCase();
    const rest = inner.slice(inMatch[0].length);
    const args = splitAtTopLevelComma(rest);
    if (args.length !== 2) return null;

    const a1 = parseColorArg(args[0]);
    const a2 = parseColorArg(args[1]);

    // Normalise weights per CSS spec.
    let w1 = a1.pct !== null ? a1.pct / 100 : (a2.pct !== null ? 1 - a2.pct / 100 : 0.5);
    let w2 = a2.pct !== null ? a2.pct / 100 : (a1.pct !== null ? 1 - a1.pct / 100 : 0.5);
    const sum = w1 + w2;
    if (sum > 0 && Math.abs(sum - 1) > 0.0001) { w1 /= sum; w2 /= sum; }

    // Recursive: each color argument can itself be any supported format.
    const hex1 = parseToHex(a1.colorStr);
    const hex2 = parseToHex(a2.colorStr);
    if (!hex1 || !hex2) return null;

    return mixColors(hex1, w1, hex2, w2, colorspace);
}

// ── Input parsers ─────────────────────────────────────────────────────────────

function parseHex(str) {
    let s = str.replace(/^#/, '');
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    if (s.length === 6) return '#' + s.toUpperCase();
    return null;
}

function parseRgbToHex(str) {
    const inner = str.replace(/^rgba?\(/, '').replace(/\)$/, '').trim();
    const parts = inner.split(',').map(s => s.trim());

    if (parts.length >= 4) {
        const alpha = parseFloat(parts[3]);
        if (!isNaN(alpha) && alpha < 1) {
            throw new Error(
                `Translucent color not supported: '${str}'\n` +
                `  Alpha ${alpha} cannot be evaluated without a compositing background.\n` +
                `  Provide the fully composited opaque color instead.`
            );
        }
    }

    const toVal = (v) => {
        if (/%$/.test(v)) return Math.round(parseFloat(v) * 2.55);
        return parseInt(v, 10);
    };

    const r = clamp(toVal(parts[0]), 0, 255);
    const g = clamp(toVal(parts[1]), 0, 255);
    const b = clamp(toVal(parts[2]), 0, 255);

    const toHex = (v) => Math.round(v).toString(16).padStart(2, '0').toUpperCase();
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

function extractSpaceSeparated(str) {
    const inner = str.replace(/^[a-z]+\(/, '').replace(/\)$/, '').trim();
    const parts = [];
    let current = '';
    let inSlash = false;
    for (const ch of inner) {
        if (ch === '/') { inSlash = true; continue; }
        if (inSlash) break;
        if (ch === ' ' || ch === ',') {
            if (current) { parts.push(current); current = ''; }
        } else {
            current += ch;
        }
    }
    if (current) parts.push(current);
    return parts;
}

function parseOklabToHex(str) {
    const parts = extractSpaceSeparated(str);
    const toVal = (v) => {
        if (/%$/.test(v)) return parseFloat(v) / 100;
        return parseFloat(v);
    };
    const L = clamp(toVal(parts[0]), 0, 1);
    const a = toVal(parts[1]) || 0;
    const b = toVal(parts[2]) || 0;
    const { r, g, b: bb } = oklabToLinearRgb(L, a, b);
    return linearRgbToHex(r, g, bb);
}

function parseOklchToHex(str) {
    const parts = extractSpaceSeparated(str);
    const toVal = (v) => {
        if (/%$/.test(v)) return parseFloat(v) / 100;
        return parseFloat(v);
    };
    const L = clamp(toVal(parts[0]), 0, 1);
    const c = toVal(parts[1]) || 0;
    const h = toVal(parts[2]) || 0;
    const hRad = h * Math.PI / 180;
    const a = c * Math.cos(hRad);
    const b = c * Math.sin(hRad);
    const { r, g, b: bb } = oklabToLinearRgb(L, a, b);
    return linearRgbToHex(r, g, bb);
}

export function parseToHex(colorStr) {
    if (!colorStr) return null;
    const trimmed = colorStr.trim();

    const named = NAMED_COLORS[trimmed.toLowerCase()];
    if (named) return named;

    if (/^color-mix\(/i.test(trimmed)) {
        return parseColorMix(trimmed);
    }

    if (/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.test(trimmed)) {
        return parseHex(trimmed);
    }

    if (/^rgba?\(/i.test(trimmed)) {
        return parseRgbToHex(trimmed);
    }

    if (/^oklch\(/i.test(trimmed)) {
        return parseOklchToHex(trimmed);
    }

    if (/^oklab\(/i.test(trimmed)) {
        return parseOklabToHex(trimmed);
    }

    return null;
}
