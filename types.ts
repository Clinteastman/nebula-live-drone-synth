export enum Waveform {
  Sine = 'sine',
  Triangle = 'triangle',
  Sawtooth = 'sawtooth',
  Square = 'square',
  Noise = 'noise',
}

export type LfoTarget = 'pitch' | 'cutoff' | 'amp' | 'pan';

export interface ADSR {
  attack: number;  // 0 to 2s
  decay: number;   // 0 to 2s
  sustain: number; // 0 to 1
  release: number; // 0 to 5s
}

export interface OscillatorParams {
  id: number;
  enabled: boolean;
  waveform: Waveform;
  detune: number;
  gain: number;
  octave: number;
  pan: number;
  
  // Envelopes
  ampEnvelope: ADSR;

  // LFO
  lfoWaveform: Waveform;
  lfoRate: number;
  lfoDepth: number;
  lfoTarget: LfoTarget;
}

export interface FilterParams {
  cutoff: number;
  resonance: number;
  type: 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'peaking';
  envelope: ADSR;
  envDepth: number; // -10000 to 10000 (Hz modulation)
}

export interface DelayParams {
  time: number;
  feedback: number;
  mix: number;
}

export interface ReverbParams {
  decay: number;
  mix: number;
}

export interface MasterParams {
  gain: number;
  drive: number; // 0 to 1 (Distortion)
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
