import { getIPAXscore, hexToOklch } from '@ipax/core';
import { resolveOklch, parseToHex } from './parse-color.js';

// ── Utilities ─────────────────────────────────────────────────────────────────

function arange(lo, hi, step) {
    const out = [];
    for (let v = lo; v <= hi + 1e-9; v = parseFloat((v + step).toFixed(6)))
        out.push(parseFloat(v.toFixed(4)));
    return out;
}

function parseRange(str, defLo, defHi) {
    if (!str) return [defLo, defHi];
    const p = str.split(',').map(Number);
    return p.length === 2 && !p.some(isNaN) ? p : [defLo, defHi];
}

// ── Grid search ───────────────────────────────────────────────────────────────

function gridSearch(H, opts) {
    const {
        loL = 0.05, hiL = 0.95, stepL = 0.05,  // bg lightness range
        txtLoL = 0.05, txtHiL = 0.95,            // text lightness range (defaults to full)
        loC = 0.00, hiC = 0.40, stepC = 0.02,
        minScore = 3, maxScore = Infinity,
        maxCount = 3, context = null, fontWt = 400,
        gamutPolicy = 'clip-chroma', maxCalls = 200000,
        sortBy = 'score',
    } = opts;

    const bgLVals  = arange(loL, hiL, stepL);
    const txtLVals = arange(txtLoL, txtHiL, stepL);
    const cVals    = arange(loC, hiC, stepC);
    const hits = [];
    let calls = 0;

    outer:
    for (const bgL of bgLVals) {
        for (const bgC of cVals) {
            const bg = resolveOklch(bgL, bgC, H, gamutPolicy);
            for (const txtL of txtLVals) {
                if (Math.abs(txtL - bgL) < 0.25) continue;
                for (const txtC of cVals) {
                    if (++calls > maxCalls) break outer;
                    const txt = resolveOklch(txtL, txtC, H, gamutPolicy);
                    const ipax = getIPAXscore(txt.hex, bg.hex, context, fontWt);
                    if (ipax.score >= minScore && ipax.score <= maxScore) {
                        hits.push({ bg, txt, ipax });
                    }
                }
            }
        }
    }

    if (sortBy === 'comfort') {
        hits.sort((a, b) =>
            a.ipax.details.totalPenalty - b.ipax.details.totalPenalty ||
            b.ipax.score - a.ipax.score
        );
    } else {
        hits.sort((a, b) =>
            b.ipax.score - a.ipax.score || b.ipax.wcag.ratio - a.ipax.wcag.ratio
        );
    }

    return { hits: hits.slice(0, maxCount), calls, gridSteps: { L: bgLVals.length, C: cVals.length } };
}

// ── Color-mix hint ────────────────────────────────────────────────────────────

function colorMixHint(bgL, baseOklch) {
    if (!baseOklch) return null;
    const baseL = baseOklch.l;
    const EPSILON = 0.05;

    if (bgL > baseL + EPSILON) {
        const t = Math.max(0, Math.min(1, (bgL - baseL) / (1.0 - baseL)));
        const pct = Math.round((1 - t) * 20) * 5; // snap to nearest 5%
        return `color-mix(in oklch, var(--brand) ${pct}%, white)`;
    }
    if (bgL < baseL - EPSILON) {
        const t = Math.max(0, Math.min(1, (baseL - bgL) / baseL));
        const pct = Math.round((1 - t) * 20) * 5;
        return `color-mix(in oklch, var(--brand) ${pct}%, black)`;
    }
    return null;
}

// ── Result builder ────────────────────────────────────────────────────────────

