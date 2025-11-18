import { SynthPatch, Waveform } from './types';

export const DEFAULT_PATCH: SynthPatch = {
  name: "Nebula Init",
  oscillators: [
    { 
      id: 0, 
      enabled: true,
      waveform: Waveform.Sawtooth, 
      detune: -10, 
      gain: 0.6, 
      octave: 0, 
      pan: -0.3, 
      ampEnvelope: { attack: 0.1, decay: 0.1, sustain: 1.0, release: 0.5 },
      lfoWaveform: Waveform.Sine,
      lfoRate: 0.5,
      lfoDepth: 0.1,
      lfoTarget: 'pitch'
    },
    { 
      id: 1, 
      enabled: true,
      waveform: Waveform.Sawtooth, 
      detune: 10, 
      gain: 0.6, 
      octave: 0, 
      pan: 0.3, 
      ampEnvelope: { attack: 0.1, decay: 0.1, sustain: 1.0, release: 0.5 },
      lfoWaveform: Waveform.Sine,
      lfoRate: 0.2,
      lfoDepth: 0.1,
      lfoTarget: 'cutoff'
    },
    { 
      id: 2, 
      enabled: true,
      waveform: Waveform.Sine, 
      detune: 0, 
      gain: 0.8, 
      octave: -1, 
      pan: 0, 
      ampEnvelope: { attack: 0.5, decay: 0.5, sustain: 1.0, release: 1.0 },
      lfoWaveform: Waveform.Triangle,
      lfoRate: 1.0,
      lfoDepth: 0,
      lfoTarget: 'amp'
    },
  ],
  filter: {
    cutoff: 2000,
    resonance: 1,
    type: 'lowpass',
    envelope: { attack: 0.1, decay: 0.5, sustain: 0.5, release: 1.0 },
    envDepth: 0,
  },
  delay: {
    time: 0.4,
    feedback: 0.4,
    mix: 0.3,
  },
  reverb: {
    decay: 3,
    mix: 0.4,
  },
  master: {
    gain: 0.7,
    drive: 0,
  },
};

export const MIN_FREQ = 20;
export const MAX_FREQ = 20000;