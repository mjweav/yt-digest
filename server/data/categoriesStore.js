import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const CATS_FILE = path.join(DATA_DIR, 'categories.json');          // ["AI", "Music", ...]
const ASSIGN_FILE = path.join(DATA_DIR, 'channelCategories.json');  // { "<channelId>": ["AI","Music"] }

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}
async function readJSON(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf-8')); }
  catch { return fallback; }
}
async function writeJSON(file, obj) {
  await ensureDir();
  await fs.writeFile(file, JSON.stringify(obj, null, 2), 'utf-8');
}

// Try to seed from legacy tag sources once
async function seedFromExistingIfEmpty() {
  const cats = await readJSON(CATS_FILE, null);
  if (cats && cats.length) return cats;

  // Heuristic seed: scan channels.json for 'tags' or 'categories' fields
  const channelsFile = path.join(DATA_DIR, 'channels.json');
  const legacy = await readJSON(channelsFile, []);
  const arr = Array.isArray(legacy.channels) ? legacy.channels : legacy;
  const found = new Set();
  for (const ch of (arr || [])) {
    const t1 = ch.tags || ch.tag || ch.categories || ch.category || ch?.snippet?.tags;
    if (Array.isArray(t1)) t1.forEach(s => s && found.add(String(s)));
    if (typeof t1 === 'string') t1.split(',').map(s=>s.trim()).forEach(s=>s && found.add(s));
  }
  const seeded = Array.from(found).sort((a,b)=>a.localeCompare(b));
  await writeJSON(CATS_FILE, seeded);
  return seeded;
}

async function getCategories() {
  const cats = await readJSON(CATS_FILE, []);
  if (cats.length) return cats;
  return seedFromExistingIfEmpty();
}
async function createCategory(name) {
  const cats = await getCategories();
  const trimmed = String(name || '').trim();
  if (!trimmed) return cats;
  if (!cats.includes(trimmed)) {
    cats.push(trimmed);
    cats.sort((a,b)=>a.localeCompare(b));
    await writeJSON(CATS_FILE, cats);
  }
  return cats;
}
async function getAssignments() {
  return readJSON(ASSIGN_FILE, {});
}
async function assignChannelsToCategory(channelIds = [], category) {
  const cats = await createCategory(category); // ensure exists
  const assigns = await getAssignments();
  let changed = 0;
  for (const id of channelIds) {
    const arr = Array.isArray(assigns[id]) ? assigns[id] : [];
    if (!arr.includes(category)) {
      arr.push(category);
      assigns[id] = arr;
      changed++;
    }
  }
  if (changed > 0) await writeJSON(ASSIGN_FILE, assigns);
  return { ok: true, changed };
}
async function getCategoriesForChannel(id) {
  const assigns = await getAssignments();
  return Array.isArray(assigns[id]) ? assigns[id] : [];
}

export {
  getCategories,
  createCategory,
  getAssignments,
  assignChannelsToCategory,
  getCategoriesForChannel
};
