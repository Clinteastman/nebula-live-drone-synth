
export enum Waveform {
  Sine = 'sine',
  Triangle = 'triangle',
  Sawtooth = 'sawtooth',
  Square = 'square',
}

export type LfoTarget = 'pitch' | 'cutoff' | 'amp' | 'pan';

export interface OscillatorParams {
  id: number;
  enabled: boolean; // New: allows muting/unmuting layers live
  waveform: Waveform;
  detune: number; // -1200 to 1200 cents
  gain: number; // 0 to 1
  octave: number; // -2 to 2
  pan: number; // -1 to 1
  
  // LFO
  lfoWaveform: Waveform;
  lfoRate: number; // 0.1 to 20 Hz
  lfoDepth: number; // 0 to 1
  lfoTarget: LfoTarget;
}

export interface FilterParams {
  cutoff: number; // 20Hz to 20000Hz
  resonance: number; // 0 to 20
  type: 'lowpass' | 'highpass' | 'bandpass';
}

export interface DelayParams {
  time: number; // 0 to 2 seconds
  feedback: number; // 0 to 0.95
  mix: number; // 0 to 1
}

export interface ReverbParams {
  decay: number; // 1 to 10 seconds (simulated)
  mix: number; // 0 to 1
}

export interface MasterParams {
  gain: number; // 0 to 1
}

export interface SynthPatch {
  name: string;
  oscillators: OscillatorParams[];
  filter: FilterParams;
  delay: DelayParams;
  reverb: ReverbParams;
  master: MasterParams;
}

// AI Response types
export interface AIPatchResponse {
  patch: SynthPatch;
  description: string;
}
