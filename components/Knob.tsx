import React, { useState, useEffect, useRef, useCallback } from 'react';

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  size?: number;
  color?: string;
}

const Knob: React.FC<KnobProps> = ({ 
  value, 
  min, 
  max, 
  step = 0.01, 
  onChange, 
  label, 
  size = 64,
  color = "text-cyan-400" 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(0);
  const knobRef = useRef<HTMLDivElement>(null);

  const range = max - min;
  // Map value to angle: -135deg to +135deg (total 270deg)
  const normalizedValue = (value - min) / range;
  const angle = normalizedValue * 270 - 135;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartValue(value);
    document.body.style.cursor = 'ns-resize';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setStartValue(value);
  };

  const handleMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    const deltaY = startY - clientY;
    // sensitivity: 200 pixels for full range
    const deltaValue = (deltaY / 200) * range;
    
    let newValue = startValue + deltaValue;
    newValue = Math.max(min, Math.min(max, newValue));
    
    if (step) {
      newValue = Math.round(newValue / step) * step;
    }
    
    onChange(newValue);
  }, [isDragging, startY, startValue, min, max, range, step, onChange]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientY);
    
    const onUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging, handleMove]);

  // SVG Geometry
  const radius = 40;
  const strokeWidth = 8;
  const center = 50;
  const circumference = 2 * Math.PI * radius;
  // 75% of circle is visible (270 degrees)
  const dashArray = circumference;
  const dashOffset = circumference * (1 - (normalizedValue * 0.75)); 
  // We need to rotate the svg circle to start at -135 deg.
  // Actually easier to just rotate the whole SVG element or use a path.
  
  // Let's use a simpler path arc approach for the meter
  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y, 
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const trackPath = describeArc(50, 50, 40, -135, 135);
  const valuePath = describeArc(50, 50, 40, -135, angle);

  return (
    <div className="flex flex-col items-center justify-center gap-1 select-none group" ref={knobRef}>
      <div 
        className="relative cursor-ns-resize"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          {/* Background Track */}
          <path d={trackPath} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d={trackPath} fill="none" stroke="#334155" strokeWidth={strokeWidth - 2} strokeLinecap="round" />
          
          {/* Value Arc */}
          <path 
            d={valuePath} 
            fill="none" 
            className={`${color} transition-all duration-75`}
            stroke="currentColor" 
            strokeWidth={strokeWidth - 2} 
            strokeLinecap="round" 
            style={{ filter: `drop-shadow(0 0 4px currentColor)` }}
          />
          
          {/* Indicator Dot */}
          {/* <circle cx="50" cy="50" r="4" fill="#fff" className="opacity-50" /> */}
        </svg>
        
        {/* Center display text (optional, hidden for cleaner look usually, but good for accessibility/debug) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 rounded-full">
           <span className="text-[10px] font-mono text-white">{value.toFixed(1)}</span>
        </div>
      </div>
      {label && <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{label}</span>}
    </div>
  );
};

export default Knob;