function buildResult(rank, { bg, txt, ipax }, baseOklch) {
    const polarity = ipax.apca.lc >= 0 ? 'dark-on-light' : 'light-on-dark';
    return {
        rank,
        score: ipax.score,
        string: ipax.string,
        bg: {
            oklch: [bg.L, bg.C, bg.H],
            hex: bg.hex,
            Y: ipax.colors.bg.y,
        },
        text: {
            oklch: [txt.L, txt.C, txt.H],
            hex: txt.hex,
            Y: ipax.colors.text.y,
        },
        colorMix: colorMixHint(bg.L, baseOklch),
        apca: {
            lc: ipax.apca.lc,
            polarity,
            grade: ipax.apca.grade,
            txtY: ipax.colors.text.apcaY,
            bgY: ipax.colors.bg.apcaY,
        },
        wcag: { ratio: ipax.wcag.ratio, grade: ipax.wcag.grade },
        gamutMapped: bg.gamutMapped || txt.gamutMapped,
        usage: {
            sizePx: ipax.apca.font.sizePx,
            errorCode: ipax.apca.font.usage.errorCode,
            bodyTextAllowed: ipax.apca.font.usage.bodyTextAllowed,
        },
    };
}

// ── Variant search ────────────────────────────────────────────────────────────

function runVariants(H, baseOpts, variantKeys) {
    const out = {};

    if (variantKeys.includes('prefers-contrast')) {
        const moreOpts = { ...baseOpts, minScore: Math.min(5, baseOpts.minScore + 1) };
        out['prefers-contrast:more'] = gridSearch(H, moreOpts).hits;

        // 'less' targets below baseline; sort by ergonomic comfort (fewer penalties)
        const lessTarget = Math.max(0.5, baseOpts.minScore - 1.5);
        const lessOpts = {
            ...baseOpts,
            minScore: lessTarget,
            maxScore: baseOpts.minScore - 0.1,
            sortBy: 'comfort',
        };
        out['prefers-contrast:less'] = gridSearch(H, lessOpts).hits;
    }

    if (variantKeys.includes('prefers-color-scheme')) {
        // Dark: restrict backgrounds to L ≤ 0.40; text can range freely upward
        const darkOpts = {
            ...baseOpts,
            loL: 0.05, hiL: 0.40,
            txtLoL: 0.60, txtHiL: 0.95,
            context: 'dark',
        };
        const darkHits = gridSearch(H, darkOpts).hits;
        out['prefers-color-scheme:dark'] = darkHits;

        if (variantKeys.includes('prefers-contrast')) {
            const darkMoreOpts = { ...darkOpts, minScore: Math.min(5, baseOpts.minScore + 1) };
            out['prefers-color-scheme:dark+prefers-contrast:more'] = gridSearch(H, darkMoreOpts).hits;
        }
    }

    if (variantKeys.includes('prefers-reduced-transparency')) {
        // Informational flag: the find command always emits opaque colors,
        // but callers that use color-mix() with alpha need solid fallbacks.
        // The results here are the same as baseline (already opaque).
        out['prefers-reduced-transparency'] = baseOpts._baseHits ?? [];
    }

    return out;
}

// ── Output formatters ─────────────────────────────────────────────────────────

function toJson(query, results, variants, meta) {
    const out = {
        query,
        results: results.map((h, i) => buildResult(i + 1, h, meta.baseOklch)),
        meta: {
            gridSteps: meta.gridSteps,
            calls: meta.calls,
            gamutPolicy: meta.gamutPolicy,
            alphaPolicy: 'reject',
        },
    };
    if (Object.keys(variants).length > 0) {
        out.variants = {};
        for (const [key, hits] of Object.entries(variants)) {
            out.variants[key] = hits.map((h, i) => buildResult(i + 1, h, meta.baseOklch));
        }
    }
    return JSON.stringify(out, null, 2);
}

function oklchStr(arr) {
    return `oklch(${arr[0]} ${arr[1]} ${arr[2]})`;
}

function cssBlock(selector, result, indent = '') {
    const r = buildResult(0, result, null); // no colorMix needed for CSS block
    return [
        `${indent}${selector} {`,
        `${indent}  --bg:   ${oklchStr(r.bg.oklch)};`,
        `${indent}  --text: ${oklchStr(r.text.oklch)};`,
        `${indent}}`,
    ].join('\n');
}

