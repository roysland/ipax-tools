/**
 * @file JSDoc typedefs shared across this package. No runtime code.
 */

/**
 * @typedef {'v3'|'v4'} TailwindFormat
 */

/**
 * @typedef {'override'|'extend'} PaletteMode
 * 'override' — theme.colors replaced Tailwind's stock palette (v3) or the
 * palette is CSS-@theme-defined (v4, always treated as override-by-name).
 * 'extend' — theme.extend.colors was merged on top of Tailwind's defaults (v3 only).
 */

/**
 * @typedef {Object} ColorEntry
 * @property {string} name
 * @property {string} shade
 * @property {string} [value]
 * @property {string} source - file path the color was declared in
 */

/**
 * @typedef {Object} PaletteResult
 * @property {TailwindFormat} format
 * @property {PaletteMode} mode
 * @property {ColorEntry[]} customColors
 * @property {ColorEntry[]} effectivePalette
 * @property {string[]} warnings
 */

/**
 * @typedef {Object} UsageMatch
 * @property {string} utility
 * @property {string} colorName
 * @property {string} shade
 * @property {string} file
 * @property {number} line
 */

/**
 * @typedef {Object} UsageReport
 * @property {UsageMatch[]} matches
 * @property {number} filesScanned
 */

/**
 * @typedef {Object} Report
 * @property {PaletteResult} palette
 * @property {UsageReport} usage
 * @property {ColorEntry[]} unusedPaletteColors
 * @property {UsageMatch[]} unknownClassColors
 * @property {string[]} limitations
 */

export {};
