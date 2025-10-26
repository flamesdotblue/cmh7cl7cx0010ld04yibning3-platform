import React, { useEffect, useMemo, useState } from 'react';
import HeroSection from './components/HeroSection.jsx';
import MultiAgentWorkbench from './components/MultiAgentWorkbench.jsx';
import ImageLab from './components/ImageLab.jsx';
import CostPage from './components/CostPage.jsx';

const TABS = [
  { key: 'home', label: 'Home' },
  { key: 'workbench', label: 'Agent Workbench' },
  { key: 'imagelab', label: 'Image Lab' },
  { key: 'costs', label: 'Costs & Logs' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState(null);
  const [costTotal, setCostTotal] = useState(0);
  const [logsVersion, setLogsVersion] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem('app_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    const ct = localStorage.getItem('cost_total');
    if (ct) setCostTotal(parseFloat(ct));
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    const password = e.target.password.value;
    if (!email || !password) return;
    const u = { email, time: Date.now() };
    localStorage.setItem('app_user', JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('app_user');
    setUser(null);
  };

  const onCostAccrue = (delta) => {
    const newTotal = Math.max(0, (parseFloat(localStorage.getItem('cost_total') || '0') + delta));
    localStorage.setItem('cost_total', String(newTotal));
    setCostTotal(newTotal);
  };

  const onLogAdded = () => setLogsVersion((v) => v + 1);

  const headerRight = useMemo(() => {
    if (user) {
      return (
        <div className="flex items-center gap-3">
          <div className="text-sm text-white/80">{user.email}</div>
          <button onClick={handleLogout} className="px-3 py-1.5 rounded-md bg-white/10 text-white hover:bg-white/20 transition">Logout</button>
        </div>
      );
    }
    return (
      <form onSubmit={handleLogin} className="flex items-center gap-2">
        <input name="email" type="email" placeholder="Email" className="px-3 py-1.5 rounded-md bg-white/10 text-white placeholder:text-white/60 focus:outline-none" />
        <input name="password" type="password" placeholder="Password" className="px-3 py-1.5 rounded-md bg-white/10 text-white placeholder:text-white/60 focus:outline-none" />
        <button className="px-3 py-1.5 rounded-md bg-white text-black hover:bg-gray-100 transition">Login</button>
      </form>
    );
  }, [user]);

  return (
    <div className="min-h-screen bg-[#0b0b12] text-white">
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-black/30 bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-orange-400" />
            <div>
              <div className="font-semibold">Aether Agents</div>
              <div className="text-xs text-white/60">Local multi-agent AI studio</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-3 py-1.5 rounded-md text-sm transition ${activeTab === t.key ? 'bg-white text-black' : 'text-white/80 hover:bg-white/10'}`}>{t.label}</button>
            ))}
          </nav>
          <div className="flex-1" />
          {headerRight}
        </div>
      </header>

      <main>
        {activeTab === 'home' && (
          <HeroSection onGetStarted={() => setActiveTab('workbench')} />
        )}
        {activeTab === 'workbench' && (
          <div className="max-w-7xl mx-auto px-4 py-10">
            <MultiAgentWorkbench user={user} onCostAccrue={onCostAccrue} onLogAdded={onLogAdded} />
          </div>
        )}
        {activeTab === 'imagelab' && (
          <div className="max-w-7xl mx-auto px-4 py-10">
            <ImageLab onLogAdded={onLogAdded} />
          </div>
        )}
        {activeTab === 'costs' && (
          <div className="max-w-7xl mx-auto px-4 py-10">
            <CostPage key={logsVersion} totalCost={costTotal} />
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 mt-10">
        <div className="max-w-7xl mx-auto px-4 py-6 text-sm text-white/60">Built with local-first ideas. No API keys; compute runs in your browser.</div>
      </footer>
    </div>
  );
}
