import { useEffect, useMemo, useRef, useState } from 'react';

// ===== simple gate to cap concurrent image starts =====
const MAX_IN_FLIGHT = 12;
let inflight = 0;
const queue = [];
function gateLoad(start) {
  if (inflight < MAX_IN_FLIGHT) {
    inflight++;
    start().finally(() => {
      inflight--;
      const next = queue.shift();
      if (next) gateLoad(next);
    });
  } else {
    queue.push(start);
  }
}

// ===== Avatar retry registry =====
const retryMap = new Map(); // key: channelId, value: { tries: number, last: number }
function scheduleRetry(id, fn, delay = 2000) {
  const t = setTimeout(fn, delay);
  return () => clearTimeout(t);
}

// ===== Avatar component =====
function Avatar({ ch, isSelected, isAssigned, onRetry }) {
  const [errored, setErrored] = useState(false);
  const [src, setSrc] = useState(null);
  const [nonce, setNonce] = useState(0);
  const ref = useRef(null);

  const sizeCls =
    ch.size === 'xs' ? "w-12 h-12" :
    ch.size === 'sm' ? "w-16 h-16" :
    ch.size === 'md' ? "w-20 h-20" : "w-24 h-24";

  const initials = (ch.title || "?")
    .split(' ').slice(0,2).map(s => s[0]).join('').toUpperCase();

  const tryLoad = () => {
    setErrored(false);
    setSrc(null);
    setNonce(n => n + 1);
  };

  useEffect(() => {
    if (!ref.current) return;
    let observer;
    let cancelled = false;

    const start = () => new Promise(resolve => {
      if (cancelled) return resolve();
      setSrc(ch.thumb || null);
      resolve();
    });

    if (ch._eager) {
      // First screenful per cluster: start immediately but still through the gate
      gateLoad(start);
      return () => { cancelled = true; };
    }

    observer = new IntersectionObserver(entries => {
      const e = entries[0];
      if (e && e.isIntersecting) {
        observer.disconnect();
        gateLoad(start);
      }
    }, { rootMargin: '250px' });

    observer.observe(ref.current);
    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
    };
  }, [ch.thumb, ch._eager, nonce]);

  // when image errors:
  const handleError = () => {
    setErrored(true);
    const rec = retryMap.get(ch.id) || { tries: 0, last: 0 };
    if (rec.tries < 2) {
      rec.tries += 1;
      rec.last = Date.now();
      retryMap.set(ch.id, rec);
      scheduleRetry(ch.id, () => {
        tryLoad();
        onRetry?.(ch.id); // let parent know we retried (optional)
      }, 1500 * rec.tries); // small backoff
    }
  };

  return (
    <div
      ref={ref}
      className={[
        "relative rounded-full overflow-hidden bg-slate-800 border border-white/10",
        sizeCls,
        isSelected ? "ring-2 ring-emerald-300" : isAssigned ? "ring-2 ring-emerald-500/70" : ""
      ].join(" ")}
    >
      {src && !errored ? (
        <img
          src={src}
          alt={ch.title}
          loading={ch._eager ? "eager" : "lazy"}
          fetchpriority={ch._eager ? "high" : "auto"}
          decoding="async"
          className="w-full h-full object-cover"
          onError={handleError}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-200 font-semibold">
          {initials}
        </div>
      )}

      {isAssigned && (
        <div className="absolute inset-0 flex items-center justify-center bg-emerald-600/25">
          <svg viewBox="0 0 24 24" className="w-9 h-9 text-emerald-300 drop-shadow">
            <path fill="currentColor" d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z"/>
          </svg>
        </div>
      )}
    </div>
  );
}

