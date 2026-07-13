import { readFile } from 'node:fs/promises';
import postcss from 'postcss';

const COLOR_VAR_RE = /^--color-([a-z0-9]+(?:-[a-z0-9]+)*)-(\d{2,3}|DEFAULT)$/i;
const COLOR_VAR_NO_SHADE_RE = /^--color-([a-z0-9]+(?:-[a-z0-9]+)*)$/i;

/**
 * Parses one or more CSS files for Tailwind v4 `@theme { --color-*: ... }`
 * custom color declarations.
 *
 * @param {string[]} cssFiles absolute paths to CSS files to scan
 * @returns {Promise<import('./types.js').PaletteResult>}
 */
export async function extractPaletteV4(cssFiles) {
  /** @type {import('./types.js').ColorEntry[]} */
  const customColors = [];
  /** @type {string[]} */
  const warnings = [];

  for (const file of cssFiles) {
    let contents;
    try {
      contents = await readFile(file, 'utf8');
    } catch (err) {
      warnings.push(`Could not read ${file}: ${/** @type {Error} */ (err).message}`);
      continue;
    }

    let root;
    try {
      root = postcss.parse(contents, { from: file });
    } catch (err) {
      warnings.push(`Could not parse ${file}: ${/** @type {Error} */ (err).message}`);
      continue;
    }

    root.walkAtRules('theme', (atRule) => {
      atRule.walkDecls((decl) => {
        const withShade = decl.prop.match(COLOR_VAR_RE);
        if (withShade) {
          customColors.push({ name: withShade[1], shade: withShade[2], value: decl.value, source: file });
          return;
        }
        const noShade = decl.prop.match(COLOR_VAR_NO_SHADE_RE);
        if (noShade) {
          customColors.push({ name: noShade[1], shade: 'DEFAULT', value: decl.value, source: file });
        }
      });
    });
  }

  return {
    format: 'v4',
    mode: 'override',
    customColors,
    effectivePalette: customColors,
    warnings
  };
}
