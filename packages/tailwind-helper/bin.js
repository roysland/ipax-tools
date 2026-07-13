#!/usr/bin/env node
import path from 'node:path';
import { buildReport } from './src/report.js';

function usage(exitCode = 1) {
  const out = exitCode === 0 ? console.log : console.error;
  out('Usage: ipax-tailwind [options]');
  out('');
  out('Options:');
  out('  --root <path>            Project root to scan (default: cwd)');
  out('  --format v3|v4|auto      Tailwind config format (default: auto)');
  out('  --css <path,...>         Explicit CSS file(s) to scan for @theme (v4 only)');
  out('  --patterns <glob,...>    Source glob patterns for usage scanning');
  out('  --output json|pretty     Output format (default: json)');
  out('  --help, -h               Show this help');
  out('');
  out('Examples:');
  out('  ipax-tailwind --root . --output pretty');
  out('  ipax-tailwind --root ./app --format v4 --css src/theme.css');
  process.exit(exitCode);
}

/**
 * @param {string[]} args
 * @returns {Record<string, string>}
 */
function parseFlags(args) {
  /** @type {Record<string, string>} */
  const flags = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = args[i + 1];
    flags[key] = next && !next.startsWith('--') ? next : 'true';
  }
  return flags;
}

/**
 * @param {import('./src/types.js').Report} report
 */
function printPretty(report) {
  console.log(`Format: ${report.palette.format} (${report.palette.mode})`);
  console.log(`Custom colors: ${report.palette.customColors.length}`);
  console.log(`Files scanned: ${report.usage.filesScanned}`);
  console.log('');
  console.log(`Unused palette colors (${report.unusedPaletteColors.length}):`);
  for (const c of report.unusedPaletteColors) {
    console.log(`  ${c.name}-${c.shade}`);
  }
  console.log('');
  console.log(`Unknown class colors (${report.unknownClassColors.length}):`);
  for (const m of report.unknownClassColors) {
    console.log(`  ${m.utility}  (${m.file}:${m.line})`);
  }
  if (report.palette.warnings.length > 0) {
    console.log('');
    console.log('Warnings:');
    for (const w of report.palette.warnings) console.log(`  ${w}`);
  }
  console.log('');
  console.log('Limitations:');
  for (const l of report.limitations) console.log(`  - ${l}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) usage(0);

  const flags = parseFlags(args);
  const root = path.resolve(flags.root ?? '.');
  const format = /** @type {'v3'|'v4'|'auto'|undefined} */ (flags.format);
  const css = flags.css ? flags.css.split(',').map((p) => path.resolve(root, p)) : undefined;
  const patterns = flags.patterns ? flags.patterns.split(',') : undefined;
  const output = flags.output ?? 'json';

  try {
    const report = await buildReport(root, { format, css, patterns });
    if (output === 'pretty') {
      printPretty(report);
    } else {
      console.log(JSON.stringify(report, null, 2));
    }
  } catch (err) {
    console.error(`Error: ${/** @type {Error} */ (err).message}`);
    process.exit(1);
  }
}

main();
