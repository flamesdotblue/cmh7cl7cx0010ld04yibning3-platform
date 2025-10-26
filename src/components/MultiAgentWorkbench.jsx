import React, { useEffect, useMemo, useRef, useState } from 'react';

function tokenize(text) {
  return (text || '').split(/\s+/).filter(Boolean);
}

function simpleCostForText(text) {
  const tokens = tokenize(text).length;
  const ratePerToken = 0.00002;
  return tokens * ratePerToken;
}

function addLog(entry) {
  const prev = JSON.parse(localStorage.getItem('query_logs') || '[]');
  prev.unshift({ id: crypto.randomUUID(), time: Date.now(), ...entry });
  localStorage.setItem('query_logs', JSON.stringify(prev.slice(0, 500)));
}

function updateCost(delta) {
  const current = parseFloat(localStorage.getItem('cost_total') || '0');
  localStorage.setItem('cost_total', String(current + delta));
}

// Minimal local toy reasoning fallback
function toyLLM(prompt) {
  const lower = prompt.toLowerCase();
  if (/\b(calc|calculate|what is|compute)\b/.test(lower)) {
    try {
      const expr = prompt.replace(/[^0-9+\-*/().%^]/g, '');
      // eslint-disable-next-line no-new-func
      const val = Function(`return (${expr})`)();
      return `Computation result: ${val}`;
    } catch {
      return 'Unable to compute expression safely.';
    }
  }
  if (/logo|brand|icon/.test(lower)) {
    return 'Design brief parsed. Use Image Lab → Logo to generate an SVG logo. Suggested palette: #6c5ce7, #00d2d3, #f368e0.';
  }
  if (/ghibli|studio ghibli|scenery|landscape/.test(lower)) {
    return 'Concept art plan: layered gradients, mist, soft foliage, sun/moon glow. Use Image Lab → Ghibli Scene to render.';
  }
  if (/image|photo|picture|analy/.test(lower)) {
    return 'Image understanding available. Upload in Image Lab to analyze dominant colors, dimensions, and luminance.';
  }
  const steps = [
    'Clarify goals and constraints.',
    'Identify tools or agents needed.',
    'Execute stepwise with checks.',
    'Summarize results and next steps.'
  ];
  const seed = tokenize(prompt).slice(0, 20).join(' ');
  const continuation = `\nPlan:\n- ${steps.join('\n- ')}\n\nInitial thoughts: ${seed} → approach with modular agents and verifiable steps.`;
  return 'Analysis: Your request involves reasoning and synthesis.' + continuation;
}

function runHeuristicAgents(prompt) {
  const agents = [
    {
      name: 'Planner',
      run: (p) => {
        const tasks = [];
        if (/logo/i.test(p)) tasks.push('Generate logo concepts and export SVG.');
        if (/ghibli|scene|art/i.test(p)) tasks.push('Render Ghibli-like scenery with gradients and foliage.');
        if (/analy|image|photo/i.test(p)) tasks.push('Analyze uploaded image (dimensions, dominant colors).');
        if (/calc|compute|what is/i.test(p)) tasks.push('Evaluate mathematical expression.');
        if (tasks.length === 0) tasks.push('Perform general analysis and propose steps.');
        return 'Tasks: ' + tasks.join(' ');
      }
    },
    { name: 'Analyst', run: (p) => toyLLM(p) },
    { name: 'Designer', run: (p) => (/logo|brand/i.test(p) ? 'Will craft vector logo with geometric primitives and typography grid.' : 'Ready for visual ideation and layout options.') },
    { name: 'Verifier', run: () => 'Checkpoints: goals defined, tools mapped, result verifiable. Risks: ambiguity, missing constraints.' },
  ];
  return agents.map((a) => ({ role: a.name, content: a.run(prompt) }));
}

