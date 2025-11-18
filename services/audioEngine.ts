
import { SynthPatch, Waveform } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  
  // Signal Chain Nodes
  private oscNodes: Map<number, { 
    osc: OscillatorNode; 
    gain: GainNode; 
    pan: StereoPannerNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
  }> = new Map();
  
  private filterNode: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackNode: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;

  public isInitialized = false;

  init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Master Chain
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.masterGain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.85;

    // Filter
    this.filterNode = this.ctx.createBiquadFilter();
    
    // Delay
    this.delayNode = this.ctx.createDelay(5.0);
    this.delayFeedbackNode = this.ctx.createGain();
    
    // Reverb
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createReverbBuffer(3);
    this.reverbGain = this.ctx.createGain();
    this.dryGain = this.ctx.createGain();

    if (this.filterNode && this.masterGain && this.compressor && this.analyser && this.delayNode && this.delayFeedbackNode && this.reverbNode && this.reverbGain && this.dryGain) {
      
      // Filter Output
      this.filterNode.connect(this.delayNode);
      this.filterNode.connect(this.reverbNode);
      this.filterNode.connect(this.masterGain);
      
      // Delay Loop
      this.delayNode.connect(this.delayFeedbackNode);
      this.delayFeedbackNode.connect(this.delayNode);
      this.delayNode.connect(this.masterGain);

      // Reverb
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.masterGain);

      // Master
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    this.isInitialized = true;
  }

  private createReverbBuffer(duration: number): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx!.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2);
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    return impulse;
  }

  start() {
    if (!this.isInitialized) this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  stop() {
    if (this.ctx?.state === 'running') this.ctx.suspend();
  }

  getAnalyser() {
    return this.analyser;
  }

  applyPatch(patch: SynthPatch) {
    if (!this.ctx || !this.isInitialized) return;
    const now = this.ctx.currentTime;
    const RAMP_TIME = 0.1;

    // --- Master ---
    this.masterGain?.gain.setTargetAtTime(patch.master.gain, now, RAMP_TIME);
    
    // --- Filter ---
    if (this.filterNode) {
      this.filterNode.type = patch.filter.type;
      // Clamp values to prevent instability
      const safeCutoff = Math.max(20, Math.min(20000, patch.filter.cutoff));
      const safeRes = Math.max(0, Math.min(20, patch.filter.resonance));
      
      this.filterNode.frequency.setTargetAtTime(safeCutoff, now, RAMP_TIME);
      this.filterNode.Q.setTargetAtTime(safeRes, now, RAMP_TIME);
    }

    // --- Effects ---
    if (this.delayNode && this.delayFeedbackNode) {
      this.delayNode.delayTime.setTargetAtTime(patch.delay.time, now, RAMP_TIME);
      this.delayFeedbackNode.gain.setTargetAtTime(patch.delay.feedback, now, RAMP_TIME);
    }

    if (this.reverbGain) {
      this.reverbGain.gain.setTargetAtTime(patch.reverb.mix, now, RAMP_TIME);
    }

    // --- Oscillators & LFOs ---
    patch.oscillators.forEach(oscParams => {
      let nodeGroup = this.oscNodes.get(oscParams.id);
      
      if (!nodeGroup) {
        // Create new voice
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const pan = this.ctx!.createStereoPanner();
        
        // Create LFO
        const lfo = this.ctx!.createOscillator();
        const lfoGain = this.ctx!.createGain();
        lfo.connect(lfoGain);
        lfo.start();

        osc.connect(gain);
        gain.connect(pan);
        pan.connect(this.filterNode!);

        osc.start();
        
        nodeGroup = { osc, gain, pan, lfo, lfoGain };
        this.oscNodes.set(oscParams.id, nodeGroup);
      }

      // Update Params
      const { osc, gain, pan, lfo, lfoGain } = nodeGroup;
      
      // Oscillator
      if (osc.type !== oscParams.waveform) osc.type = oscParams.waveform;
      
      const baseFreq = 65.41 * Math.pow(2, oscParams.octave);
      osc.frequency.setTargetAtTime(baseFreq, now, RAMP_TIME);
      osc.detune.setTargetAtTime(oscParams.detune, now, RAMP_TIME);
      
      // Check ENABLED state for mute logic
      const targetGain = oscParams.enabled ? oscParams.gain : 0;
      gain.gain.setTargetAtTime(targetGain, now, 0.05); // Fast ramp for mute toggling
      
      pan.pan.setTargetAtTime(oscParams.pan, now, RAMP_TIME);

      // LFO
      if (lfo.type !== oscParams.lfoWaveform) lfo.type = oscParams.lfoWaveform;
      lfo.frequency.setTargetAtTime(oscParams.lfoRate, now, RAMP_TIME);

      // LFO Routing & Depth
      // Disconnect previous connections to allow target switching
      lfoGain.disconnect();

      // Only apply LFO if the oscillator is enabled
      if (oscParams.enabled) {
        let depthValue = 0;
        switch (oscParams.lfoTarget) {
          case 'pitch':
            // Map 0-1 to 0-1200 cents (1 octave)
            depthValue = oscParams.lfoDepth * 1200;
            lfoGain.connect(osc.detune);
            break;
          case 'cutoff':
            // Map 0-1 to 0-5000 Hz (range of modulation)
            depthValue = oscParams.lfoDepth * 5000;
            if (this.filterNode) lfoGain.connect(this.filterNode.frequency);
            break;
          case 'amp':
            // Map 0-1 to 0-0.5 gain
            depthValue = oscParams.lfoDepth * 0.5;
            lfoGain.connect(gain.gain);
            break;
          case 'pan':
            // Map 0-1 to full -1 to 1 pan sweep
            depthValue = oscParams.lfoDepth;
            lfoGain.connect(pan.pan);
            break;
        }
        lfoGain.gain.setTargetAtTime(depthValue, now, RAMP_TIME);
      }
    });
  }
}

export const audioEngine = new AudioEngine();