function toCss(query, results, variants, meta) {
    const baseOklch = meta.baseOklch;
    const lines = [`/* ipax find  H:${query.h}  target:${query.target} */`, ''];

    if (results.length === 0) {
        lines.push('/* No results found meeting the target score. */');
        return lines.join('\n');
    }

    const r0 = buildResult(1, results[0], baseOklch);
    lines.push(`/* Baseline  IPAX ${r0.score}  ${r0.wcag.grade}  APCA ${r0.apca.grade}  ${r0.apca.polarity} */`);
    if (r0.colorMix) lines.push(`/* bg mix:   ${r0.colorMix} */`);
    lines.push(`:root {`);
    lines.push(`  --bg:   ${oklchStr(r0.bg.oklch)};`);
    lines.push(`  --text: ${oklchStr(r0.text.oklch)};`);
    lines.push(`}`);

    const mediaMap = {
        'prefers-contrast:more':                 '@media (prefers-contrast: more)',
        'prefers-contrast:less':                 '@media (prefers-contrast: less)',
        'prefers-color-scheme:dark':             '@media (prefers-color-scheme: dark)',
        'prefers-color-scheme:dark+prefers-contrast:more':
            '@media (prefers-color-scheme: dark) and (prefers-contrast: more)',
        'prefers-reduced-transparency':          '@media (prefers-reduced-transparency)',
    };

    for (const [key, hits] of Object.entries(variants)) {
        if (!hits.length) continue;
        const media = mediaMap[key] || `@media (${key})`;
        const vr = buildResult(1, hits[0], baseOklch);
        const label = key.includes('less')
            ? `IPAX ${vr.score}  sub-WCAG, comfort-optimized`
            : `IPAX ${vr.score}  ${vr.wcag.grade}  APCA ${vr.apca.grade}`;
        lines.push('');
        lines.push(`${media} {`);
        lines.push(`  /* ${label} */`);
        if (vr.colorMix) lines.push(`  /* bg mix: ${vr.colorMix} */`);
        lines.push(`  :root {`);
        lines.push(`    --bg:   ${oklchStr(vr.bg.oklch)};`);
        lines.push(`    --text: ${oklchStr(vr.text.oklch)};`);
        lines.push(`  }`);
        lines.push(`}`);
    }

    return lines.join('\n');
}

