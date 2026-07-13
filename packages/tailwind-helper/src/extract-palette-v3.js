import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Flattens a Tailwind theme.colors-shaped object into ColorEntry[].
 * Handles both `{ brand: { 500: '#...' } }` and `{ black: '#000' }` shapes.
 *
 * @param {Record<string, unknown>} colors
 * @param {string} source
 * @returns {import('./types.js').ColorEntry[]}
 */
function flattenColors(colors, source) {
  /** @type {import('./types.js').ColorEntry[]} */
  const entries = [];
  for (const [name, value] of Object.entries(colors)) {
    if (typeof value === 'string') {
      entries.push({ name, shade: 'DEFAULT', value, source });
    } else if (value && typeof value === 'object') {
      for (const [shade, shadeValue] of Object.entries(value)) {
        if (typeof shadeValue === 'string') {
          entries.push({ name, shade, value: shadeValue, source });
        }
      }
    }
  }
  return entries;
}

/**
 * Executes a tailwind.config.{js,cjs,mjs} file and extracts its custom
 * color palette. This runs the target project's own code (same trust
 * model as running its vite.config/eslint.config) — required to resolve
 * require()/spreads/function-form theme.colors reliably.
 *
 * @param {string} configPath absolute path to the config file
 * @returns {Promise<import('./types.js').PaletteResult>}
 */
export async function extractPaletteV3(configPath) {
  if (configPath.endsWith('.ts')) {
    throw new Error(
      `TypeScript Tailwind configs are not supported in v1: ${configPath}. ` +
      `Convert to tailwind.config.js/.cjs/.mjs, or pass an explicit palette.`
    );
  }

  /** @type {string[]} */
  const warnings = [];
  const mod = await import(pathToFileURL(configPath).href);
  const config = mod.default ?? mod;
  const theme = config?.theme ?? {};

  const hasOverride = theme.colors && typeof theme.colors === 'object';
  const hasExtend = theme.extend?.colors && typeof theme.extend.colors === 'object';

  /** @type {Record<string, unknown>} */
  let rawColors = {};
  /** @type {import('./types.js').PaletteMode} */
  let mode = 'extend';

  if (hasOverride) {
    mode = 'override';
    rawColors = resolvePossibleFunction(theme.colors, warnings, configPath);
  } else if (hasExtend) {
    mode = 'extend';
    rawColors = resolvePossibleFunction(theme.extend.colors, warnings, configPath);
  }

  const customColors = flattenColors(rawColors, configPath);

  return {
    format: 'v3',
    mode,
    customColors,
    effectivePalette: customColors,
    warnings
  };
}

/**
 * @param {unknown} value
 * @param {string[]} warnings
 * @param {string} configPath
 * @returns {Record<string, unknown>}
 */
function resolvePossibleFunction(value, warnings, configPath) {
  if (typeof value !== 'function') {
    return /** @type {Record<string, unknown>} */ (value);
  }
  try {
    const result = value({ colors: {}, theme: () => ({}) });
    return result && typeof result === 'object' ? result : {};
  } catch (err) {
    warnings.push(
      `theme.colors/theme.extend.colors in ${path.basename(configPath)} is a function that threw ` +
      `when called with a minimal stub (${/** @type {Error} */ (err).message}); returning partial results.`
    );
    return {};
  }
}
