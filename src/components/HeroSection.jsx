import React from 'react';

export default function HeroSection({ onGetStarted }) {
  return (
    <section className="relative h-[70vh] md:h-[78vh] w-full overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,.35),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,.35),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(249,115,22,.28),transparent_35%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[#0b0b12]" />
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl md:text-6xl font-semibold tracking-tight">Aether Agents</h1>
        <p className="mt-4 text-white/80 max-w-2xl">A local-first multi-agent AI system for reasoning, analysis, image understanding, and creative generation. Runs entirely in your browser.</p>
        <div className="mt-8 flex gap-3">
          <button onClick={onGetStarted} className="px-5 py-2.5 rounded-md bg-white text-black hover:bg-gray-100 transition">Open Workbench</button>
          <a href="#imagelab" onClick={(e)=>e.preventDefault()} className="px-5 py-2.5 rounded-md bg-white/10 text-white hover:bg-white/20 transition">Explore Image Lab</a>
        </div>
      </div>
    </section>
  );
}
