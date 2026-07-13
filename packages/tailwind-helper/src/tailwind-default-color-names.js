/**
 * @file Static list of Tailwind's stock color palette names and shade
 * steps (names/keys only, no hex values — this package doesn't need the
 * actual colors, just enough to tell "known default" from "unknown").
 * Captured from Tailwind CSS v3.4 / v4's default palette
 * (https://tailwindcss.com/docs/colors), which v4 kept unchanged from v3.
 */

/** @type {string[]} */
export const DEFAULT_COLOR_NAMES = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose',
  'black', 'white', 'transparent', 'current'
];

/** @type {string[]} */
export const DEFAULT_SHADES = [
  '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'
];

/**
 * @returns {{name: string, shade: string}[]}
 */
export function defaultColorEntries() {
  /** @type {{name: string, shade: string}[]} */
  const entries = [];
  for (const name of DEFAULT_COLOR_NAMES) {
    if (name === 'black' || name === 'white' || name === 'transparent' || name === 'current') {
      entries.push({ name, shade: 'DEFAULT' });
      continue;
    }
    for (const shade of DEFAULT_SHADES) {
      entries.push({ name, shade });
    }
  }
  return entries;
}
