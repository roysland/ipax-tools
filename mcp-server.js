#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, 'index.js');

function runCLI(args) {
    const result = spawnSync(process.execPath, [CLI, ...args], {
        encoding: 'utf8',
        env: process.env,
    });
    if (result.error) throw new Error(result.error.message);
    const output = (result.stdout || '') + (result.stderr || '');
    return { output: output.trim(), exitCode: result.status ?? 0 };
}

const TOOLS = [
    {
        name: 'ipax_evaluate',
        description: 'Evaluate the perceptual contrast between a background and text color pair. Returns an IPAX score (0-5), APCA Lc, WCAG ratio, font sizing, active perceptual penalties (chromostereopsis, halation, glare, etc.) and rewards.',
        inputSchema: {
            type: 'object',
            properties: {
                background: { type: 'string', description: 'Background color — any CSS format: hex, rgb/rgba, oklch, color-mix(), named color.' },
                text: { type: 'string', description: 'Text (foreground) color — same formats as background.' },
                mode: { type: 'string', enum: ['text', 'graphical'], description: 'Scoring mode. "text" (default) uses APCA font sizing; "graphical" uses WCAG 1.4.11 non-text contrast.' },
                context: { type: 'string', enum: ['light', 'dark'], description: 'Force light or dark context. Omit to auto-detect from background lightness.' },
                weight: { type: 'number', description: 'Font weight for APCA minimum size lookup (100-900, default 400).' },
                flatten_over: { type: 'string', description: 'Composite semi-transparent rgba() colors over this opaque color before scoring.' },
            },
            required: ['background', 'text'],
        },
    },
    {
        name: 'ipax_find',
        description: 'Grid-search OKLCh color space to find background+text pairs at a given hue that meet a minimum IPAX score. Returns color-mix() CSS snippets and scored pairs.',
        inputSchema: {
            type: 'object',
            properties: {
                hue: { type: 'number', description: 'Target hue angle in degrees (0-360).' },
                base: { type: 'string', description: 'Bias color-mix() hints toward this existing color.' },
                target: { type: 'number', description: 'Minimum IPAX score to include in results (default 3).' },
                count: { type: 'number', description: 'Number of results to return (default 3).' },
                rangeL: { type: 'string', description: 'Lightness search range as "lo,hi" (default "0.05,0.95").' },
                rangeC: { type: 'string', description: 'Chroma search range as "lo,hi" (default "0.00,0.40").' },
                stepL: { type: 'number', description: 'Lightness grid step (default 0.05).' },
                stepC: { type: 'number', description: 'Chroma grid step (default 0.02).' },
                variants: { type: 'string', description: 'Comma-separated CSS media variants to emit: "prefers-contrast,prefers-color-scheme".' },
                gamut_policy: { type: 'string', enum: ['clip-chroma', 'clip-srgb'], description: 'Out-of-gamut handling (default "clip-chroma").' },
            },
            required: ['hue'],
        },
    },
    {
        name: 'ipax_palette',
        description: 'Analyse a set of colors as a UI palette. Computes pairwise ΔE distances and flags combinations that are too similar (conflict threshold), including CVD (deuteranopia + protanopia) simulations.',
        inputSchema: {
            type: 'object',
            properties: {
                colors: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 2,
                    description: 'Array of 2–N colors to analyse — any CSS format.',
                },
                threshold: { type: 'number', description: 'ΔE conflict threshold; pairs below this are flagged (default 25).' },
                no_cvd: { type: 'boolean', description: 'Skip CVD simulation (default false).' },
            },
            required: ['colors'],
        },
    },
    {
        name: 'ipax_stack',
        description: 'Score a three-layer UI stack: a canvas (page background), a surface (card/panel composited over canvas), and a foreground element (text composited over surface). Optionally includes hover/focus states.',
        inputSchema: {
            type: 'object',
            properties: {
                canvas: { type: 'string', description: 'Base layer — must be opaque.' },
                surface: { type: 'string', description: 'Middle layer — composited over canvas; may be semi-transparent rgba().' },
                fg: { type: 'string', description: 'Foreground (text) layer — composited over surface.' },
                surface_hover: { type: 'string', description: 'Optional hover/focus surface state.' },
                fg_hover: { type: 'string', description: 'Optional hover/focus foreground state.' },
                mode: { type: 'string', enum: ['text', 'graphical'], description: 'Scoring mode (default "text").' },
                context: { type: 'string', enum: ['light', 'dark'], description: 'Force light or dark context.' },
            },
            required: ['canvas', 'surface', 'fg'],
        },
    },
];

const server = new Server(
    { name: 'ipax', version: '2.0.0' },
    { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        let cliArgs;

        if (name === 'ipax_evaluate') {
            cliArgs = [args.background, args.text];
            if (args.mode) cliArgs.push('--mode', args.mode);
            if (args.context) cliArgs.push('--context', args.context);
            if (args.weight != null) cliArgs.push('--weight', String(args.weight));
            if (args.flatten_over) cliArgs.push('--flatten-over', args.flatten_over);
            cliArgs.push('--output', 'json');

        } else if (name === 'ipax_find') {
            cliArgs = ['find', String(args.hue)];
            if (args.base) cliArgs.push('--base', args.base);
            if (args.target != null) cliArgs.push('--target', String(args.target));
            if (args.count != null) cliArgs.push('--count', String(args.count));
            if (args.rangeL) cliArgs.push('--rangeL', args.rangeL);
            if (args.rangeC) cliArgs.push('--rangeC', args.rangeC);
            if (args.stepL != null) cliArgs.push('--stepL', String(args.stepL));
            if (args.stepC != null) cliArgs.push('--stepC', String(args.stepC));
            if (args.variants) cliArgs.push('--variants', args.variants);
            if (args.gamut_policy) cliArgs.push('--gamut-policy', args.gamut_policy);
            cliArgs.push('--output', 'json');

        } else if (name === 'ipax_palette') {
            cliArgs = ['palette', ...args.colors];
            if (args.threshold != null) cliArgs.push('--threshold', String(args.threshold));
            if (args.no_cvd) cliArgs.push('--no-cvd');
            cliArgs.push('--output', 'json');

        } else if (name === 'ipax_stack') {
            cliArgs = ['stack', '--canvas', args.canvas, '--surface', args.surface, '--fg', args.fg];
            if (args.surface_hover) cliArgs.push('--surface-hover', args.surface_hover);
            if (args.fg_hover) cliArgs.push('--fg-hover', args.fg_hover);
            if (args.mode) cliArgs.push('--mode', args.mode);
            if (args.context) cliArgs.push('--context', args.context);
            cliArgs.push('--output', 'json');

        } else {
            return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
        }

        const { output, exitCode } = runCLI(cliArgs);
        return {
            content: [{ type: 'text', text: output }],
            isError: exitCode !== 0,
        };

    } catch (err) {
        return { content: [{ type: 'text', text: err.message }], isError: true };
    }
});

const transport = new StdioServerTransport();
await server.connect(transport);
