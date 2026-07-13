// Shared JSDoc typedefs for @ipax/core. No runtime code — import types from
// here with `@typedef {import('./types.js').Oklch} Oklch`.

/**
 * @typedef {Object} Oklch
 * @property {number} l - Lightness, 0–1.
 * @property {number} c - Chroma, typically 0–~0.4.
 * @property {number} h - Hue, degrees, 0–360.
 * @property {string} [hex] - Source hex, uppercased, if converted from one.
 */

/**
 * @typedef {'text'|'graphical'} ScoringMode
 * Graphical mode applies WCAG's 3:1 non-text floor (SC 1.4.11) and weights
 * edge-sensitive ergonomics penalties higher, for borders/icons/focus rings
 * rather than body text. This is an IPAX-tools extension — not present in
 * Santiago Bustelo's upstream engine.
 */

/**
 * @typedef {'dark'|'light'|null} ForceContext
 */

/**
 * @typedef {Object} Warning
 * @property {string} slug
 * @property {number} val
 */

/**
 * @typedef {Object} PenaltyResult
 * @property {number} totalPenalty
 * @property {Warning[]} warnings
 */

/**
 * @typedef {Object} RewardResult
 * @property {number} totalReward
 * @property {Warning[]} bonuses
 */

/**
 * @typedef {Object} FontUsage
 * @property {boolean} bodyTextAllowed
 * @property {boolean} spotTextAllowed
 * @property {number|string|null} errorCode - APCA "magic number" (999/777) or null.
 */

/**
 * @typedef {Object} FontData
 * @property {number|null} sizePx
 * @property {FontUsage} usage
 */

/**
 * @typedef {Object} WcagData
 * @property {number} score - 0–3.
 * @property {number} ratio
 * @property {string} grade
 * @property {number|null} fontSize
 */

/**
 * @typedef {Object} ApcaData
 * @property {number} score - 0–5.
 * @property {number} lc - Signed APCA Lc contrast.
 * @property {string} grade
 * @property {FontData} font
 */

/**
 * @typedef {Object} DictionaryEntry
 * @property {string} slug
 * @property {string} label
 * @property {string} description
 * @property {string[]} references
 */

/**
 * @typedef {Object} ScoredDictionaryEntry
 * @property {string} slug
 * @property {string} label
 * @property {number} val
 */

/**
 * @typedef {Object} IpaxScoreResult
 * @property {{text: string, bg: string, darkMode: boolean, mode?: ScoringMode}} input
 * @property {number} score
 * @property {string} string - e.g. "3", "X", "1(2)".
 * @property {WcagData} wcag
 * @property {ApcaData} apca
 * @property {{text: {oklch: Oklch, y: number, apcaY: number}, bg: {oklch: Oklch, y: number, apcaY: number}}} colors
 * @property {{totalPenalty: number, penalties: ScoredDictionaryEntry[], rewards: ScoredDictionaryEntry[]}} details
 */

export {};
