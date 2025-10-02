import { useEffect, useMemo, useState } from 'react';

export default function AutoOrganize() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [hidden, setHidden] = useState(new Set());
  const [q, setQ] = useState('');

  useEffect(() => {
    fetch('/api/auto-organize').then(r => r.json()).then(setData);
  }, []);

  const clusters = useMemo(() => {
    if (!data) return [];
    const query = q.trim().toLowerCase();
    return data.clusters.filter(c => {
      if (!query) return true;
      if (c.label.toLowerCase().includes(query)) return true;
      return false;
    });
  }, [data, q]);

  function toggle(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  if (!data) return <div className="p-6 text-sm text-slate-300">Loading…</div>;

  return (
    <div className="p-4 pb-28">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search clusters…"
            className="px-3 py-2 rounded-lg bg-slate-900/70 border border-white/10 text-sm outline-none w-72"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-lg bg-blue-900/40 border border-blue-400/40 text-sm"
            onClick={() => fetch('/api/auto-organize/recompute', { method: 'POST' }).then(() => {
              fetch('/api/auto-organize').then(r => r.json()).then(setData);
            })}
          >Recompute</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {clusters.map((c, idx) => (
          <section key={idx} className={`col-span-${c.span} rounded-2xl border border-white/5 p-3 bg-white/5`}>
            <div className="flex items-center justify-between pb-2 border-b border-dashed border-white/10">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 border border-blue-400/40">{c.label}</span>
                <span className="text-xs text-white/70">{c.channels.length} channels</span>
              </div>
            </div>
            <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
              {c.channels.map(ch => (
                <div key={ch.id} className="flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => toggle(ch.id)}>
                  <div className={`rounded-full bg-slate-800 border border-white/10 ${{
                    xs:'w-14 h-14', sm:'w-18 h-18', md:'w-24 h-24', lg:'w-32 h-32'
                  }[ch.size] || 'w-18 h-18'}`} />
                  <div className="w-full text-center text-xs text-white/80 truncate">Channel</div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="fixed bottom-4 left-4 right-4 flex justify-center">
        <div className="backdrop-blur bg-slate-900/80 border border-white/10 rounded-xl p-2 flex gap-2 items-center max-w-3xl w-full">
          <div className="font-semibold">{selected.size} selected</div>
          <div className="flex-1" />
          <div className="relative">
            <button className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm">Add to Category ▾</button>
          </div>
          <button className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-sm"
            onClick={() => setSelected(new Set())}
          >Clear</button>
        </div>
      </div>
    </div>
  );
}
