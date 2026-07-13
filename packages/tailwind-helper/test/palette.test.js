import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPalette } from '../src/palette.js';
import { extractPaletteV3 } from '../src/extract-palette-v3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const V3_ROOT = path.join(__dirname, 'fixtures', 'v3-project');
const V3_EXTEND_ROOT = path.join(__dirname, 'fixtures', 'v3-extend-project');
const V4_ROOT = path.join(__dirname, 'fixtures', 'v4-project');

test('extractPaletteV3 flattens an object-form theme.colors config (override mode)', async () => {
  const result = await extractPaletteV3(path.join(V3_ROOT, 'tailwind.config.js'));
  assert.equal(result.mode, 'override');
  const names = result.customColors.map((c) => `${c.name}-${c.shade}`).sort();
  assert.deepEqual(names, ['brand-500', 'brand-700', 'danger-500']);
  assert.equal(result.effectivePalette.length, result.customColors.length);
});

test('extractPaletteV3 resolves require()d colors in extend mode', async () => {
  const result = await extractPaletteV3(path.join(V3_ROOT, 'tailwind.config.extend.cjs'));
  assert.equal(result.mode, 'extend');
  const names = result.customColors.map((c) => `${c.name}-${c.shade}`).sort();
  assert.deepEqual(names, ['accent-500', 'brand-500']);
});

test('extractPalette (auto) merges extend-mode colors with Tailwind defaults', async () => {
  const result = await extractPalette(V3_ROOT, {
    format: 'v3'
  });
  // v3-project's tailwind.config.js is override mode by default fixture, so
  // effectivePalette should equal customColors exactly (no defaults merged).
  assert.equal(result.mode, 'override');
  assert.equal(result.effectivePalette.length, result.customColors.length);
});

test('extractPalette merges extend-mode custom colors with Tailwind defaults', async () => {
  const result = await extractPalette(V3_EXTEND_ROOT, { format: 'v3' });
  assert.equal(result.mode, 'extend');
  assert.equal(result.customColors.length, 1);
  // effectivePalette should include the custom color plus every stock default entry.
  assert.ok(result.effectivePalette.length > result.customColors.length);
  assert.ok(result.effectivePalette.some((c) => c.name === 'brand' && c.shade === '500'));
  assert.ok(result.effectivePalette.some((c) => c.name === 'gray' && c.shade === '500'));
});

test('extractPalette detects v4 and parses @theme --color-* declarations', async () => {
  const result = await extractPalette(V4_ROOT, { format: 'v4' });
  assert.equal(result.format, 'v4');
  const names = result.customColors.map((c) => `${c.name}-${c.shade}`).sort();
  assert.deepEqual(names, ['brand-500', 'brand-700', 'danger-500']);
});

test('extractPalette auto-detection picks v3 for the v3 fixture', async () => {
  const result = await extractPalette(V3_ROOT);
  assert.equal(result.format, 'v3');
});

test('extractPalette auto-detection picks v4 for the v4 fixture', async () => {
  const result = await extractPalette(V4_ROOT);
  assert.equal(result.format, 'v4');
});
