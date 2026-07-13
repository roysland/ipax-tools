import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

const CONFIG_FILENAMES = ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs', 'tailwind.config.ts'];

/**
 * @param {string} root
 * @returns {Promise<string|undefined>}
 */
async function readDeclaredTailwindVersion(root) {
  const pkgPath = path.join(root, 'package.json');
  if (!existsSync(pkgPath)) return undefined;
  try {
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
    const range =
      pkg.dependencies?.tailwindcss ??
      pkg.devDependencies?.tailwindcss ??
      pkg.peerDependencies?.tailwindcss;
    return range;
  } catch {
    return undefined;
  }
}

/**
 * @param {string} root
 * @returns {Promise<string|undefined>}
 */
async function readInstalledTailwindVersion(root) {
  const installedPkgPath = path.join(root, 'node_modules', 'tailwindcss', 'package.json');
  if (!existsSync(installedPkgPath)) return undefined;
  try {
    const pkg = JSON.parse(await readFile(installedPkgPath, 'utf8'));
    return pkg.version;
  } catch {
    return undefined;
  }
}

/**
 * @param {string|undefined} versionOrRange
 * @returns {number|undefined}
 */
function majorFromVersionString(versionOrRange) {
  if (!versionOrRange) return undefined;
  const match = versionOrRange.match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

/**
 * @param {string} root
 * @returns {string|undefined} absolute path to the found config file
 */
function findConfigFile(root) {
  for (const filename of CONFIG_FILENAMES) {
    const candidate = path.join(root, filename);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

/**
 * @param {string} root
 * @returns {Promise<boolean>}
 */
async function hasThemeCssBlock(root) {
  const cssFiles = await fg('**/*.css', {
    cwd: root,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
  });
  for (const file of cssFiles) {
    const contents = await readFile(file, 'utf8');
    if (/@theme\b/.test(contents)) return true;
  }
  return false;
}

/**
 * Detects whether a project is using Tailwind v3 (config-file based) or
 * v4 (CSS @theme based) color configuration.
 *
 * @param {string} root
 * @param {{format?: 'v3'|'v4'|'auto'}} [opts]
 * @returns {Promise<{format: 'v3'|'v4', configPath?: string}>}
 */
export async function detectTailwindFormat(root, opts = {}) {
  const { format = 'auto' } = opts;
  const configPath = findConfigFile(root);

  if (format === 'v3' || format === 'v4') {
    return { format, configPath: format === 'v3' ? configPath : undefined };
  }

  const declaredVersion = await readDeclaredTailwindVersion(root);
  const declaredMajor = majorFromVersionString(declaredVersion);
  if (declaredMajor !== undefined) {
    return declaredMajor >= 4 ? { format: 'v4' } : { format: 'v3', configPath };
  }

  const installedVersion = await readInstalledTailwindVersion(root);
  const installedMajor = majorFromVersionString(installedVersion);
  if (installedMajor !== undefined) {
    return installedMajor >= 4 ? { format: 'v4' } : { format: 'v3', configPath };
  }

  if (configPath) return { format: 'v3', configPath };
  if (await hasThemeCssBlock(root)) return { format: 'v4' };

  throw new Error(
    `Could not detect Tailwind format for ${root}: no tailwindcss version declared/installed, ` +
    `no tailwind.config.* file, and no @theme CSS block found. Pass an explicit format option.`
  );
}
