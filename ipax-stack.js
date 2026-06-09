import { getIPAXscore } from './ipax-core.js';
import { parseToHex, flattenOver } from './parse-color.js';

function compositeLayer(colorStr, bgHex) {
    const flattened = flattenOver(colorStr, bgHex);
    if (flattened) return { hex: flattened, composited: true };
    const hex = parseToHex(colorStr);
    if (!hex) return null;
    return { hex, composited: false };
}

function scoreLayer(fgHex, bgHex, context, weight, mode) {
    const r = getIPAXscore(fgHex, bgHex, context, weight, mode);
    return { score: r.score, wcag: r.wcag, apca: r.apca };
}

export function runStack(argv) {
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

    const canvasStr       = removeFlagValue('--canvas');
    const surfaceStr      = removeFlagValue('--surface');
    const fgStr           = removeFlagValue('--fg');
    const surfaceHoverStr = removeFlagValue('--surface-hover');
    const fgHoverStr      = removeFlagValue('--fg-hover');
    const contextStr      = removeFlagValue('--context');
    const weightStr       = removeFlagValue('--weight');
    const modeStr         = removeFlagValue('--mode') ?? 'text';
    const outputFmt       = removeFlagValue('--output') ?? 'json';

    if (!canvasStr || !surfaceStr || !fgStr) {
        console.error('Error: ipax stack requires --canvas, --surface, and --fg');
        console.error('Usage: ipax stack --canvas <color> --surface <color> --fg <color> [--surface-hover <color>] [--fg-hover <color>] [options]');
        process.exit(1);
    }

    if (contextStr !== null && contextStr !== 'dark' && contextStr !== 'light') {
        console.error('Error: --context must be "dark" or "light"'); process.exit(1);
    }

    const fontWeight = weightStr ? parseInt(weightStr, 10) : 400;

    // Canvas must be opaque — it is the absolute base
    const canvasHex = parseToHex(canvasStr);
    if (!canvasHex) {
        console.error(`Error: could not parse --canvas: ${canvasStr}`); process.exit(2);
    }

    const surfaceResult = compositeLayer(surfaceStr, canvasHex);
    if (!surfaceResult) {
        console.error(`Error: could not parse --surface: ${surfaceStr}`); process.exit(2);
    }

    const fgResult = compositeLayer(fgStr, surfaceResult.hex);
    if (!fgResult) {
        console.error(`Error: could not parse --fg: ${fgStr}`); process.exit(2);
    }

    const layers = {
        canvas:  { input: canvasStr,  effective: canvasHex,         composited: false },
        surface: { input: surfaceStr, effective: surfaceResult.hex,  composited: surfaceResult.composited },
        fg:      { input: fgStr,      effective: fgResult.hex,       composited: fgResult.composited },
    };

    const scores = {
        fg_over_surface: scoreLayer(fgResult.hex, surfaceResult.hex, contextStr, fontWeight, modeStr),
        fg_over_canvas:  scoreLayer(fgResult.hex, canvasHex,         contextStr, fontWeight, modeStr),
    };

    const result = { layers, scores };

    if (surfaceHoverStr || fgHoverStr) {
        const surfaceHover = surfaceHoverStr
            ? compositeLayer(surfaceHoverStr, canvasHex)
            : { hex: surfaceResult.hex, composited: false };
        if (!surfaceHover) {
            console.error(`Error: could not parse --surface-hover: ${surfaceHoverStr}`); process.exit(2);
        }

        // Re-composite fg over the hover surface (even if fg itself didn't change)
        const fgHover = fgHoverStr
            ? compositeLayer(fgHoverStr, surfaceHover.hex)
            : compositeLayer(fgStr, surfaceHover.hex);
        if (!fgHover) {
            console.error(`Error: could not parse --fg-hover: ${fgHoverStr || fgStr}`); process.exit(2);
        }

        const hoverScores = {
            fg_over_surface: scoreLayer(fgHover.hex, surfaceHover.hex, contextStr, fontWeight, modeStr),
            fg_over_canvas:  scoreLayer(fgHover.hex, canvasHex,        contextStr, fontWeight, modeStr),
        };

        const deltaFgSurface = parseFloat((hoverScores.fg_over_surface.score - scores.fg_over_surface.score).toFixed(2));
        const deltaFgCanvas  = parseFloat((hoverScores.fg_over_canvas.score  - scores.fg_over_canvas.score).toFixed(2));

        result.hover = {
            layers: {
                canvas:  layers.canvas,
                surface: { input: surfaceHoverStr || surfaceStr, effective: surfaceHover.hex, composited: surfaceHover.composited },
                fg:      { input: fgHoverStr      || fgStr,      effective: fgHover.hex,      composited: fgHover.composited },
            },
            scores: hoverScores,
            delta: {
                fg_over_surface: { scoreDelta: deltaFgSurface, degraded: deltaFgSurface < -0.4 },
                fg_over_canvas:  { scoreDelta: deltaFgCanvas,  degraded: deltaFgCanvas  < -0.4 },
            },
        };
    }

    if (outputFmt === 'pretty') {
        printStackPretty(result);
    } else {
        console.log(JSON.stringify(result, null, 2));
    }
}

function printStackPretty(result) {
    const { layers, scores, hover } = result;

    console.log('Layer Stack (rest):');
    console.log(`  Canvas:   ${layers.canvas.input}  →  ${layers.canvas.effective}`);
    console.log(`  Surface:  ${layers.surface.input}  →  ${layers.surface.effective}${layers.surface.composited ? '  (composited)' : ''}`);
    console.log(`  Fg:       ${layers.fg.input}  →  ${layers.fg.effective}${layers.fg.composited ? '  (composited)' : ''}`);
    console.log('');
    console.log('Scores (rest):');
    console.log(`  fg / surface:  IPAX ${scores.fg_over_surface.score}  WCAG ${scores.fg_over_surface.wcag.ratio}  (${scores.fg_over_surface.wcag.grade})`);
    console.log(`  fg / canvas:   IPAX ${scores.fg_over_canvas.score}  WCAG ${scores.fg_over_canvas.wcag.ratio}  (${scores.fg_over_canvas.wcag.grade})`);

    if (hover) {
        console.log('');
        console.log('Layer Stack (hover/focus):');
        console.log(`  Surface:  ${hover.layers.surface.input}  →  ${hover.layers.surface.effective}${hover.layers.surface.composited ? '  (composited)' : ''}`);
        console.log(`  Fg:       ${hover.layers.fg.input}  →  ${hover.layers.fg.effective}${hover.layers.fg.composited ? '  (composited)' : ''}`);
        console.log('');
        console.log('Scores (hover/focus):');
        const fmtDelta = (d) => (d > 0 ? '+' : '') + d;
        const flagS = hover.delta.fg_over_surface.degraded ? '  ← DEGRADED' : '';
        const flagC = hover.delta.fg_over_canvas.degraded  ? '  ← DEGRADED' : '';
        console.log(`  fg / surface:  IPAX ${hover.scores.fg_over_surface.score}  WCAG ${hover.scores.fg_over_surface.wcag.ratio}  (Δ ${fmtDelta(hover.delta.fg_over_surface.scoreDelta)})${flagS}`);
        console.log(`  fg / canvas:   IPAX ${hover.scores.fg_over_canvas.score}  WCAG ${hover.scores.fg_over_canvas.wcag.ratio}  (Δ ${fmtDelta(hover.delta.fg_over_canvas.scoreDelta)})${flagC}`);
    }
}
