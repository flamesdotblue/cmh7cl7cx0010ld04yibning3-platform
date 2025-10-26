import React, { useMemo, useRef, useState } from 'react';

function tokenize(text) {
  return (text || '').split(/\s+/).filter(Boolean);
}

function simpleCostForText(text) {
  // pseudo tokenization cost model for local compute
  const tokens = tokenize(text).length;
  const ratePerToken = 0.00002; // arbitrary units per token
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

// Local toy LLM: hybrid of keyword routing, simple math, small Markov-like continuation
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
    return 'Image understanding available. Upload in Image Lab to analyze dominant colors, dimensions, and luminance histogram.';
  }
  // Basic planning and continuation
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

function runAgents(prompt) {
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
    {
      name: 'Analyst',
      run: (p) => toyLLM(p)
    },
    {
      name: 'Designer',
      run: (p) => (/logo|brand/i.test(p) ? 'Will craft vector logo with geometric primitives and typography grid.' : 'Ready for visual ideation and layout options.')
    },
    {
      name: 'Verifier',
      run: (p) => 'Checkpoints: goals defined, tools mapped, result verifiable. Risks: ambiguity, missing constraints.'
    },
  ];
  return agents.map((a) => ({ role: a.name, content: a.run(prompt) }));
}

export default function MultiAgentWorkbench({ user, onCostAccrue, onLogAdded }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const handleSend = () => {
    if (!canSend) return;
    const prompt = input.trim();
    setInput('');
    const userMsg = { role: 'User', content: prompt };
    const agentReplies = runAgents(prompt);
    const cost = simpleCostForText(prompt + ' ' + agentReplies.map(r => r.content).join(' '));

    setMessages((m) => [...m, userMsg, ...agentReplies]);
    addLog({ user: user?.email || 'guest', type: 'workbench', prompt, response: agentReplies });
    updateCost(cost);
    onCostAccrue?.(cost);
    onLogAdded?.();

    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, 30);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden flex flex-col h-[70vh]">
          <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-white/60 text-sm">Start by asking the agents to analyze a problem, compute something, plan a project, create a logo, or render a Ghibli-like scene.</div>
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
            <li>Analyst – local toy LLM reasoning</li>
            <li>Designer – creative guidance</li>
            <li>Verifier – checks and risks</li>
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 p-4 bg-white/5">
          <div className="font-medium">Tips</div>
          <ul className="mt-2 text-sm text-white/80 list-disc list-inside space-y-1">
            <li>Ask to compute math expressions.</li>
            <li>Say "create a logo" or "render ghibli scene".</li>
            <li>Upload images in Image Lab for analysis.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
