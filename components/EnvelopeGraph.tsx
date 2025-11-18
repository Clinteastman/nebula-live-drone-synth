import React, { useRef, useState, useEffect } from 'react';
import { ADSR } from '../types';

interface EnvelopeGraphProps {
  adsr: ADSR;
  onChange: (adsr: ADSR) => void;
  color?: string;
}

const EnvelopeGraph: React.FC<EnvelopeGraphProps> = ({ adsr, onChange, color = '#06b6d4' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'attack' | 'decay' | 'sustain' | 'release' | null>(null);
  const [dimensions, setDimensions] = useState({ width: 200, height: 100 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { width, height } = dimensions;
  const padding = 10;
  // Ensure graph dimensions are positive
  const graphWidth = Math.max(1, width - padding * 2);
  const graphHeight = Math.max(1, height - padding * 2);

  // Scales
  // Time (X): Total viewable time = 4 seconds (arbitrary max)
  const maxTime = 4; 
  const timeScale = graphWidth / maxTime;
  
  // Level (Y): 0 to 1
  const levelScale = graphHeight;

  // Coordinates
  const startX = padding;
  const startY = height - padding;

  const attackX = startX + adsr.attack * timeScale;
  const attackY = startY - levelScale; // Peak (1.0)

  const decayX = attackX + adsr.decay * timeScale;
  const decayY = startY - (adsr.sustain * levelScale);

  const releaseX = decayX + adsr.release * timeScale; // Visualizing release from sustain point
  const releaseY = startY;

  // Path
  const pathData = `
    M ${startX} ${startY}
    L ${attackX} ${attackY}
    L ${decayX} ${decayY}
    L ${releaseX} ${releaseY}
  `;

  const handleMouseDown = (point: 'attack' | 'decay' | 'sustain' | 'release') => {
    setDragging(point);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    
    // Since we are using 1:1 mapping now, scale is 1
    const x = e.clientX - rect.left - padding;
    const y = e.clientY - rect.top - padding;

    // Normalized coords
    const t = Math.max(0, x / timeScale);
    const l = Math.max(0, Math.min(1, 1 - (y / levelScale)));

    const newAdsr = { ...adsr };

    if (dragging === 'attack') {
      newAdsr.attack = Math.min(2, Math.max(0.01, t));
    } else if (dragging === 'decay') {
      // Decay time is relative to attack
      const d = t - adsr.attack;
      newAdsr.decay = Math.min(2, Math.max(0.01, d));
      newAdsr.sustain = l; // Dragging decay point also changes sustain level
    } else if (dragging === 'sustain') {
       // Just level
       newAdsr.sustain = l;
    } else if (dragging === 'release') {
       // Release time is relative to decay end
       const r = t - (adsr.attack + adsr.decay);
       newAdsr.release = Math.min(5, Math.max(0.01, r));
    }

    onChange(newAdsr);
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, adsr, width, height]); // Dependencies updated

  const renderHandle = (cx: number, cy: number, point: 'attack' | 'decay' | 'release') => (
    <g onMouseDown={() => handleMouseDown(point)} className="cursor-pointer group">
      {/* Transparent Hit Target */}
      <circle cx={cx} cy={cy} r="12" fill="transparent" />
      {/* Visible Handle */}
      <circle 
        cx={cx} cy={cy} r="4" 
        fill="white" 
        className="group-hover:fill-cyan-200 transition-colors"
      />
    </g>
  );

  return (
    <div ref={containerRef} className="bg-slate-900/50 rounded-lg p-2 border border-slate-800 select-none h-full flex flex-col">
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible cursor-crosshair flex-1"
      >
        {/* Grid/Guides */}
        <line x1={startX} y1={startY} x2={width-padding} y2={startY} stroke="#334155" strokeWidth="1" />
        <line x1={startX} y1={startY} x2={startX} y2={padding} stroke="#334155" strokeWidth="1" />

        {/* Fill */}
        <path d={`${pathData} L ${releaseX} ${startY} Z`} fill={color} fillOpacity="0.2" />
        
        {/* Line */}
        <path d={pathData} stroke={color} strokeWidth="2" fill="none" />

        {/* Handles */}
        {renderHandle(attackX, attackY, 'attack')}
        {renderHandle(decayX, decayY, 'decay')}
        {renderHandle(releaseX, releaseY, 'release')}
      </svg>
      
      <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1 uppercase shrink-0">
        <div>A: {adsr.attack.toFixed(2)}s</div>
        <div>D: {adsr.decay.toFixed(2)}s</div>
        <div>S: {adsr.sustain.toFixed(2)}</div>
        <div>R: {adsr.release.toFixed(2)}s</div>
      </div>
    </div>
  );
};

export default EnvelopeGraph;
