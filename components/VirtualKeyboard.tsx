import React from 'react';

interface VirtualKeyboardProps {
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ onNoteOn, onNoteOff }) => {
  const startNote = 48; // C3
  const keys = [
    { note: 48, type: 'white', label: 'C' },
    { note: 49, type: 'black', label: '' },
    { note: 50, type: 'white', label: 'D' },
    { note: 51, type: 'black', label: '' },
    { note: 52, type: 'white', label: 'E' },
    { note: 53, type: 'white', label: 'F' },
    { note: 54, type: 'black', label: '' },
    { note: 55, type: 'white', label: 'G' },
    { note: 56, type: 'black', label: '' },
    { note: 57, type: 'white', label: 'A' },
    { note: 58, type: 'black', label: '' },
    { note: 59, type: 'white', label: 'B' },
    { note: 60, type: 'white', label: 'C' },
  ];

  return (
    <div className="flex justify-center bg-slate-900/50 p-2 rounded-xl border border-slate-800 select-none">
      <div className="relative flex h-24">
        {keys.map((k, i) => (
          <div 
            key={k.note}
            className={`
              ${k.type === 'white' 
                ? 'w-10 h-full bg-slate-200 border-r border-slate-300 rounded-b-md z-0 active:bg-slate-400' 
                : 'w-6 h-16 bg-slate-900 absolute z-10 border border-slate-700 rounded-b-sm active:bg-black'
              }
              cursor-pointer flex items-end justify-center pb-1
            `}
            style={{
               // Positioning for black keys
               left: k.type === 'black' ? `${(i - 1) * 2.5 + 1.75}rem` : undefined,
               // Margin for white keys to stack horizontally
               marginLeft: k.type === 'white' && i > 0 && keys[i-1].type === 'white' ? '0' : undefined
            }}
            onMouseDown={() => onNoteOn(k.note)}
            onMouseUp={() => onNoteOff(k.note)}
            onMouseLeave={() => onNoteOff(k.note)}
            onTouchStart={(e) => { e.preventDefault(); onNoteOn(k.note); }}
            onTouchEnd={(e) => { e.preventDefault(); onNoteOff(k.note); }}
          >
            {k.type === 'white' && <span className="text-[10px] font-bold text-slate-500">{k.label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VirtualKeyboard;
