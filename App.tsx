
import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Zap, Waves, Sliders, Mic2, Volume2, Command, Search, Power, MousePointer2, Hash, CloudFog } from 'lucide-react';
import { SynthPatch, Waveform, LfoTarget, ADSR } from './types';
import { DEFAULT_PATCH } from './constants';
import { audioEngine } from './services/audioEngine';
import { generatePatch } from './services/geminiService';
import Knob from './components/Knob';
import Visualizer from './components/Visualizer';
import XYPad from './components/XYPad';
import EnvelopeGraph from './components/EnvelopeGraph';
import Sequencer from './components/Sequencer';
import VirtualKeyboard from './components/VirtualKeyboard';
import { presetManager } from './services/presetManager';
import { midiService, MidiMessage } from './services/midiService';
import { Save, FolderOpen, Download, Upload, Mic, Square, Shuffle, Sparkles, Music } from 'lucide-react';

type XYMode = 'filter' | 'delay' | 'reverb';

function App() {
  const [patch, setPatch] = useState<SynthPatch>(DEFAULT_PATCH);
  const [isPlaying, setIsPlaying] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xyMode, setXyMode] = useState<XYMode>('filter');
  const [isRecording, setIsRecording] = useState(false);
  const [isEvolving, setIsEvolving] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  // Sync AudioEngine with React State
  useEffect(() => {
    if (isPlaying) {
      audioEngine.applyPatch(patch);
    }
  }, [patch, isPlaying]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch(e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case '1':
          toggleOscMute(0);
          break;
        case '2':
          toggleOscMute(1);
          break;
        case '3':
          toggleOscMute(2);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, patch]);

  // Evolve Logic
  useEffect(() => {
    if (!isEvolving || !isPlaying) return;
    
    const interval = setInterval(() => {
        setPatch(p => ({
            ...p,
            filter: {
                ...p.filter,
                cutoff: Math.max(20, Math.min(10000, p.filter.cutoff + (Math.random() * 100 - 50))),
                resonance: Math.max(0, Math.min(20, p.filter.resonance + (Math.random() * 0.5 - 0.25)))
            },
            delay: {
                ...p.delay,
                time: Math.max(0, Math.min(2, p.delay.time + (Math.random() * 0.1 - 0.05))),
                feedback: Math.max(0, Math.min(0.95, p.delay.feedback + (Math.random() * 0.05 - 0.025)))
            }
        }));
    }, 1000); // Evolve every second

    return () => clearInterval(interval);
  }, [isEvolving, isPlaying]);

  // MIDI Integration
  useEffect(() => {
    const handleMidi = (msg: MidiMessage) => {
      if (msg.type === 'noteon') {
        // Calculate freq from note
        const freq = 440 * Math.pow(2, (msg.data1 - 69) / 12);
        
        // Update patch base pitch? No, just update engine directly for performance?
        // Better to update state so UI reflects it?
        // For performance, direct engine update is better, but state sync is needed.
        // Let's update state, but maybe debounce?
        // Actually, for a drone synth, we might just want to trigger envelopes.
        // If we want to play notes, we need to update oscillator frequencies.
        
        // Let's just trigger envelopes for now to keep it simple as a "Drone" synth.
        // Or better: Set master pitch?
        
        // Implementation: Trigger Attack on all enabled voices
        patch.oscillators.forEach(osc => {
            if (osc.enabled) audioEngine.triggerAttack(osc.id, osc.ampEnvelope);
        });
      } else if (msg.type === 'noteoff') {
        patch.oscillators.forEach(osc => {
            if (osc.enabled) audioEngine.triggerRelease(osc.id, osc.ampEnvelope);
        });
      }
    };
    
    const cleanup = midiService.addListener(handleMidi);
    return cleanup;
  }, [patch]);

  const handleSequencerStep = (val: number) => {
      // Modulate Filter Cutoff based on value (0-1)
      // Center around current cutoff? Or replace?
      // Let's map 0-1 to 20-10000Hz
      const cutoff = 20 + (val * 9980);
      // We need to update the engine directly for smooth sequencing without re-rendering React too much
      // But we also want UI to update?
      // Let's update React state, but maybe throttle?
      // Actually, for 8 steps, updating state is fine.
      setPatch(p => ({ ...p, filter: { ...p.filter, cutoff } }));
  };

  const handleRecordToggle = async () => {
      if (isRecording) {
          const blob = await audioEngine.stopRecording();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `nebula-recording-${Date.now()}.webm`;
          a.click();
          setIsRecording(false);
      } else {
          audioEngine.startRecording();
          setIsRecording(true);
      }
  };

  const handleSavePreset = () => {
      presetManager.savePreset(patch);
      alert("Preset Saved!");
  };

  const handleLoadPreset = () => {
      // Quick and dirty load last preset for now, or show list?
      // Let's just load the most recent one if available
      const presets = presetManager.getPresets();
      if (presets.length > 0) {
          setPatch(presets[presets.length - 1].patch);
      } else {
          alert("No presets found.");
      }
  };

  const handleMutate = () => {
      setPatch(p => ({
          ...p,
          oscillators: p.oscillators.map(osc => ({
              ...osc,
              detune: osc.detune + (Math.random() * 10 - 5),
              pan: Math.max(-1, Math.min(1, osc.pan + (Math.random() * 0.2 - 0.1))),
              lfoRate: Math.max(0.1, Math.min(20, osc.lfoRate + (Math.random() * 2 - 1)))
          })),
          filter: {
              ...p.filter,
              cutoff: Math.max(20, Math.min(10000, p.filter.cutoff + (Math.random() * 500 - 250))),
              resonance: Math.max(0, Math.min(20, p.filter.resonance + (Math.random() * 2 - 1)))
          }
      }));
  };

  const handleNoteOn = (note: number) => {
      // Calculate freq from note
      const freq = 440 * Math.pow(2, (note - 69) / 12);
      
      // For a drone synth, we usually just tune the oscillators.
      // But let's try to make it playable.
      // We need to update the base frequency of all oscillators relative to their octave setting.
      // This is tricky because each osc has an octave setting.
      // Let's just trigger envelopes for now, assuming the user tunes the drone.
      // OR: We update the "Master Pitch" if we had one.
      // Let's update the oscillators' detune to match the note relative to C3 (48)?
      // No, that's too complex for this patch structure.
      
      // Simple approach: Trigger envelopes.
      patch.oscillators.forEach(osc => {
        if (osc.enabled) audioEngine.triggerAttack(osc.id, osc.ampEnvelope);
      });
  };

  const handleNoteOff = (note: number) => {
      patch.oscillators.forEach(osc => {
        if (osc.enabled) audioEngine.triggerRelease(osc.id, osc.ampEnvelope);
      });
  };

  const togglePlay = () => {
    if (!isPlaying) {
      audioEngine.start();
      audioEngine.applyPatch(patch);
      // Trigger Attack for all enabled voices
      patch.oscillators.forEach(osc => {
        if (osc.enabled) {
           audioEngine.triggerAttack(osc.id, osc.ampEnvelope);
        }
      });
      setIsPlaying(true);
    } else {
      // Trigger Release
      patch.oscillators.forEach(osc => {
        if (osc.enabled) {
           audioEngine.triggerRelease(osc.id, osc.ampEnvelope);
        }
      });
      // Don't stop engine immediately, let release finish
      // But update UI
      setIsPlaying(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await generatePatch(prompt);
    
      setPatch(prev => {
        // Merge with defaults to ensure all fields exist (especially new ones like envelopes)
        const mergedPatch: SynthPatch = {
            ...DEFAULT_PATCH,
            ...response.patch,
            oscillators: response.patch.oscillators.map((osc, i) => ({
                ...DEFAULT_PATCH.oscillators[i],
                ...osc,
                ampEnvelope: { ...DEFAULT_PATCH.oscillators[i].ampEnvelope, ...(osc.ampEnvelope || {}) }
            })),
            filter: {
                ...DEFAULT_PATCH.filter,
                ...response.patch.filter,
                envelope: { ...DEFAULT_PATCH.filter.envelope, ...(response.patch.filter?.envelope || {}) }
            },
            master: {
                ...DEFAULT_PATCH.master,
                ...response.patch.master
            },
            name: response.patch.name || prev.name
        };
        return mergedPatch;
      });
    } catch (err) {
      setError("Failed to generate patch. Check API Key or try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Generic update helpers
  const updateOsc = (id: number, field: string, value: any) => {
    setPatch(p => ({
      ...p,
      oscillators: p.oscillators.map(osc => osc.id === id ? { ...osc, [field]: value } : osc)
    }));
  };

  const updateOscEnvelope = (id: number, newAdsr: ADSR) => {
      setPatch(p => ({
        ...p,
        oscillators: p.oscillators.map(osc => osc.id === id ? { ...osc, ampEnvelope: newAdsr } : osc)
      }));
      // If playing, re-trigger? No, just update params.
      // But if we are in sustain phase, updating sustain level should work via applyPatch.
  };

  const toggleOscMute = (id: number) => {
    setPatch(p => {
      const newPatch = {
        ...p,
        oscillators: p.oscillators.map(osc => osc.id === id ? { ...osc, enabled: !osc.enabled } : osc)
      };
      
      // Trigger Attack/Release based on new state if global playing is on
      if (isPlaying) {
          const osc = newPatch.oscillators.find(o => o.id === id);
          if (osc) {
              if (osc.enabled) audioEngine.triggerAttack(id, osc.ampEnvelope);
              else audioEngine.triggerRelease(id, osc.ampEnvelope);
          }
      }
      return newPatch;
    });
  };

  const updateDelay = (field: string, value: any) => {
    setPatch(p => ({ ...p, delay: { ...p.delay, [field]: value } }));
  };

  const updateReverb = (field: string, value: any) => {
    setPatch(p => ({ ...p, reverb: { ...p.reverb, [field]: value } }));
  };

  const updateMaster = (field: string, value: any) => {
    setPatch(p => ({ ...p, master: { ...p.master, [field]: value } }));
  };

  // XY Pad Logic
  const handleXYChange = (x: number, y: number) => {
    switch(xyMode) {
      case 'filter':
        // Map X (0-1) to Cutoff (20-10000)
        const minCutoff = 20;
        const maxCutoff = 10000;
        const cutoff = minCutoff + (x * (maxCutoff - minCutoff));
        // Map Y (0-1) to Resonance (0-15)
        const res = y * 15;
        setPatch(p => ({ ...p, filter: { ...p.filter, cutoff, resonance: res } }));
        break;
        
      case 'delay':
        // Map X to Time (0-2s), Y to Feedback (0-0.95)
        setPatch(p => ({ 
          ...p, 
          delay: { ...p.delay, time: x * 2, feedback: y * 0.95 } 
        }));
        break;
        
      case 'reverb':
        // Map X to Decay (0.1-10s), Y to Mix (0-1)
        setPatch(p => ({ 
          ...p, 
          reverb: { ...p.reverb, decay: 0.1 + (x * 9.9), mix: y } 
        }));
        break;
    }
  };

  const getXYValues = () => {
    switch(xyMode) {
      case 'filter':
        return {
          x: (patch.filter.cutoff - 20) / (10000 - 20),
          y: patch.filter.resonance / 15,
          label: 'Performance Filter',
          labelX: 'Freq',
          labelY: 'Res'
        };
      case 'delay':
        return {
          x: patch.delay.time / 2,
          y: patch.delay.feedback / 0.95,
          label: 'Delay Controls',
          labelX: 'Time',
          labelY: 'Fdbk'
        };
      case 'reverb':
        return {
          x: (patch.reverb.decay - 0.1) / 9.9,
          y: patch.reverb.mix,
          label: 'Reverb Space',
          labelX: 'Decay',
          labelY: 'Mix'
        };
    }
  };

  const xyProps = getXYValues();

  const renderWaveformIcon = (w: Waveform) => {
    switch(w) {
      case Waveform.Sawtooth: return <Activity className="w-3 h-3" />;
      case Waveform.Square: return <div className="w-3 h-3 border-2 border-current border-t-0 border-r-0 h-2.5 w-2.5 mt-0.5" />;
      case Waveform.Sine: return <Waves className="w-3 h-3" />;
      case Waveform.Triangle: return <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-current" />;
      case Waveform.Noise: return <Hash className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 p-2 md:p-6 flex flex-col gap-4 max-w-[1600px] mx-auto">
      
      {/* Header / Top Bar */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 pb-4 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg transition-all duration-500 ${isPlaying ? 'bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'bg-slate-800'}`}>
            <Waves className={`w-6 h-6 ${isPlaying ? 'text-white' : 'text-slate-500'}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">NEBULA <span className="text-cyan-500 font-mono text-lg">LIVE</span></h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest hidden sm:block">{patch.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Toolbar */}
          <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-full border border-slate-800">
             <button onClick={handleSavePreset} className="p-2 hover:text-cyan-400 transition-colors" title="Save Preset"><Save className="w-4 h-4" /></button>
             <button onClick={handleLoadPreset} className="p-2 hover:text-cyan-400 transition-colors" title="Load Last Preset"><FolderOpen className="w-4 h-4" /></button>
             <button onClick={() => presetManager.exportPatch(patch)} className="p-2 hover:text-cyan-400 transition-colors" title="Export JSON"><Download className="w-4 h-4" /></button>
             <button className="p-2 hover:text-cyan-400 transition-colors relative" title="Import JSON">
                <Upload className="w-4 h-4" />
                <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept=".json"
                    onChange={async (e) => {
                        if (e.target.files?.[0]) {
                            try {
                                const p = await presetManager.importPatch(e.target.files[0]);
                                setPatch(p);
                            } catch (err) {
                                console.error(err);
                                alert("Failed to import patch");
                            }
                        }
                    }}
                />
             </button>
             <div className="w-px h-4 bg-slate-700 mx-1"></div>
             <button 
                onClick={handleRecordToggle} 
                className={`p-2 transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'hover:text-red-400'}`} 
                title="Record Audio"
             >
                {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
             </button>
             <button onClick={handleMutate} className="p-2 hover:text-purple-400 transition-colors" title="Mutate Patch"><Shuffle className="w-4 h-4" /></button>
             <button 
                onClick={() => setIsEvolving(!isEvolving)} 
                className={`p-2 transition-colors ${isEvolving ? 'text-purple-400 animate-pulse' : 'hover:text-purple-300'}`} 
                title="Evolve Mode"
             >
                <Sparkles className="w-4 h-4" />
             </button>
          </div>

          <form onSubmit={handleGenerate} className="relative flex-1 md:w-60 lg:w-80">
            <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Generate patch..."
              className="w-full bg-slate-900/50 border border-slate-700 rounded-full py-2 pl-4 pr-12 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner text-cyan-100 placeholder:text-slate-600"
            />
            <button 
              type="submit"
              disabled={isGenerating}
              className="absolute right-1 top-1 p-1.5 bg-slate-800 rounded-full hover:bg-cyan-600 text-cyan-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? <Activity className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            </button>
          </form>
          
          <button 
            onClick={togglePlay}
            className={`px-8 py-2 rounded-full font-bold text-sm uppercase tracking-wide transition-all ${
              isPlaying 
              ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20' 
              : 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]'
            }`}
          >
            {isPlaying ? 'STOP [SPC]' : 'START [SPC]'}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm text-center animate-bounce">
          {error}
        </div>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 h-full min-h-0">
        
        {/* LEFT COLUMN: Oscillators */}
        <section className="lg:col-span-7 flex flex-col gap-3 overflow-y-auto pr-2">
          {patch.oscillators.map((osc) => (
            <div 
              key={osc.id} 
              className={`
                relative border rounded-xl p-4 transition-all duration-200 flex flex-col gap-3
                ${osc.enabled 
                  ? 'bg-slate-900/60 border-slate-700 hover:border-slate-600' 
                  : 'bg-slate-950 border-slate-900 opacity-60 grayscale'
                }
              `}
            >
              <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleOscMute(osc.id)}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-lg
                      ${osc.enabled 
                        ? 'bg-green-500 text-black hover:bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.4)]' 
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                      }
                    `}
                    title={`Toggle Mute (Key: ${osc.id + 1})`}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Voice 0{osc.id + 1}
                  </span>
                </div>


                    
                    {/* Osc Waveform Selector */}
                    <div className="flex gap-1 bg-slate-800 p-0.5 rounded-lg">
                        {[Waveform.Sawtooth, Waveform.Square, Waveform.Sine, Waveform.Triangle, Waveform.Noise].map(w => (
                          <button
                            key={w}
                            onClick={() => updateOsc(osc.id, 'waveform', w)}
                            className={`p-1 rounded-md transition-colors ${osc.waveform === w ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            title={w}
                          >
                              {renderWaveformIcon(w)}
                          </button>
                        ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    {/* Osc Controls */}
                    <div className="grid grid-cols-4 gap-2">
                      <Knob label="Gain" value={osc.gain} min={0} max={1} onChange={(v) => updateOsc(osc.id, 'gain', v)} size={52} />
                      <Knob label="Octave" value={osc.octave} min={-2} max={2} step={1} onChange={(v) => updateOsc(osc.id, 'octave', v)} color="text-indigo-400" size={52} />
                      <Knob label="Fine" value={osc.detune} min={-1200} max={1200} step={1} onChange={(v) => updateOsc(osc.id, 'detune', v)} color="text-indigo-400" size={52} />
                      <Knob label="Pan" value={osc.pan} min={-1} max={1} onChange={(v) => updateOsc(osc.id, 'pan', v)} size={52} />
                    </div>

                    {/* LFO Section */}
                    <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-800/30 flex gap-2 items-center justify-between">
                      
                      <div className="flex flex-col items-center gap-2 min-w-[60px]">
                        <span className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">LFO</span>
                        <div className="grid grid-cols-2 gap-0.5 bg-slate-800 p-0.5 rounded">
                          {[Waveform.Sine, Waveform.Triangle, Waveform.Sawtooth, Waveform.Square].map(w => (
                            <button
                              key={`lfo-${w}`}
                              onClick={() => updateOsc(osc.id, 'lfoWaveform', w)}
                              className={`p-1 rounded-sm ${osc.lfoWaveform === w ? 'bg-pink-600 text-white' : 'text-slate-600 hover:text-slate-400'}`}
                            >
                              {renderWaveformIcon(w)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Knob label="Rate" value={osc.lfoRate} min={0.1} max={20} onChange={(v) => updateOsc(osc.id, 'lfoRate', v)} color="text-pink-400" size={44} />
                        <Knob label="Amt" value={osc.lfoDepth} min={0} max={1} onChange={(v) => updateOsc(osc.id, 'lfoDepth', v)} color="text-pink-400" size={44} />
                      </div>
                      
                      <div className="flex flex-col gap-1 w-16">
                        <span className="text-[9px] uppercase text-slate-500 font-bold text-center">Dest</span>
                        <select 
                          value={osc.lfoTarget}
                          onChange={(e) => updateOsc(osc.id, 'lfoTarget', e.target.value as LfoTarget)}
                          className="w-full bg-slate-800 text-[10px] text-pink-300 border-none rounded px-1 py-1 focus:ring-0 cursor-pointer uppercase font-mono text-center"
                        >
                          <option value="pitch">Pitch</option>
                          <option value="cutoff">Filt</option>
                          <option value="amp">Amp</option>
                          <option value="pan">Pan</option>
                        </select>
                      </div>

                    </div>
                  </div>

                  {/* Envelope Graph */}
                  <div className="mt-2 pt-2 border-t border-slate-800/50">
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">Amplitude Envelope</span>
                      </div>
                      <div className="h-24 w-full">
                          <EnvelopeGraph 
                              adsr={osc.ampEnvelope} 
                              onChange={(newAdsr) => updateOscEnvelope(osc.id, newAdsr)}
                              color={osc.enabled ? '#22d3ee' : '#475569'}
                          />
                      </div>
                  </div>
                </div>
              ))}
            </section>

        {/* RIGHT COLUMN: Performance & Global FX */}
        <section className="lg:col-span-5 flex flex-col gap-4 h-full">
          
          {/* Visualizer */}
          <div className="h-24 w-full shrink-0">
             <Visualizer isActive={isPlaying} />
          </div>

          {/* Sequencer */}
          <Sequencer isPlaying={isPlaying} onStep={handleSequencerStep} />

          {/* Performance Pad Container */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex-1 min-h-[250px] flex flex-col gap-3">
             {/* XY Mode Selectors */}
             <div className="flex justify-center gap-2 mb-1 flex-wrap">
                {(['filter', 'delay', 'reverb'] as XYMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setXyMode(mode)}
                    className={`
                      px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border transition-all
                      ${xyMode === mode 
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                        : 'bg-slate-800 border-transparent text-slate-500 hover:bg-slate-700'
                      }
                    `}
                  >
                    {mode}
                  </button>
                ))}
                
                {/* Filter Type Selector (Only show if mode is filter) */}
                {xyMode === 'filter' && (
                    <select 
                        value={patch.filter.type}
                        onChange={(e) => setPatch(p => ({ ...p, filter: { ...p.filter, type: e.target.value as any } }))}
                        className="bg-slate-800 text-[10px] text-slate-300 border-none rounded-full px-2 py-1 focus:ring-0 cursor-pointer uppercase font-bold tracking-widest"
                    >
                        <option value="lowpass">LP</option>
                        <option value="highpass">HP</option>
                        <option value="bandpass">BP</option>
                        <option value="notch">Notch</option>
                        <option value="peaking">Peak</option>
                    </select>
                )}
             </div>

             <XYPad 
                label={xyProps.label}
                labelX={xyProps.labelX}
                labelY={xyProps.labelY}
                x={xyProps.x} 
                y={xyProps.y} 
                onChange={handleXYChange}
             />
          </div>

          {/* FX Rack */}
          <div className="grid grid-cols-2 gap-4 shrink-0">
            {/* Delay */}
            <div className={`bg-slate-900/50 border rounded-xl p-3 transition-colors ${xyMode === 'delay' ? 'border-cyan-500/30 bg-cyan-900/5' : 'border-slate-800'}`}>
              <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Command className="w-3 h-3" /> Delay
              </h2>
              <div className="flex gap-2 justify-center">
                <Knob label="Time" value={patch.delay.time} min={0} max={2} onChange={(v) => updateDelay('time', v)} size={42} color="text-emerald-400" />
                <Knob label="Fdbk" value={patch.delay.feedback} min={0} max={0.95} onChange={(v) => updateDelay('feedback', v)} size={42} color="text-emerald-400" />
                <Knob label="Mix" value={patch.delay.mix} min={0} max={1} onChange={(v) => updateDelay('mix', v)} size={42} color="text-emerald-400" />
              </div>
            </div>

            {/* Reverb */}
            <div className={`bg-slate-900/50 border rounded-xl p-3 transition-colors ${xyMode === 'reverb' ? 'border-cyan-500/30 bg-cyan-900/5' : 'border-slate-800'}`}>
              <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Waves className="w-3 h-3" /> Reverb
              </h2>
              <div className="flex gap-2 justify-center">
                <Knob label="Decay" value={patch.reverb.decay} min={0.1} max={10} onChange={(v) => updateReverb('decay', v)} size={42} color="text-purple-400" />
                <Knob label="Mix" value={patch.reverb.mix} min={0} max={1} onChange={(v) => updateReverb('mix', v)} size={42} color="text-purple-400" />
              </div>
            </div>
          </div>

          {/* Master */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between shrink-0">
             <span className="text-xs font-bold text-slate-400 uppercase ml-2">Main Out</span>
             <div className="mr-4 flex gap-4">
                <Knob label="Drive" value={patch.master.drive} min={0} max={1} onChange={(v) => updateMaster('drive', v)} color="text-orange-500" size={60} />
                <Knob label="Gain" value={patch.master.gain} min={0} max={1} onChange={(v) => updateMaster('gain', v)} color="text-white" size={60} />
             </div>
          </div>
          
          {/* Virtual Keyboard */}
          <VirtualKeyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />

        </section>
      </main>
    </div>
  );
}

export default App;
