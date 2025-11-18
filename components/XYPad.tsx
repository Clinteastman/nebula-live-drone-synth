
import React, { useState, useEffect, useRef } from 'react';

interface XYPadProps {
  x: number; // 0 to 1
  y: number; // 0 to 1
  onChange: (x: number, y: number) => void;
  label: string;
  labelX?: string;
  labelY?: string;
}

const XYPad: React.FC<XYPadProps> = ({ x, y, onChange, label, labelX = "X", labelY = "Y" }) => {
  const [isDragging, setIsDragging] = useState(false);
  const padRef = useRef<HTMLDivElement>(null);

  const handleInteraction = (clientX: number, clientY: number) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    
    let newX = (clientX - rect.left) / rect.width;
    let newY = 1 - ((clientY - rect.top) / rect.height); // Invert Y so bottom is 0

    newX = Math.max(0, Math.min(1, newX));
    newY = Math.max(0, Math.min(1, newY));

    onChange(newX, newY);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleInteraction(e.clientX, e.clientY);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging) return;
      handleInteraction(e.clientX, e.clientY);
    };
    
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault(); // Prevent scrolling
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging]);

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{label}</span>
        {isDragging && <span className="text-[10px] font-mono text-cyan-400 animate-pulse">ACTIVE</span>}
      </div>
      
      <div 
        ref={padRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className={`
          relative w-full flex-1 min-h-[180px] rounded-lg border border-slate-700 bg-slate-900/80 overflow-hidden cursor-crosshair
          shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]
          ${isDragging ? 'border-cyan-500/50' : ''}
          transition-colors
        `}
      >
        {/* Grid Lines */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ 
               backgroundImage: `linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)`, 
               backgroundSize: '20% 20%' 
             }} 
        />

        {/* Axis Labels */}
        <div className="absolute bottom-2 right-2 text-[9px] text-slate-600 font-mono pointer-events-none uppercase">{labelX}</div>
        <div className="absolute top-2 left-2 text-[9px] text-slate-600 font-mono pointer-events-none vertical-rl rotate-180 uppercase" style={{ writingMode: 'vertical-rl' }}>{labelY}</div>

        {/* Cursor */}
        <div 
          className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)] bg-cyan-500/20 pointer-events-none backdrop-blur-sm"
          style={{ 
            left: `${x * 100}%`, 
            bottom: `${y * 100}%`,
            transition: isDragging ? 'none' : 'all 0.1s ease-out'
          }}
        >
            <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>
        
        {/* Crosshairs when dragging */}
        {isDragging && (
          <>
            <div className="absolute h-full w-[1px] bg-cyan-500/30 pointer-events-none" style={{ left: `${x * 100}%` }} />
            <div className="absolute w-full h-[1px] bg-cyan-500/30 pointer-events-none" style={{ bottom: `${y * 100}%` }} />
          </>
        )}
      </div>
    </div>
  );
};

export default XYPad;
