import { extractPalette } from './palette.js';
import { scanUsage } from './scan-usage.js';

const LIMITATIONS = [
  'Dynamically-constructed class names (e.g. template-literal interpolation like `bg-${color}-500`) are not detected.',
  'TypeScript Tailwind configs (tailwind.config.ts) are not supported; use .js/.cjs/.mjs.',
  'v4 CSS entry-point discovery scans all *.css files under the project root for @theme blocks; pass `css` explicitly for large projects.',
  'Usage scanning matches raw file text, not just class/className attributes — this catches clsx()/cva() usage but may rarely match unrelated text (e.g. inside comments or strings).'
];

/**
 * @param {import('./types.js').ColorEntry[]} palette
 * @param {import('./types.js').UsageMatch[]} usageMatches
 * @returns {import('./types.js').ColorEntry[]}
 */
function findUnusedPaletteColors(palette, usageMatches) {
  return palette.filter(
    (color) => !usageMatches.some((m) => m.colorName === color.name && m.shade === color.shade)
  );
}

/**
 * @param {import('./types.js').ColorEntry[]} effectivePalette
 * @param {import('./types.js').UsageMatch[]} usageMatches
 * @returns {import('./types.js').UsageMatch[]}
 */
function findUnknownClassColors(effectivePalette, usageMatches) {
  return usageMatches.filter(
    (m) => !effectivePalette.some((c) => c.name === m.colorName && c.shade === m.shade)
  );
}

/**
 * Builds a combined palette + usage report for a Tailwind project: which
 * declared colors are unused, and which classes reference colors that
 * aren't in the declared/default palette.
 *
 * @param {string} root
 * @param {{format?: 'v3'|'v4'|'auto', css?: string[], patterns?: string[], ignore?: string[]}} [opts]
 * @returns {Promise<import('./types.js').Report>}
 */
export async function buildReport(root, opts = {}) {
  const { format, css, patterns, ignore } = opts;

  const [palette, usage] = await Promise.all([
    extractPalette(root, { format, css }),
    scanUsage(root, { patterns, ignore })
  ]);

  return {
    palette,
    usage,
    unusedPaletteColors: findUnusedPaletteColors(palette.customColors, usage.matches),
    unknownClassColors: findUnknownClassColors(palette.effectivePalette, usage.matches),
    limitations: LIMITATIONS
  };
}
