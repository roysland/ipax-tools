#!/usr/bin/env node
import { readFileSync } from 'fs';
import { getIPAXscore } from './ipax-core.js';
import { parseToHex, flattenOver } from './parse-color.js';
import { runFind } from './ipax-find.js';
import { runPalette } from './ipax-palette.js';
import { runStack } from './ipax-stack.js';

function usage(exitCode = 1) {
    const out = exitCode === 0 ? console.log : console.error;
    out('Usage: ipax <background_color> <text_color> [options]');
    out('       ipax find <H> [options]');
    out('       ipax palette <color1> <color2> [color3...] [options]');
    out('       ipax stack --canvas <color> --surface <color> --fg <color> [options]');
    out('');
    out('Evaluate options:');
    out('  --output json|pretty     Output format (default: json)');
    out('  --pretty                 Alias for --output pretty');
    out('  --context dark|light     Override dark/light mode detection');
    out('  --weight <number>        Font weight for APCA sizing (default: 400)');
    out('  --mode text|graphical    Scoring mode (default: text)');
    out('  --flatten-over <color>   Composite rgba() alpha over this color');
    out('  --token-file <path>      JSON token file for var(token-name) resolution');
    out('');
    out('Find options:');
    out('  find <H>                 Search hue (0–360 degrees)');
    out('  --base <color>           Bias colorMix hints around this color');
    out('  --target <score>         Minimum IPAX score (default: 3)');
    out('  --count <n>              Results to return (default: 3)');
    out('  --rangeL lo,hi           Lightness search range (default: 0.05,0.95)');
    out('  --rangeC lo,hi           Chroma search range (default: 0.00,0.40)');
    out('  --stepL <step>           Lightness step (default: 0.05)');
    out('  --stepC <step>           Chroma step (default: 0.02)');
    out('  --variants <list>        Comma-separated: prefers-contrast,prefers-color-scheme');
    out('  --gamut-policy <policy>  clip-chroma (default) or clip-srgb');
    out('  --max-calls <n>          Cap grid evaluations for CI (default: 200000)');
    out('  --output json|css|pretty Output format (default: json)');
    out('');
    out('Palette options:');
    out('  --threshold <n>          ΔE conflict threshold (default: 25)');
    out('  --no-cvd                 Skip CVD simulation (deuteranopia + protanopia)');
    out('  --output json|pretty     Output format (default: json)');
    out('');
    out('Stack options:');
    out('  --canvas <color>         Base layer (must be opaque)');
    out('  --surface <color>        Middle layer (composited over canvas)');
    out('  --fg <color>             Foreground (composited over surface)');
    out('  --surface-hover <color>  Hover/focus surface state');
    out('  --fg-hover <color>       Hover/focus fg state');
    out('  --mode text|graphical    Scoring mode (default: text)');
    out('  --output json|pretty     Output format (default: json)');
    out('');
    out('  --help, -h               Show this help');
    out('');
    out('Color formats: hex (#fff, #ffffff), rgb/rgba, oklab, oklch, CSS named colors,');
    out('               color-mix(in oklch|oklab|srgb|srgb-linear, ...)');
    out('Token syntax:  var(token-name) — resolved via --token-file tokens.json');
    out('');
    out('Exit codes: 0 success  1 general error  2 parse error  3 no results');
    out('');
    out('Examples:');
    out('  ipax #f0f0f0 #101010 --pretty');
    out('  ipax #f0f0f0 #101010 --mode graphical --pretty');
    out('  ipax "rgba(204,34,0,0.6)" white --flatten-over white');
    out('  ipax find 25 --target 3 --variants prefers-contrast,prefers-color-scheme --output css');
    out('  ipax palette "#e74c3c" "#3498db" "#2ecc71" "#f39c12" --output pretty');
    out('  ipax stack --canvas white --surface "rgba(0,0,0,0.05)" --fg #111 --surface-hover "rgba(0,0,0,0.1)" --output pretty');
    out('  ipax stack --canvas var(bg) --surface var(card) --fg var(text) --token-file tokens.json');
    process.exit(exitCode);
}

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) usage(0);

// ── Token file — resolve var() references before any subcommand sees the args ──

function loadTokenFile(path) {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (e) {
        console.error(`Error: could not load token file "${path}": ${e.message}`);
        process.exit(1);
    }
}

