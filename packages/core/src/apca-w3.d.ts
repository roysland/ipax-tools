// Hand-written type stub for the untouched, third-party apca-w3.js (see
// NOTICE — reproduced unmodified from https://github.com/Myndex/apca-w3,
// © 2019-2022 Andrew Somers / Myndex Research, W3 License). A sibling .d.ts
// takes precedence over the .js file for TS module resolution, so this lets
// consumers get real types without checking or modifying the vendor file.

/** Signed APCA Lc contrast between two sRGB luminances (0–1). */
export function APCAcontrast(txtY: number, bgY: number, places?: number): number;

/** Minimum-font-size lookup table for a given Lc; entries may be 999/777 "magic numbers". */
export function fontLookupAPCA(contrast: number, places?: number): number[];

/** APCA's own sRGB relative luminance for a `[r, g, b]` triple, 0–255 each. */
export function sRGBtoY(rgb?: [number, number, number]): number;
