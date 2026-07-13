import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanUsage } from '../src/scan-usage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const V3_ROOT = path.join(__dirname, 'fixtures', 'v3-project');
const V4_ROOT = path.join(__dirname, 'fixtures', 'v4-project');

test('scanUsage finds static color utility classes in JSX', async () => {
  const { matches } = await scanUsage(V3_ROOT, { patterns: ['src/**/*.jsx'] });
  const utilities = matches.map((m) => m.utility).sort();
  assert.deepEqual(utilities, ['bg-brand-500', 'bg-brand-700', 'border-gray-300']);
});

test('scanUsage does NOT detect dynamically-constructed class names (documented v1 limitation)', async () => {
  const { matches } = await scanUsage(V3_ROOT, { patterns: ['src/**/*.jsx'] });
  const dynamicMatch = matches.find((m) => m.colorName === 'danger');
  assert.equal(dynamicMatch, undefined, 'template-literal class names must not be detected in v1');
});

test('scanUsage finds color utility classes in HTML', async () => {
  const { matches } = await scanUsage(V4_ROOT, { patterns: ['src/**/*.html'] });
  const utilities = matches.map((m) => m.utility).sort();
  assert.deepEqual(utilities, ['bg-brand-500', 'bg-brand-700', 'border-gray-300']);
});

test('scanUsage reports line numbers', async () => {
  const { matches } = await scanUsage(V4_ROOT, { patterns: ['src/**/*.html'] });
  const bgBrand = matches.find((m) => m.utility === 'bg-brand-500');
  assert.equal(bgBrand?.line, 1);
});