{
    const ti = args.indexOf('--token-file');
    if (ti !== -1) {
        if (!args[ti + 1] || args[ti + 1].startsWith('-')) {
            console.error('Error: --token-file requires a path'); process.exit(1);
        }
        const tokenMap = loadTokenFile(args.splice(ti, 2)[1]);
        for (let i = 0; i < args.length; i++) {
            const m = /^var\(\s*([^)\s]+)\s*\)$/i.exec(args[i]);
            if (m) {
                const val = tokenMap[m[1]];
                if (!val) {
                    console.error(`Error: token "${m[1]}" not found in token file`); process.exit(2);
                }
                args[i] = val;
            }
        }
    }
}

// ── Subcommand routing ────────────────────────────────────────────────────────

if (args[0] === 'find') {
    runFind(args);
    process.exit(0);
}

if (args[0] === 'palette') {
    runPalette(args);
    process.exit(0);
}

if (args[0] === 'stack') {
    runStack(args);
    process.exit(0);
}

// ── Evaluate command ──────────────────────────────────────────────────────────

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

const outputFlag  = removeFlagValue('--output');
const pretty      = removeFlag('--pretty') || outputFlag === 'pretty';
const contextStr  = removeFlagValue('--context');
const weightStr   = removeFlagValue('--weight');
const modeStr     = removeFlagValue('--mode') ?? 'text';
const flattenStr  = removeFlagValue('--flatten-over');
// Resolve named colors / oklch etc. to hex so flattenOver can composite
const flattenHex  = flattenStr ? parseToHex(flattenStr) : null;
if (flattenStr && !flattenHex) {
    console.error(`Error: could not parse --flatten-over color: ${flattenStr}`);
    process.exit(2);
}

if (contextStr !== null && contextStr !== 'dark' && contextStr !== 'light') {
    console.error('Error: --context must be "dark" or "light"');
    process.exit(1);
}

if (modeStr !== 'text' && modeStr !== 'graphical') {
    console.error('Error: --mode must be "text" or "graphical"');
    process.exit(1);
}

const fontWeight = weightStr !== null ? parseInt(weightStr, 10) : 400;
if (weightStr !== null && (isNaN(fontWeight) || fontWeight < 100 || fontWeight > 900)) {
    console.error('Error: --weight must be a number between 100 and 900');
    process.exit(1);
}

if (args.length < 2) usage();

let [bgStr, textStr] = args;

// Flatten semi-transparent inputs before parsing
if (flattenHex) {
    const flatBg = flattenOver(bgStr, flattenHex);
    if (flatBg) bgStr = flatBg;
    const flatTxt = flattenOver(textStr, flattenHex);
    if (flatTxt) textStr = flatTxt;
}

let bgHex, textHex;
try {
    bgHex   = parseToHex(bgStr);
    textHex = parseToHex(textStr);
} catch (e) {
    console.error('Error:', e.message);
    process.exit(2);
}
if (!bgHex || !textHex) {
    console.error('Error: could not parse one or both color values.');
    console.error('  Supported formats: hex, rgb/rgba, oklab, oklch, color-mix(), CSS named colors');
    process.exit(2);
}

try {
    const result = getIPAXscore(textHex, bgHex, contextStr, fontWeight, modeStr);

    if (pretty) {
        const activePenalties = result.details.penalties.filter(p => p.val > 0);
        const activeRewards   = result.details.rewards.filter(r => r.val > 0);
        const polarity = result.apca.lc >= 0 ? 'dark-on-light' : 'light-on-dark';

        const modeLabel = modeStr === 'graphical' ? '  [graphical / WCAG 1.4.11]' : '';
        console.log(`IPAX Score:  ${result.score}  (${result.string})${modeLabel}`);
        console.log(`Base Size:   ${result.apca.font.sizePx != null ? result.apca.font.sizePx + 'px' : 'N/A'}`);
        console.log(`APCA Lc:     ${result.apca.lc}  (${polarity})`);
        console.log(`WCAG:        ${result.wcag.ratio}  (${result.wcag.grade})`);
        console.log('');
        console.log('Penalties:');
        if (activePenalties.length === 0) {
            console.log('  No active penalties');
        } else {
            for (const p of activePenalties) console.log(`  ${p.label}: -${p.val.toFixed(2)}`);
        }
        console.log('');
        console.log('Rewards:');
        if (activeRewards.length === 0) {
            console.log('  No active rewards');
        } else {
            for (const r of activeRewards) console.log(`  ${r.label}: +${r.val.toFixed(2)}`);
        }
    } else {
        console.log(JSON.stringify(result, null, 2));
    }
} catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
}
