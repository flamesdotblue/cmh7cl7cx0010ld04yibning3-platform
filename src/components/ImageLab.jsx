import React, { useEffect, useMemo, useRef, useState } from 'react';

function addLog(entry) {
  const prev = JSON.parse(localStorage.getItem('query_logs') || '[]');
  prev.unshift({ id: crypto.randomUUID(), time: Date.now(), ...entry });
  localStorage.setItem('query_logs', JSON.stringify(prev.slice(0, 500)));
}

function analyzeImage(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  canvas.width = w; canvas.height = h;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);
  let r=0,g=0,b=0,count=0;
  const step = Math.max(1, Math.floor((w*h)/20000));
  for (let i=0; i<data.length; i += 4*step) {
    r += data[i]; g += data[i+1]; b += data[i+2]; count++;
  }
  const avg = { r: Math.round(r/count), g: Math.round(g/count), b: Math.round(b/count) };
  const luminance = Math.round((0.2126*avg.r + 0.7152*avg.g + 0.0722*avg.b));
  return { width: w, height: h, avgColor: avg, luminance };
}

function rgbToHex({r,g,b}) {
  return '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}

function generateGhibli(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth;
  const h = canvas.height = canvas.clientHeight;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#4f46e5');
  sky.addColorStop(0.5, '#7c3aed');
  sky.addColorStop(1, '#f97316');
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,w,h);

  const cx = w*0.75, cy = h*0.25, r = Math.min(w,h)*0.18;
  const rad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  rad.addColorStop(0, 'rgba(255,255,220,0.9)');
  rad.addColorStop(1, 'rgba(255,255,220,0)');
  ctx.fillStyle = rad; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();

  function mountain(yBase, color, roughness=0.008, amplitude=40) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0,h);
    for (let x=0; x<=w; x++) {
      const y = yBase + Math.sin(x*roughness) * amplitude + Math.cos(x*roughness*0.7)*amplitude*0.5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w,h); ctx.closePath(); ctx.fill();
  }
  mountain(h*0.7, 'rgba(20,20,40,0.7)', 0.01, 30);
  mountain(h*0.8, 'rgba(10,10,30,0.8)', 0.013, 40);
  mountain(h*0.9, 'rgba(5,5,20,0.9)', 0.016, 50);

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  for (let i=0; i<40; i++) {
    const x = Math.random()*w;
    const y = h*0.85 + Math.random()*h*0.15;
    const s = 4 + Math.random()*10;
    ctx.beginPath();
    for (let j=0; j<6; j++) {
      ctx.ellipse(x + Math.random()*s, y - j*s*0.8, s*0.8, s*0.4, Math.random(), 0, Math.PI*2);
    }
    ctx.fill();
  }
}

function generateLogoSVG(text, palette) {
  const colors = palette?.length ? palette : ['#6c5ce7','#00d2d3','#f368e0'];
  const safeText = (text || 'Aether').slice(0, 24);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"640\" height=\"360\" viewBox=\"0 0 640 360\">\n  <defs>\n    <linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n      <stop offset=\"0%\" stop-color=\"${colors[0]}\"/>\n      <stop offset=\"50%\" stop-color=\"${colors[1 % colors.length]}\"/>\n      <stop offset=\"100%\" stop-color=\"${colors[2 % colors.length]}\"/>\n    </linearGradient>\n  </defs>\n  <rect width=\"100%\" height=\"100%\" fill=\"#0b0b12\"/>\n  <g transform=\"translate(320,180)\">\n    <circle r=\"80\" fill=\"url(#g)\" opacity=\"0.9\"/>\n    <rect x=\"-120\" y=\"-20\" width=\"240\" height=\"40\" rx=\"20\" fill=\"none\" stroke=\"url(#g)\" stroke-width=\"6\"/>\n    <g transform=\"translate(0,0)\">\n      <text x=\"0\" y=\"8\" text-anchor=\"middle\" fill=\"#ffffff\" font-family=\"Inter, system-ui\" font-size=\"28\" font-weight=\"700\">${safeText}</text>\n    </g>\n  </g>\n</svg>`;
}

