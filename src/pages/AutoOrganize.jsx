import { useEffect, useMemo, useState } from 'react';

export default function AutoOrganize() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [hidden, setHidden] = useState(new Set());
  const [q, setQ] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [hoveredChannel, setHoveredChannel] = useState(null);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');

  useEffect(() => {
    fetch('/api/auto-organize').then(r => r.json()).then(setData);
  }, []);

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

  function handleBulkAssign() {
    if (!categoryInput.trim() || selected.size === 0) return;

    fetch('/api/categories/bulk-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelIds: Array.from(selected),
        category: categoryInput.trim()
      })
    }).then(r => r.json()).then(result => {
      if (result.ok) {
        setSelected(new Set());
        setCategoryInput('');
        setShowCategoryMenu(false);
        // Show success toast
        console.log('Categories assigned successfully');
      }
    });
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
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
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
      <div className="max-w-7xl mx-auto p-6">
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
                  {cluster.channels.map(ch => (
                    <div
                      key={ch.id}
                      className="flex flex-col items-center gap-1 cursor-pointer"
                      onClick={() => toggle(ch.id)}
                    >
                      {/* Avatar wrapper is the thing that needs the ring */}
                      <div
                        className={[
                          "relative rounded-full overflow-hidden bg-slate-800 border border-white/10",
                          ch.size === 'xs' ? "w-14 h-14" :
                          ch.size === 'sm' ? "w-18 h-18" :
                          ch.size === 'md' ? "w-24 h-24" : "w-32 h-32",
                          selected.has(ch.id) ? "ring-2 ring-blue-300 ring-offset-0" : ""
                        ].join(" ")}
                      >
                        {ch.thumb ? (
                          <img
                            src={ch.thumb}
                            alt={ch.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200 font-semibold">
                            {(ch.title || "?").split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase()}
                          </div>
                        )}

                        {/* Tooltip */}
                        <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+10px)] w-72
                                        bg-slate-900 text-slate-100 border border-white/10 shadow-xl rounded-lg p-3 text-xs z-50">
                          <div className="font-semibold mb-1">{ch.title}</div>
                          <div className="opacity-80 line-clamp-4">{ch.desc}</div>
                          <div className="opacity-60 mt-1">Videos: {ch.videoCount ?? 0}</div>
                        </div>
                      </div>

                      <div className="w-full text-center text-xs text-white/80 truncate" title={ch.title}>
                        {ch.title}
                      </div>
                    </div>
                  ))}
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
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              >
                Add to Category ▾
              </button>

              {showCategoryMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-slate-800 border border-white/10 rounded-lg shadow-xl p-3 min-w-64">
                  <input
                    type="text"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    placeholder="Enter category name..."
                    className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white text-sm outline-none mb-3"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleBulkAssign();
                      if (e.key === 'Escape') setShowCategoryMenu(false);
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                      onClick={handleBulkAssign}
                    >
                      Assign
                    </button>
                    <button
                      className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm"
                      onClick={() => setShowCategoryMenu(false)}
                    >
                      Cancel
                    </button>
                  </div>
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
