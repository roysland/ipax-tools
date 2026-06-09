import { hexToOklch } from './ipax-color-math.js';
import { parseToHex } from './parse-color.js';

// Machado et al. 2009 — severity=1.0 (full dichromacy)
// sRGB linear → LMS (Smith & Pokorny cone fundamentals)
const M_RGB_LMS = [
    [17.8824,    43.5161,   4.11935  ],
    [ 3.45565,   27.1554,   3.86714  ],
    [ 0.0299566,  0.184309,  1.46709 ],
];

// LMS → sRGB linear (inverse of M_RGB_LMS)
const M_LMS_RGB = [
    [ 0.0809444479,  -0.130504409,    0.116721066  ],
    [-0.0102485335,   0.0540193266,  -0.113614708  ],
    [-0.000365296938, -0.00412161469,  0.693511405 ],
];

// Dichromatic projection matrices in LMS space
const M_CVD = {
    protanopia: [   // L-cone absent — red/green confusion
        [0.0,      2.02344, -2.52581],
        [0.0,      1.0,      0.0   ],
        [0.0,      0.0,      1.0   ],
    ],
    deuteranopia: [ // M-cone absent — red/green confusion
        [1.0,      0.0,     0.0    ],
        [0.494207, 0.0,     1.24827],
        [0.0,      0.0,     1.0    ],
    ],
};

function srgbToLin(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linToSrgb(c) {
    const v = Math.max(0, Math.min(1, c));
    return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

function mat3(M, v) {
    return [
        M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
        M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
        M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2],
    ];
}

function simulateCVD(hex, type) {
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!res) return hex;

    const lin = [
        srgbToLin(parseInt(res[1], 16) / 255),
        srgbToLin(parseInt(res[2], 16) / 255),
        srgbToLin(parseInt(res[3], 16) / 255),
    ];

    const lmsSim = mat3(M_CVD[type], mat3(M_RGB_LMS, lin));
    const linSim = mat3(M_LMS_RGB, lmsSim);

    const h = v => Math.round(linToSrgb(v) * 255).toString(16).padStart(2, '0');
    return '#' + h(linSim[0]) + h(linSim[1]) + h(linSim[2]);
}

function deltaE(a, b) {
    const dL = (b.l - a.l) * 100;
    const dC = (b.c - a.c) * 100;

    let dh = ((b.h - a.h) % 360 + 360) % 360;
    if (dh > 180) dh -= 360;
    // Chord distance: geometric mean chroma attenuates hue at low saturation
    const dH = 2 * Math.sqrt(a.c * b.c) * 100 * Math.sin((dh * Math.PI / 180) / 2);

    return Math.sqrt(dL*dL + dC*dC + dH*dH);
}

function fmtOklch(o) {
    return [parseFloat(o.l.toFixed(4)), parseFloat(o.c.toFixed(4)), parseFloat(o.h.toFixed(1))];
}

export function runPalette(argv) {
    const args = argv.slice(1);

    function removeFlag(flag) {
        const i = args.indexOf(flag);
        if (i === -1) return false;
        args.splice(i, 1);
        return true;
    }
    function removeFlagValue(flag) {
        const i = args.indexOf(flag);
        if (i === -1) return null;
        if (!args[i + 1] || args[i + 1].startsWith('-')) {
            console.error(`Error: ${flag} requires a value`); process.exit(1);
        }
        return args.splice(i, 2)[1];
    }

    const threshold = parseFloat(removeFlagValue('--threshold') ?? '25');
    const outputFmt = removeFlagValue('--output') ?? 'json';
    const noCvd     = removeFlag('--no-cvd');

    if (isNaN(threshold) || threshold <= 0) {
        console.error('Error: --threshold must be a positive number'); process.exit(1);
    }

    const colorStrs = args.filter(a => !a.startsWith('-'));
    if (colorStrs.length < 2) {
        console.error('Error: ipax palette requires at least 2 colors');
        console.error('Usage: ipax palette <color1> <color2> [color3...] [--threshold <n>] [--no-cvd] [--output json|pretty]');
        process.exit(1);
    }

    const colors = colorStrs.map((s, i) => {
        const hex = parseToHex(s);
        if (!hex) {
            console.error(`Error: could not parse color ${i + 1}: ${s}`); process.exit(2);
        }
        return { input: s, hex, oklch: hexToOklch(hex) };
    });

    const N = colors.length;
    const cvdTypes = noCvd ? [] : ['deuteranopia', 'protanopia'];
    const pairs = [];

    for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
            const de_normal = deltaE(colors[i].oklch, colors[j].oklch);

            const pair = {
                i, j,
                a: { hex: colors[i].hex, oklch: fmtOklch(colors[i].oklch) },
                b: { hex: colors[j].hex, oklch: fmtOklch(colors[j].oklch) },
                delta:   { normal: parseFloat(de_normal.toFixed(2)) },
                conflict: { normal: de_normal < threshold },
            };

            for (const type of cvdTypes) {
                const simA = simulateCVD(colors[i].hex, type);
                const simB = simulateCVD(colors[j].hex, type);
                const de   = deltaE(hexToOklch(simA), hexToOklch(simB));
                pair.delta[type]    = parseFloat(de.toFixed(2));
                pair.conflict[type] = de < threshold;
            }

            pairs.push(pair);
        }
    }

    const conflicts = pairs.filter(p => Object.values(p.conflict).some(Boolean));

    const conflictCounts = { normal: 0 };
    for (const type of cvdTypes) conflictCounts[type] = 0;
    for (const p of pairs) {
        for (const [k, v] of Object.entries(p.conflict)) {
            if (v) conflictCounts[k] = (conflictCounts[k] || 0) + 1;
        }
    }

    const result = {
        palette:   colors.map(c => ({ input: c.input, hex: c.hex, oklch: fmtOklch(c.oklch) })),
        threshold,
        pairs,
        conflicts,
        summary:   { colors: N, pairs: pairs.length, threshold, conflicts: conflictCounts },
    };

    if (outputFmt === 'pretty') {
        printPalettePretty(result, cvdTypes);
    } else {
        console.log(JSON.stringify(result, null, 2));
    }
}

function printPalettePretty(result, cvdTypes) {
    const { summary, pairs } = result;
    const types = ['normal', ...cvdTypes];

    console.log(`Palette: ${summary.colors} colors  |  ${summary.pairs} pairs  |  ΔE threshold < ${summary.threshold}`);
    console.log('');

    for (const type of types) {
        const label = type === 'normal'
            ? 'Normal Vision'
            : type.charAt(0).toUpperCase() + type.slice(1);
        const count  = summary.conflicts[type] || 0;
        const status = count === 0 ? '✓ no conflicts' : `✗ ${count} conflict${count !== 1 ? 's' : ''}`;

        console.log(`${label}  [${status}]`);
        for (const p of pairs) {
            const de      = p.delta[type];
            const conflict = p.conflict[type];
            const mark    = conflict ? '✗' : ' ';
            const flag    = conflict ? '  ← CONFLICT' : '';
            console.log(`  ${mark}  ${p.a.hex}  ↔  ${p.b.hex}  ΔE ${de.toFixed(1)}${flag}`);
        }
        console.log('');
    }
}
