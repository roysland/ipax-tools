import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

const DEFAULT_PATTERNS = ['**/*.{js,jsx,ts,tsx,vue,html,svelte}'];
const DEFAULT_IGNORE = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'];

const COLOR_UTILITY_PREFIXES = [
  'bg', 'text', 'border', 'ring', 'divide', 'outline',
  'decoration', 'accent', 'caret', 'fill', 'stroke', 'from', 'via', 'to', 'shadow'
];

const CLASS_RE = new RegExp(
  `\\b(${COLOR_UTILITY_PREFIXES.join('|')})-([a-z]+(?:-[a-z]+)*)-(\\d{2,3}|DEFAULT)\\b`,
  'g'
);

/**
 * Scans a project's source files for Tailwind color utility class usage.
 * Static whole-file regex matching only — dynamically-constructed class
 * names (e.g. template-literal interpolation) are NOT detected; see the
 * package README's "v1 limitations" section.
 *
 * @param {string} root
 * @param {{patterns?: string[], ignore?: string[]}} [opts]
 * @returns {Promise<import('./types.js').UsageReport>}
 */
export async function scanUsage(root, opts = {}) {
  const { patterns = DEFAULT_PATTERNS, ignore = DEFAULT_IGNORE } = opts;

  const files = await fg(patterns, { cwd: root, absolute: true, ignore });

  /** @type {import('./types.js').UsageMatch[]} */
  const matches = [];

  for (const file of files) {
    const contents = await readFile(file, 'utf8');
    const lines = contents.split('\n');
    lines.forEach((line, index) => {
      for (const match of line.matchAll(CLASS_RE)) {
        const [, utility, colorName, shade] = match;
        matches.push({
          utility: `${utility}-${colorName}-${shade}`,
          colorName,
          shade,
          file: path.relative(root, file),
          line: index + 1
        });
      }
    });
  }

  return { matches, filesScanned: files.length };
}