export default function ImageLab({ onLogAdded }) {
  const [file, setFile] = useState(null);
  const [imgUrl, setImgUrl] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [logoText, setLogoText] = useState('Aether Agents');
  const [caption, setCaption] = useState('');
  const [loadingCaption, setLoadingCaption] = useState(false);
  const [capErr, setCapErr] = useState('');
  const canvasRef = useRef(null);
  const imgElRef = useRef(null);

  useEffect(() => {
    if (!imgUrl) return;
    const img = new Image();
    img.onload = () => {
      const res = analyzeImage(img);
      setAnalysis(res);
      addLog({ type: 'image-analysis', prompt: 'analyze image', response: res });
      onLogAdded?.();
    };
    img.src = imgUrl;
  }, [imgUrl, onLogAdded]);

  const avgHex = useMemo(() => analysis ? rgbToHex(analysis.avgColor) : '#000000', [analysis]);

  const handleFile = (f) => {
    if (!f) return;
    setCaption('');
    setCapErr('');
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImgUrl(e.target.result);
    };
    reader.readAsDataURL(f);
  };

  const handleGhibli = () => {
    const c = canvasRef.current;
    if (!c) return;
    generateGhibli(c);
    const prompt = 'generate ghibli scene';
    addLog({ type: 'image-generate', prompt, response: 'Rendered Ghibli-like scenery on canvas.' });
    onLogAdded?.();
  };

  const handleDownloadLogo = () => {
    const svg = generateLogoSVG(logoText);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'logo.svg'; a.click();
    URL.revokeObjectURL(url);
    addLog({ type: 'logo-generate', prompt: logoText, response: 'SVG logo generated and downloaded.' });
    onLogAdded?.();
  };

  const handleCaption = async () => {
    if (!imgElRef.current) return;
    setLoadingCaption(true);
    setCapErr('');
    try {
      const { pipeline } = await import('@xenova/transformers');
      const captioner = await pipeline('image-to-text', 'Xenova/blip-image-captioning-base');
      const out = await captioner(imgElRef.current);
      const text = Array.isArray(out) ? (out[0]?.generated_text || '') : (out?.generated_text || '');
      setCaption(text);
      addLog({ type: 'image-caption', prompt: 'caption image', response: text });
      onLogAdded?.();
    } catch (e) {
      setCapErr((e && e.message) || 'Failed to caption image.');
    } finally {
      setLoadingCaption(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 p-4 bg-white/5">
          <div className="font-medium mb-3">Upload & Understand Image</div>
          <div className="flex items-center gap-3">
            <label className="px-4 py-2 rounded-md bg-white text-black hover:bg-gray-100 cursor-pointer">Choose Image
              <input type="file" accept="image/*" className="hidden" onChange={(e)=>handleFile(e.target.files?.[0])} />
            </label>
            {file && <div className="text-sm text-white/80">{file.name}</div>}
          </div>
          {imgUrl && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <img ref={imgElRef} src={imgUrl} alt="uploaded" className="w-full rounded-lg border border-white/10" />
              <div className="text-sm text-white/80 space-y-2">
                <div>Dimensions: {analysis?.width} × {analysis?.height}</div>
                <div className="flex items-center gap-2">Avg Color: <span className="inline-block w-5 h-5 rounded" style={{ background: avgHex }} /> <code className="text-white/60">{avgHex}</code></div>
                <div>Est. Luminance: {analysis?.luminance}</div>
                <div className="pt-2 border-t border-white/10">
                  <button onClick={handleCaption} disabled={loadingCaption} className="px-3 py-1.5 rounded-md bg-white text-black hover:bg-gray-100 disabled:opacity-60">{loadingCaption ? 'Captioning…' : 'Caption Image'}</button>
                  {caption && <div className="mt-2 text-white/90">“{caption}”</div>}
                  {capErr && <div className="mt-2 text-red-300 text-xs">{capErr}</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 p-4 bg-white/5">
          <div className="font-medium mb-3">Logo Generator (SVG)</div>
          <div className="flex gap-2 mb-3">
            <input value={logoText} onChange={(e)=>setLogoText(e.target.value)} placeholder="Brand name" className="flex-1 px-3 py-2 rounded-md bg-black/40 border border-white/10 focus:outline-none" />
            <button onClick={handleDownloadLogo} className="px-4 py-2 rounded-md bg-white text-black hover:bg-gray-100">Download SVG</button>
          </div>
          <div className="rounded-lg overflow-hidden border border-white/10 bg-black/40">
            <iframe title="logo-preview" sandbox="allow-scripts allow-same-origin" className="w-full h-56" srcDoc={generateLogoSVG(logoText)} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 p-4 bg-white/5">
          <div className="font-medium mb-3">Ghibli Scene Painter</div>
          <div className="aspect-video w-full rounded-lg border border-white/10 overflow-hidden bg-black/40">
            <canvas ref={canvasRef} className="w-full h-full" />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleGhibli} className="px-4 py-2 rounded-md bg-white text-black hover:bg-gray-100">Render Scene</button>
            <button onClick={() => { const c = canvasRef.current; if (!c) return; const url = c.toDataURL('image/png'); const a = document.createElement('a'); a.href = url; a.download = 'ghibli-scene.png'; a.click(); }} className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20">Download PNG</button>
          </div>
        </div>
      </div>
    </div>
  );
}