function toPretty(query, results, variants, meta) {
    const baseOklch = meta.baseOklch;
    const lines = [
        `ipax find  H:${query.h}  target ≥ ${query.target}  found ${results.length}`,
        '',
    ];

    for (let i = 0; i < results.length; i++) {
        const r = buildResult(i + 1, results[i], baseOklch);
        lines.push(`Rank ${r.rank}  IPAX ${r.score}  ${r.wcag.grade}  APCA ${r.apca.grade}  (${r.apca.polarity})`);
        lines.push(`  bg:    ${oklchStr(r.bg.oklch)}  →  ${r.bg.hex}`);
        lines.push(`  text:  ${oklchStr(r.text.oklch)}  →  ${r.text.hex}`);
        if (r.colorMix) lines.push(`  mix:   ${r.colorMix}`);
        lines.push(`  size:  ${r.usage.sizePx != null ? r.usage.sizePx + 'px' : 'N/A'}${r.usage.errorCode ? '  (' + r.usage.errorCode + ')' : ''}`);
        if (r.gamutMapped) lines.push(`  note:  gamut-mapped`);
        lines.push('');
    }

    if (Object.keys(variants).length > 0) {
        lines.push('── Variants ─────────────────────────────────────────────');
        for (const [key, hits] of Object.entries(variants)) {
            if (!hits.length) { lines.push(`\n${key}:  no results`); continue; }
            const vr = buildResult(1, hits[0], baseOklch);
            const note = key.includes('less') ? '  [sub-WCAG, comfort]' : '';
            lines.push(`\n${key}:`);
            lines.push(`  IPAX ${vr.score}  ${vr.wcag.grade}  APCA ${vr.apca.grade}${note}`);
            lines.push(`  bg:   ${oklchStr(vr.bg.oklch)}  →  ${vr.bg.hex}`);
            lines.push(`  text: ${oklchStr(vr.text.oklch)}  →  ${vr.text.hex}`);
            if (vr.colorMix) lines.push(`  mix:  ${vr.colorMix}`);
        }
    }

    lines.push(`\n(${meta.calls} pairs evaluated)`);
    return lines.join('\n');
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function runFind(argv) {
    // argv is process.argv.slice(2) with 'find' already confirmed at [0]
    const args = argv.slice(1); // drop 'find'

    function removeFlag(flag) {
        const idx = args.indexOf(flag);
        if (idx === -1) return false;
        args.splice(idx, 1);
        return true;
    }
    function removeFlagValue(flag) {
        const idx = args.indexOf(flag);
        if (idx === -1) return null;
        const val = args[idx + 1];
        if (val === undefined || val.startsWith('-')) {
            console.error(`Error: ${flag} requires a value`);
            process.exit(1);
        }
        args.splice(idx, 2);
        return val;
    }

    const outputFmt  = removeFlagValue('--output') || 'json';
    const baseStr    = removeFlagValue('--base');
    const targetStr  = removeFlagValue('--target');
    const countStr   = removeFlagValue('--count');
    const rangeL     = removeFlagValue('--rangeL');
    const rangeC     = removeFlagValue('--rangeC');
    const stepLStr   = removeFlagValue('--stepL');
    const stepCStr   = removeFlagValue('--stepC');
    const variantStr = removeFlagValue('--variants');
    const contextStr = removeFlagValue('--context');
    const weightStr  = removeFlagValue('--weight');
    const policyStr  = removeFlagValue('--gamut-policy');
    const maxCallStr = removeFlagValue('--max-calls');

    // Positional: H value
    const H = parseFloat(args[0]);
    if (isNaN(H) || H < 0 || H > 360) {
        console.error('Error: find requires a hue value H in degrees (0–360)');
        process.exit(1);
    }

    const [loL, hiL] = parseRange(rangeL, 0.05, 0.95);
    const [loC, hiC] = parseRange(rangeC, 0.00, 0.40);
    const stepL   = Math.max(0.01, parseFloat(stepLStr  || '0.05'));
    const stepC   = Math.max(0.01, parseFloat(stepCStr  || '0.02'));
    const target  = parseFloat(targetStr || '3');
    const count   = parseInt(countStr   || '3', 10);
    const fontWt  = parseInt(weightStr  || '400', 10);
    const policy  = (policyStr === 'clip-srgb') ? 'clip-srgb' : 'clip-chroma';
    const maxCalls = parseInt(maxCallStr || '200000', 10);

    const variantKeys = variantStr
        ? variantStr.split(',').map(s => s.trim())
        : [];

    // Parse base color for colorMix hints
    let baseOklch = null;
    if (baseStr) {
        const baseHex = parseToHex(baseStr);
        if (!baseHex) {
            console.error(`Error: could not parse --base color: ${baseStr}`);
            process.exit(2);
        }
        baseOklch = hexToOklch(baseHex);
    }

    const baseOpts = {
        loL, hiL, stepL, loC, hiC, stepC,
        minScore: target, maxCount: count,
        context: contextStr ?? null,
        fontWt, gamutPolicy: policy, maxCalls,
    };

    const { hits, calls, gridSteps } = gridSearch(H, baseOpts);

    const variants = variantKeys.length
        ? runVariants(H, { ...baseOpts, _baseHits: hits }, variantKeys)
        : {};

    if (hits.length === 0) {
        if (outputFmt === 'json') {
            console.log(JSON.stringify({
                query: { h: H, base: baseStr ?? null, target, count },
                results: [],
                meta: { gridSteps, calls, gamutPolicy: policy, alphaPolicy: 'reject' },
            }, null, 2));
        } else {
            console.error(`No results found for H:${H} at target ≥ ${target}`);
        }
        process.exit(3);
    }

    const query = { h: H, base: baseStr ?? null, target, count };
    const meta  = { baseOklch, gridSteps, calls, gamutPolicy: policy };

    if (outputFmt === 'css') {
        console.log(toCss(query, hits, variants, meta));
    } else if (outputFmt === 'pretty') {
        console.log(toPretty(query, hits, variants, meta));
    } else {
        console.log(toJson(query, hits, variants, meta));
    }
}
