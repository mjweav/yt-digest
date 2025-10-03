// server/utils/paths.js (ES Module)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Walk up from a start dir until predicate(dir) returns true or we hit filesystem root
function findUp(startDir, predicate, maxHops = 10) {
  let dir = startDir;
  for (let i = 0; i < maxHops; i++) {
    if (predicate(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached root
    dir = parent;
  }
  return null;
}

// Root detection: prefer a dir that contains a "data" folder AND package.json (but not server directory)
function looksLikeRepoRoot(dir) {
  try {
    const hasData = fs.existsSync(path.join(dir, 'data')) && fs.lstatSync(path.join(dir, 'data')).isDirectory();
    const hasPackageJson = fs.existsSync(path.join(dir, 'package.json'));
    const isServerDir = dir.endsWith('/server') || path.basename(dir) === 'server';
    return hasData && hasPackageJson && !isServerDir;
  } catch {
    return false;
  }
}

// Public: resolve the repo root and data dir
function getRepoRoot() {
  // 1) Respect explicit override if you set it in .env or process manager
  if (process.env.REPO_ROOT) return path.resolve(process.env.REPO_ROOT);

  // 2) Try from this file's directory upward
  const fromHere = findUp(__dirname, looksLikeRepoRoot, 12);
  if (fromHere) return fromHere;

  // 3) Try from CWD (in case server started elsewhere)
  const fromCwd = findUp(process.cwd(), looksLikeRepoRoot, 12);
  if (fromCwd) return fromCwd;

  // 4) Fallback: assume two levels up from /server/*
  return path.resolve(__dirname, '..', '..');
}

function getDataDir() {
  // Allow override DATA_DIR if you want to point to a shared volume
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR);
  return path.join(getRepoRoot(), 'data');
}

function resolveDataPath(...parts) {
  return path.join(getDataDir(), ...parts);
}

export { getRepoRoot, getDataDir, resolveDataPath };
