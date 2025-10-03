import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { assignClusterLabel } from './heuristics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE = path.join(__dirname, '../../data/autoOrganize.json');

function qQuartiles(nums) {
  if (!nums.length) return [0,0,0];
  const s = [...nums].sort((a,b)=>a-b);
  const q1 = s[Math.floor(s.length*0.25)];
  const q3 = s[Math.floor(s.length*0.75)];
  const mid = Math.floor(s.length/2);
  const median = s.length%2 ? s[mid] : (s[mid-1]+s[mid])/2;
  return [q1, median, q3];
}

function sizeClass(count, [q1, q2, q3]) {
  if (count <= q1) return 'xs';
  if (count <= q2) return 'sm';
  if (count <= q3) return 'md';
  return 'lg';
}

function spanForGroup(n) {
  if (n >= 70) return 4;
  if (n >= 50) return 3;
  if (n >= 30) return 2;
  return 1;
}

async function readCached(){
  try {
    const raw = await fs.readFile(CACHE,'utf-8');
    return JSON.parse(raw);
  } catch { return null; }
}

async function writeCache(payload){
  await fs.mkdir(path.dirname(CACHE), { recursive: true });
  await fs.writeFile(CACHE, JSON.stringify(payload, null, 2), 'utf-8');
}

async function loadChannels(){
  // replace with your real persistence
  const raw = await fs.readFile(path.join(__dirname,'../../data/channels.json'),'utf-8');
  const json = JSON.parse(raw);
  return json.channels || json;
}

async function buildAutoOrganize({ force } = {}){
  const channels = await loadChannels();
  const norm = channels.map(ch => {
    const stats = ch.statistics || {};
    const cd = ch.contentDetails || {};
    const videoCount = Number(stats.videoCount || cd.totalItemCount || 0) || 0;
    const thumbs = ch.thumbnails || (ch.snippet && ch.snippet.thumbnails) || {};
    const thumb = (thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || '');
    return {
      id: ch.id || ch.channelId,
      title: ch.title || ch.snippet?.title || '',
      desc: ch.description || ch.snippet?.description || '',
      thumb, videoCount
    };
  });

  // Heuristic bucketing
  const buckets = new Map();
  for (const ch of norm) {
    const label = assignClusterLabel(ch);
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label).push(ch);
  }

  const counts = norm.map(c => c.videoCount);
  const qs = qQuartiles(counts);

  const clusters = Array.from(buckets.entries()).map(([label, arr]) => {
    const channels = arr
      .sort((a,b)=> (b.videoCount - a.videoCount) || a.title.localeCompare(b.title))
      .map(c => ({
        id: c.id,
        title: c.title,
        thumb: c.thumb,
        desc: c.desc,
        videoCount: c.videoCount,
        size: sizeClass(c.videoCount, qs)
      }));
    return {
      id: label.toLowerCase().replace(/\s+/g,'-'),
      label,
      span: spanForGroup(arr.length),
      channels
    };
  });

  const payload = { builtAt: new Date().toISOString(), clusters };
  await writeCache(payload);
  return payload;
}

export { buildAutoOrganize, readCached };
