import React from 'react';
import Spline from '@splinetool/react-spline';

export default function HeroSection({ onGetStarted }) {
  return (
    <section className="relative h-[70vh] md:h-[78vh] w-full">
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/4cHQr84zOGAHOehh/scene.splinecode" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[#0b0b12]" />
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl md:text-6xl font-semibold tracking-tight">Aether Agents</h1>
        <p className="mt-4 text-white/80 max-w-2xl">A local-first multi-agent AI system for reasoning, analysis, image understanding, and creative generation. Runs in your browser, no API keys.</p>
        <div className="mt-8 flex gap-3">
          <button onClick={onGetStarted} className="pointer-events-auto px-5 py-2.5 rounded-md bg-white text-black hover:bg-gray-100 transition">Open Workbench</button>
          <a href="#imagelab" onClick={(e)=>e.preventDefault()} className="pointer-events-auto px-5 py-2.5 rounded-md bg-white/10 text-white hover:bg-white/20 transition">Explore Image Lab</a>
        </div>
      </div>
    </section>
  );
}
