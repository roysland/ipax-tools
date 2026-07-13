import path from 'node:path';
import fg from 'fast-glob';
import { detectTailwindFormat } from './detect-format.js';
import { extractPaletteV3 } from './extract-palette-v3.js';
import { extractPaletteV4 } from './extract-palette-css-v4.js';
import { defaultColorEntries } from './tailwind-default-color-names.js';

/**
 * @param {import('./types.js').ColorEntry[]} customColors
 * @returns {import('./types.js').ColorEntry[]}
 */
function mergeWithDefaults(customColors) {
  const custom = defaultColorEntries().filter(
    (defaultEntry) => !customColors.some((c) => c.name === defaultEntry.name && c.shade === defaultEntry.shade)
  );
  return [
    ...customColors,
    ...custom.map((entry) => ({ ...entry, value: undefined, source: '(tailwind default)' }))
  ];
}

/**
 * Extracts a project's Tailwind color palette, auto-detecting v3 (config
 * file) vs v4 (@theme CSS) format unless overridden.
 *
 * @param {string} root
 * @param {{format?: 'v3'|'v4'|'auto', css?: string[]}} [opts]
 * @returns {Promise<import('./types.js').PaletteResult>}
 */
export async function extractPalette(root, opts = {}) {
  const { format = 'auto', css } = opts;
  const detected = await detectTailwindFormat(root, { format });

  if (detected.format === 'v3') {
    if (!detected.configPath) {
      throw new Error(`No tailwind.config.{js,cjs,mjs} found under ${root}.`);
    }
    const result = await extractPaletteV3(detected.configPath);
    if (result.mode === 'extend') {
      result.effectivePalette = mergeWithDefaults(result.customColors);
    }
    return result;
  }

  const cssFiles = css ?? (await fg('**/*.css', {
    cwd: root,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
  }));
  const resolvedCssFiles = cssFiles.map((file) => (path.isAbsolute(file) ? file : path.join(root, file)));
  return extractPaletteV4(resolvedCssFiles);
}
