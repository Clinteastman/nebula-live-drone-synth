
import { SynthPatch, Waveform, ADSR } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private driveNode: WaveShaperNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  
  // Signal Chain Nodes
  private oscNodes: Map<number, { 
    source: OscillatorNode | AudioBufferSourceNode; 
    gain: GainNode; 
    pan: StereoPannerNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
    sourceType: Waveform;
    envGain: GainNode; // Dedicated gain for Envelope
  }> = new Map();
  
  private filterNode: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackNode: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;

  public isInitialized = false;

  init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Create Noise Buffer
    this.noiseBuffer = this.createNoiseBuffer(5); // 5 seconds of noise

    // Master Chain
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.driveNode = this.ctx.createWaveShaper();
    this.driveNode.curve = new Float32Array([0, 0]); // Bypass initially

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

    if (this.filterNode && this.masterGain && this.compressor && this.analyser && this.delayNode && this.delayFeedbackNode && this.reverbNode && this.reverbGain && this.dryGain && this.driveNode) {
      
      // Filter Output -> Effects
      this.filterNode.connect(this.delayNode);
      this.filterNode.connect(this.reverbNode);
      this.filterNode.connect(this.driveNode); // Dry signal goes to drive -> master
      
      // Delay Loop
      this.delayNode.connect(this.delayFeedbackNode);
      this.delayFeedbackNode.connect(this.delayNode);
      this.delayNode.connect(this.driveNode); // Wet delay goes to drive

      // Reverb
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.driveNode); // Wet reverb goes to drive

      // Master Chain
      this.driveNode.connect(this.masterGain);
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    this.isInitialized = true;
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
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

  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 0;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    
    if (amount === 0) {
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = x;
        }
        return curve;
    }

    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  start() {
    if (!this.isInitialized) this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    
    // Trigger attack for all voices
    this.oscNodes.forEach((node, id) => {
        // We need the current patch to know the envelope... 
        // But start() is usually called with applyPatch() right after.
        // So we can rely on applyPatch to trigger if we add a flag or just trigger here with default?
        // Actually, let's just resume context. The voices are always "running" in this drone synth,
        // but we might want to trigger envelopes.
    });
  }

  stop() {
    if (this.ctx?.state === 'running') this.ctx.suspend();
  }

  getAnalyser() {
    return this.analyser;
  }

  triggerAttack(id: number, adsr: ADSR) {
    if (!this.ctx) return;
    const nodeGroup = this.oscNodes.get(id);
    if (!nodeGroup) return;

    const { envGain } = nodeGroup;
    const now = this.ctx.currentTime;

    // Cancel any scheduled updates
    envGain.gain.cancelScheduledValues(now);
    envGain.gain.setValueAtTime(envGain.gain.value, now);

    // Attack
    envGain.gain.linearRampToValueAtTime(1.0, now + adsr.attack);
    // Decay to Sustain
    envGain.gain.linearRampToValueAtTime(adsr.sustain, now + adsr.attack + adsr.decay);
  }

  triggerRelease(id: number, adsr: ADSR) {
    if (!this.ctx) return;
    const nodeGroup = this.oscNodes.get(id);
    if (!nodeGroup) return;

    const { envGain } = nodeGroup;
    const now = this.ctx.currentTime;

    // Cancel
    envGain.gain.cancelScheduledValues(now);
    envGain.gain.setValueAtTime(envGain.gain.value, now);

    // Release
    envGain.gain.linearRampToValueAtTime(0, now + adsr.release);
  }

  applyPatch(patch: SynthPatch) {
    if (!this.ctx || !this.isInitialized) return;
    const now = this.ctx.currentTime;
    const RAMP_TIME = 0.1;

    // --- Master ---
    this.masterGain?.gain.setTargetAtTime(patch.master.gain, now, RAMP_TIME);
    
    // Drive
    if (this.driveNode) {
        // Only update curve if it changed significantly to avoid glitching? 
        // Actually generating curve is expensive.
        // For now, let's just do it. Optimization: cache curve.
        this.driveNode.curve = this.makeDistortionCurve(patch.master.drive * 100) as any; // Scale 0-1 to 0-100
    }

    // --- Filter ---
    if (this.filterNode) {
      this.filterNode.type = patch.filter.type;
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
      const isNoise = oscParams.waveform === Waveform.Noise;
      
      // Check if we need to recreate the source (Oscillator vs Buffer)
      if (nodeGroup && nodeGroup.sourceType !== oscParams.waveform) {
          // Stop and disconnect old source
          try {
            if (nodeGroup.source instanceof OscillatorNode) nodeGroup.source.stop();
            else nodeGroup.source.stop();
          } catch(e) {} // Ignore if already stopped
          nodeGroup.source.disconnect();
          
          // Create new source
          let newSource: OscillatorNode | AudioBufferSourceNode;
          if (isNoise) {
              newSource = this.ctx!.createBufferSource();
              newSource.buffer = this.noiseBuffer;
              newSource.loop = true;
          } else {
              newSource = this.ctx!.createOscillator();
              newSource.type = oscParams.waveform as OscillatorType;
          }
          
          newSource.connect(nodeGroup.gain);
          newSource.start();
          
          nodeGroup.source = newSource;
          nodeGroup.sourceType = oscParams.waveform;
      }

      if (!nodeGroup) {
        // Create new voice
        let source: OscillatorNode | AudioBufferSourceNode;
        
        if (isNoise) {
            source = this.ctx!.createBufferSource();
            source.buffer = this.noiseBuffer;
            source.loop = true;
        } else {
            source = this.ctx!.createOscillator();
            source.type = oscParams.waveform as OscillatorType;
        }

        const gain = this.ctx!.createGain();
        const envGain = this.ctx!.createGain(); // Envelope Gain
        const pan = this.ctx!.createStereoPanner();
        
        // LFO
        const lfo = this.ctx!.createOscillator();
        const lfoGain = this.ctx!.createGain();
        lfo.connect(lfoGain);
        lfo.start();

        // Chain: Source -> Gain (Level) -> EnvGain (ADSR) -> Pan -> Filter
        source.connect(gain);
        gain.connect(envGain);
        envGain.connect(pan);
        pan.connect(this.filterNode!);

        source.start();
        
        // Initialize EnvGain to 1 (sustain) if we assume drone mode, or 0 if waiting for trigger?
        // For drone synth, let's default to 1 so it makes sound immediately.
        envGain.gain.value = 1;

        nodeGroup = { source, gain, pan, lfo, lfoGain, sourceType: oscParams.waveform, envGain };
        this.oscNodes.set(oscParams.id, nodeGroup);
      }

      // Update Params
      const { source, gain, pan, lfo, lfoGain, envGain } = nodeGroup;
      
      // Source Params
      if (!isNoise) {
          const osc = source as OscillatorNode;
          if (osc.type !== oscParams.waveform) osc.type = oscParams.waveform as OscillatorType;
          
          const baseFreq = 65.41 * Math.pow(2, oscParams.octave);
          osc.frequency.setTargetAtTime(baseFreq, now, RAMP_TIME);
          osc.detune.setTargetAtTime(oscParams.detune, now, RAMP_TIME);
      } else {
          // Noise Pitching via Playback Rate
          const bufferSource = source as AudioBufferSourceNode;
          // Base rate 1.0. Octave shifts rate by 2x. Detune shifts rate.
          // Detune 1200 cents = 2x rate.
          const detuneFactor = Math.pow(2, oscParams.detune / 1200);
          const octaveFactor = Math.pow(2, oscParams.octave);
          const rate = 1.0 * octaveFactor * detuneFactor;
          bufferSource.playbackRate.setTargetAtTime(rate, now, RAMP_TIME);
      }
      
      // Gain (Level) - Mute logic
      const targetGain = oscParams.enabled ? oscParams.gain : 0;
      gain.gain.setTargetAtTime(targetGain, now, 0.05);
      
      // Pan
      pan.pan.setTargetAtTime(oscParams.pan, now, RAMP_TIME);

      // LFO
      if (lfo.type !== oscParams.lfoWaveform) lfo.type = oscParams.lfoWaveform as OscillatorType;
      lfo.frequency.setTargetAtTime(oscParams.lfoRate, now, RAMP_TIME);

      // LFO Routing
      lfoGain.disconnect();

      if (oscParams.enabled) {
        let depthValue = 0;
        switch (oscParams.lfoTarget) {
          case 'pitch':
            if (!isNoise) {
                depthValue = oscParams.lfoDepth * 1200;
                lfoGain.connect((source as OscillatorNode).detune);
            } else {
                // Modulate playback rate for noise? Complex with AudioParam.
                // playbackRate is k-rate or a-rate? It's a-rate.
                // But LFO output is -1 to 1.
                // We want to modulate rate around current value.
                // This is hard to do cleanly without a Gain node summing to playbackRate.
                // For now, skip pitch LFO on noise or implement later.
                // Actually, let's connect to detune of bufferSource if it has one?
                // AudioBufferSourceNode.detune exists in modern browsers!
                depthValue = oscParams.lfoDepth * 1200;
                lfoGain.connect((source as AudioBufferSourceNode).detune);
            }
            break;
          case 'cutoff':
            depthValue = oscParams.lfoDepth * 5000;
            if (this.filterNode) lfoGain.connect(this.filterNode.frequency);
            break;
          case 'amp':
            depthValue = oscParams.lfoDepth * 0.5;
            lfoGain.connect(gain.gain);
            break;
          case 'pan':
            depthValue = oscParams.lfoDepth;
            lfoGain.connect(pan.pan);
            break;
        }
        lfoGain.gain.setTargetAtTime(depthValue, now, RAMP_TIME);
      }
    });
  }
  // Recording
  private recordDestination: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  startRecording() {
    if (!this.ctx || !this.masterGain) return;
    
    if (!this.recordDestination) {
      this.recordDestination = this.ctx.createMediaStreamDestination();
      // Connect master output to recorder (in parallel with destination)
      this.analyser?.connect(this.recordDestination);
    }

    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(this.recordDestination.stream);
    
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.start();
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("No recorder"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.recordedChunks = [];
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }
}

export const audioEngine = new AudioEngine();
