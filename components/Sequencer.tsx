import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Clock } from 'lucide-react';

interface SequencerProps {
  isPlaying: boolean;
  onStep: (value: number) => void;
}

const STEPS = 8;

const Sequencer: React.FC<SequencerProps> = ({ isPlaying, onStep }) => {
  const [steps, setSteps] = useState<number[]>(new Array(STEPS).fill(0.5));
  const [currentStep, setCurrentStep] = useState(0);
  const [rate, setRate] = useState(2); // Hz
  const [active, setActive] = useState(false);
  
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (active && isPlaying) {
      const ms = (1 / rate) * 1000;
      intervalRef.current = window.setInterval(() => {
        setCurrentStep(prev => {
          const next = (prev + 1) % STEPS;
          onStep(steps[next]);
          return next;
        });
      }, ms);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, isPlaying, rate, steps, onStep]);

  const handleStepChange = (index: number, value: number) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActive(!active)}
            className={`p-1.5 rounded-full transition-colors ${active ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-500'}`}
          >
            {active ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sequencer</span>
        </div>
        
        <div className="flex items-center gap-2">
           <Clock className="w-3 h-3 text-slate-600" />
           <input 
             type="range" 
             min="0.1" max="10" step="0.1" 
             value={rate} 
             onChange={(e) => setRate(parseFloat(e.target.value))}
             className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
           />
           <span className="text-[9px] font-mono text-slate-400 w-8 text-right">{rate}Hz</span>
        </div>
      </div>

      <div className="flex gap-1 h-16 items-end">
        {steps.map((val, i) => (
          <div key={i} className="flex-1 flex flex-col gap-1 items-center group relative">
            <div 
               className={`w-full rounded-sm transition-all duration-100 ${i === currentStep && active && isPlaying ? 'bg-cyan-400' : 'bg-slate-700 group-hover:bg-slate-600'}`}
               style={{ height: `${val * 100}%` }}
            />
            {/* Invisible slider overlay */}
            <input 
              type="range" 
              min="0" max="1" step="0.01"
              value={val}
              onChange={(e) => handleStepChange(i, parseFloat(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ns-resize"
              title={`Step ${i+1}: ${val.toFixed(2)}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sequencer;