export default function MultiAgentWorkbench({ user, onCostAccrue, onLogAdded }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [engineState, setEngineState] = useState({ ready: false, loading: false, error: '' });
  const [modelId, setModelId] = useState('Phi-3.5-mini-instruct-q4f16_1-MLC');
  const engineRef = useRef(null);
  const listRef = useRef(null);

  const canSend = useMemo(() => input.trim().length > 0, [input]);
  const webgpu = typeof navigator !== 'undefined' && 'gpu' in navigator;

  useEffect(() => {
    // no auto-load to keep first paint fast
  }, []);

  const initEngine = async () => {
    if (engineRef.current || engineState.loading) return;
    setEngineState({ ready: false, loading: true, error: '' });
    try {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
      const engine = await CreateMLCEngine({
        model: modelId,
        // prefer to cache and reuse in browser
        appConfig: { useIndexedDBCache: true },
      });
      engineRef.current = engine;
      setEngineState({ ready: true, loading: false, error: '' });
    } catch (e) {
      setEngineState({ ready: false, loading: false, error: (e && e.message) || 'Failed to initialize local LLM.' });
    }
  };

  const llmReply = async (prompt) => {
    if (!engineRef.current) return null;
    try {
      const res = await engineRef.current.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a helpful multi-agent coordinator.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 256,
      });
      const text = res?.choices?.[0]?.message?.content ?? '';
      return text;
    } catch (e) {
      return null;
    }
  };

  const handleSend = async () => {
    if (!canSend) return;
    const prompt = input.trim();
    setInput('');
    const userMsg = { role: 'User', content: prompt };

    // If local LLM ready, get a primary assistant answer, then run heuristic agents as supplements
    let replies = [];
    let primary = null;
    if (engineRef.current) {
      primary = await llmReply(prompt);
    }

    if (primary) {
      replies.push({ role: 'Assistant', content: primary });
    }
    const agentReplies = runHeuristicAgents(prompt);
    replies = [...replies, ...agentReplies];

    const cost = simpleCostForText(prompt + ' ' + replies.map(r => r.content).join(' '));

    setMessages((m) => [...m, userMsg, ...replies]);
    addLog({ user: user?.email || 'guest', type: 'workbench', prompt, response: replies });
    updateCost(cost);
    onCostAccrue?.(cost);
    onLogAdded?.();

    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, 30);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 p-4 bg-white/5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">Local LLM</div>
          <div className="flex items-center gap-2 text-sm">
            <select value={modelId} onChange={(e)=>setModelId(e.target.value)} className="px-2 py-1 rounded-md bg-black/40 border border-white/10">
              <option value="Phi-3.5-mini-instruct-q4f16_1-MLC">Phi-3.5-mini-instruct (q4)</option>
              <option value="gemma-2b-it-q4f16_1-MLC">Gemma 2B IT (q4)</option>
            </select>
            <button onClick={initEngine} disabled={!webgpu || engineState.loading || engineState.ready} className={`px-3 py-1.5 rounded-md transition ${engineState.ready ? 'bg-emerald-500 text-black' : 'bg-white text-black hover:bg-gray-100 disabled:opacity-50'}`}>
              {engineState.loading ? 'Loading…' : engineState.ready ? 'Ready' : webgpu ? 'Enable Local LLM' : 'WebGPU Unavailable'}
            </button>
          </div>
        </div>
        {engineState.error && (
          <div className="text-xs text-red-300">{engineState.error}</div>
        )}
        {!engineState.ready && (
          <div className="text-xs text-white/60">Tip: Enabling the Local LLM downloads a small quantized model and runs it in your browser with WebGPU. If not enabled, a lightweight planner is used instead.</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden flex flex-col h-[70vh]">
            <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-white/60 text-sm">Ask the agents to analyze a problem, compute something, plan a project, create a logo, or render a Ghibli-like scene. Enable Local LLM for richer reasoning.</div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`p-3 rounded-lg ${m.role === 'User' ? 'bg-white/10' : 'bg-black/30 border border-white/10'}`}>
                  <div className="text-xs uppercase tracking-wide text-white/50">{m.role}</div>
                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 p-3 flex gap-2">
              <input value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ handleSend(); } }} placeholder="Ask anything (no API keys, local compute)" className="flex-1 px-3 py-2 rounded-md bg-black/40 border border-white/10 focus:outline-none" />
              <button disabled={!canSend} onClick={handleSend} className={`px-4 py-2 rounded-md transition ${canSend ? 'bg-white text-black hover:bg-gray-100' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}>Send</button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 p-4 bg-white/5">
            <div className="font-medium">Agents</div>
            <ul className="mt-2 text-sm text-white/80 list-disc list-inside space-y-1">
              <li>Planner – decomposes tasks</li>
              <li>Analyst – local LLM or toy fallback</li>
              <li>Designer – creative guidance</li>
              <li>Verifier – checks and risks</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 p-4 bg-white/5">
            <div className="font-medium">Tips</div>
            <ul className="mt-2 text-sm text-white/80 list-disc list-inside space-y-1">
              <li>Ask to compute math expressions.</li>
              <li>Say "create a logo" or "render ghibli scene".</li>
              <li>Upload images in Image Lab for analysis/captioning.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
