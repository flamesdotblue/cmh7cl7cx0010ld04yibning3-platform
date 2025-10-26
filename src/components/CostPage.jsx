import React, { useMemo, useState } from 'react';

function formatCurrency(n) {
  return `$${(n || 0).toFixed(4)}`;
}

export default function CostPage({ totalCost }) {
  const [filter, setFilter] = useState('');
  const logs = useMemo(() => {
    const data = JSON.parse(localStorage.getItem('query_logs') || '[]');
    if (!filter) return data;
    return data.filter((l) => JSON.stringify(l).toLowerCase().includes(filter.toLowerCase()))
  }, [filter]);

  const clearLogs = () => {
    localStorage.removeItem('query_logs');
    window.location.reload();
  };

  const clearCost = () => {
    localStorage.setItem('cost_total', '0');
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 p-5 bg-white/5 flex items-center justify-between">
        <div>
          <div className="text-white/60 text-sm">Total Local Compute Cost</div>
          <div className="text-3xl font-semibold">{formatCurrency(parseFloat(localStorage.getItem('cost_total') || totalCost || 0))}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={clearCost} className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20">Reset Cost</button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 p-5 bg-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Query Logs</div>
          <div className="flex items-center gap-2">
            <input value={filter} onChange={(e)=>setFilter(e.target.value)} placeholder="Search logs" className="px-3 py-2 rounded-md bg-black/40 border border-white/10 focus:outline-none" />
            <button onClick={clearLogs} className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20">Clear Logs</button>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-auto space-y-3">
          {logs.length === 0 && <div className="text-sm text-white/60">No logs yet.</div>}
          {logs.map((l) => (
            <div key={l.id} className="p-3 rounded-lg bg-black/30 border border-white/10">
              <div className="text-[11px] uppercase tracking-wide text-white/50">{new Date(l.time).toLocaleString()} · {l.type}</div>
              <div className="mt-1 text-sm"><span className="text-white/60">Prompt:</span> {l.prompt || '—'}</div>
              <pre className="mt-2 text-xs whitespace-pre-wrap text-white/80">{typeof l.response === 'string' ? l.response : JSON.stringify(l.response, null, 2)}</pre>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 p-5 bg-white/5">
        <div className="font-medium mb-1">Notes</div>
        <p className="text-sm text-white/70">This app uses a browser-run LLM (optional) and image captioning model. All data stays local. Costs are simulated based on text length.</p>
      </div>
    </div>
  );
}
