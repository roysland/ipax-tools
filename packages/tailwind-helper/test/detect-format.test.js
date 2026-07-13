import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectTailwindFormat } from '../src/detect-format.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const V3_ROOT = path.join(__dirname, 'fixtures', 'v3-project');
const V4_ROOT = path.join(__dirname, 'fixtures', 'v4-project');

test('detects v3 from declared tailwindcss version + config file', async () => {
  const result = await detectTailwindFormat(V3_ROOT);
  assert.equal(result.format, 'v3');
  assert.ok(result.configPath?.endsWith('tailwind.config.js'));
});

test('detects v4 from declared tailwindcss version', async () => {
  const result = await detectTailwindFormat(V4_ROOT);
  assert.equal(result.format, 'v4');
});

test('honors explicit format override', async () => {
  const result = await detectTailwindFormat(V4_ROOT, { format: 'v3' });
  assert.equal(result.format, 'v3');
});