export default function AutoOrganize() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [hidden, setHidden] = useState(new Set());
  const [q, setQ] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [hoveredChannel, setHoveredChannel] = useState(null);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const [cats, setCats] = useState([]);
  const [catOpen, setCatOpen] = useState(false);
  const [assigned, setAssigned] = useState(new Map()); // channelId -> true
  const catBtnRef = useRef(null);
  const catMenuRef = useRef(null);

  useEffect(() => {
    fetch('/api/auto-organize')
      .then(r => r.json())
      .then(json => {
        setData(json);

        // Build assigned map: channelId -> true if has any cats
        const map = new Map();
        for (const c of json.clusters || []) {
          for (const ch of c.channels || []) {
            if (Array.isArray(ch.cats) && ch.cats.length > 0) {
              map.set(ch.id, true);
            }
          }
        }
        setAssigned(map);
      });
  }, []);

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => setCats(Array.isArray(d.categories) ? d.categories : []))
      .catch(() => setCats([]));
  }, []);

  // Post-load sweep for avatar retries
  useEffect(() => {
    const sweep = () => {
      // trigger a retry for any errored entries with remaining tries
      for (const [id, rec] of retryMap.entries()) {
        if (rec.tries < 2) {
          // NOP — the per-avatar registry already scheduled, nothing global needed
        }
      }
    };
    // first sweep a few seconds after initial render
    const t = setTimeout(sweep, 3000);

    // debounced scroll-end sweep
    let st;
    const onScroll = () => {
      clearTimeout(st);
      st = setTimeout(sweep, 500);
    };
    window.addEventListener('scroll', onScroll);
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); };
  }, []);

  // Esc + click-outside for category dropdown
  useEffect(() => {
    if (!catOpen) return;
    function onKey(e){ if (e.key === 'Escape') setCatOpen(false); }
    function onClick(e){
      const m = catMenuRef.current;
      const b = catBtnRef.current;
      if (!m || !b) return;
      if (m.contains(e.target) || b.contains(e.target)) return;
      setCatOpen(false);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [catOpen]);

  const clusters = useMemo(() => {
    if (!data) return [];
    const query = q.trim().toLowerCase();
    return data.clusters.filter(c => {
      if (hidden.has(c.id) && !showHidden) return false;
      if (!query) return true;
      if (c.label.toLowerCase().includes(query)) return true;
      return false;
    });
  }, [data, q, hidden, showHidden]);

  function toggle(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  function toggleCluster(clusterId) {
    const next = new Set(hidden);
    next.has(clusterId) ? next.delete(clusterId) : next.add(clusterId);
    setHidden(next);
  }

  function selectAllInCluster(cluster) {
    const next = new Set(selected);
    cluster.channels.forEach(ch => next.add(ch.id));
    setSelected(next);
  }

  function deselectAllInCluster(cluster) {
    const next = new Set(selected);
    cluster.channels.forEach(ch => next.delete(ch.id));
    setSelected(next);
  }

  async function handleBulkAssign(category) {
    const ids = Array.from(selected || []);
    if (!category || ids.length === 0) {
      // TODO: toast ("Pick at least one channel")
      return;
    }
    try {
      const res = await fetch('/api/categories/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelIds: ids, category })
      });
      if (!res.ok) throw new Error('bulk-assign failed');

      // optimistic mark
      setAssigned(prev => {
        const next = new Map(prev);
        ids.forEach(id => next.set(id, true));
        return next;
      });

      // TODO: toast success (e.g., `Added ${ids.length} to ${category}`)
      // optional: clear selection
      // setSelected(new Set());
      // close menu if open (we'll add drop-up state below)
      setCatOpen(false);
    } catch (e) {
      // TODO: toast error
      console.error(e);
    }
  }

  async function handleCustomCategory() {
    const name = window.prompt('Enter category name…');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });
    } catch {}

    // Refresh from server to get the live list
    const res = await fetch('/api/categories', { cache: 'no-store' }).then(r => r.json());
    setCats(Array.isArray(res.categories) ? res.categories : []);

    await handleBulkAssign(trimmed);
  }

  if (!data) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <div className="text-slate-300 text-lg">Loading Auto Organize...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur bg-slate-950/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">🔄 Auto Organize</h1>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>{data.clusters.length} clusters</span>
                <span>•</span>
                <span>{data.clusters.reduce((acc, c) => acc + c.channels.length, 0)} channels</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search clusters and channels..."
                className="px-4 py-2 rounded-lg bg-slate-800/70 border border-white/10 text-white text-sm outline-none w-80 placeholder-slate-400"
              />
              <button
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
                onClick={() => fetch('/api/auto-organize/recompute', { method: 'POST' }).then(() => {
                  fetch('/api/auto-organize').then(r => r.json()).then(setData);
                })}
              >
                Recompute
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 pb-28 pt-3">
        {/* Hidden clusters indicator */}
        {hidden.size > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowHidden(!showHidden)}
              className="px-3 py-1 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
            >
              Show hidden ({hidden.size}) {showHidden ? '▲' : '▼'}
            </button>
          </div>
        )}

        {/* Clusters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {clusters.map((cluster, idx) => (
            <div
              key={cluster.id}
              className={`bg-slate-800/50 backdrop-blur rounded-xl border border-white/10 overflow-hidden ${
                cluster.span === 4 ? 'md:col-span-2 lg:col-span-2 xl:col-span-2' :
                cluster.span === 3 ? 'lg:col-span-2' :
                cluster.span === 2 ? 'md:col-span-2' : ''
              }`}
            >
              {/* Cluster Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                      {cluster.label}
                    </span>
                    <span className="text-sm text-slate-400">{cluster.channels.length} channels</span>
                  </div>

                  {/* Kebab Menu */}
                  <div className="relative">
                    <button
                      className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle cluster visibility or show menu
                      }}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-10 hidden">
                      <div className="py-1">
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                          onClick={() => selectAllInCluster(cluster)}
                        >
                          Select all
                        </button>
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                          onClick={() => deselectAllInCluster(cluster)}
                        >
                          Deselect all
                        </button>
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                          onClick={() => {
                            // Add all to category
                          }}
                        >
                          Add all to Category...
                        </button>
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
                          onClick={() => toggleCluster(cluster.id)}
                        >
                          Hide cluster
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Channels Grid */}
              <div className="p-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {cluster.channels.map((ch, idx) => {
                    const eager = idx < 32; // tweak if needed
                    const withEager = { ...ch, _eager: eager };
                    return (
                      <div key={ch.id}
                           className="flex flex-col items-center gap-1 cursor-pointer"
                           onClick={() => toggle(ch.id)}>
                        <Avatar
                          ch={withEager}
                          isSelected={selected.has(ch.id)}
                          isAssigned={assigned.get(ch.id) === true}
                        />
                        <div className="w-full text-center text-xs text-white/80 truncate" title={ch.title}>
                          {ch.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-slate-900/90 backdrop-blur border border-white/10 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="text-white font-semibold">
              {selected.size} selected
            </div>

            <div className="relative">
              <button
                ref={catBtnRef}
                className="px-3 py-2 rounded-lg bg-emerald-700 text-white text-sm"
                onClick={() => setCatOpen(v => !v)}
              >
                Add to Category ▾
              </button>

              {catOpen && (
                <div
                  ref={catMenuRef}
                  className="absolute bottom-12 left-0 bg-slate-900/95 border border-white/10 rounded-lg p-1 min-w-[240px] z-50 shadow-xl"
                >
                  {cats.length === 0 && (
                    <div className="px-3 py-2 text-xs text-slate-300">No categories yet</div>
                  )}
                  {cats.map(name => (
                    <button
                      key={name}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5"
                      onClick={() => handleBulkAssign(name)}
                    >
                      {name}
                    </button>
                  ))}
                  <div className="border-t border-white/10 my-1" />
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5"
                    onClick={handleCustomCategory}
                  >
                    Custom…
                  </button>
                </div>
              )}
            </div>

            <button
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
