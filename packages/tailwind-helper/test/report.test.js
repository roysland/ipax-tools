import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReport } from '../src/report.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const V3_ROOT = path.join(__dirname, 'fixtures', 'v3-project');

test('buildReport cross-references palette and usage for the v3 fixture', async () => {
  const report = await buildReport(V3_ROOT, { format: 'v3', patterns: ['src/**/*.jsx'] });

  assert.equal(report.palette.mode, 'override');

  const unusedNames = report.unusedPaletteColors.map((c) => `${c.name}-${c.shade}`);
  assert.deepEqual(unusedNames, ['danger-500']);

  const unknownUtilities = report.unknownClassColors.map((m) => m.utility);
  assert.deepEqual(unknownUtilities, ['border-gray-300']);

  assert.ok(report.limitations.length > 0);
  assert.ok(report.limitations.some((l) => l.includes('template-literal')));
});
