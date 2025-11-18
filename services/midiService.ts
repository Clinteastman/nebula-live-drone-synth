
type MidiCallback = (message: MidiMessage) => void;

export interface MidiMessage {
  type: 'noteon' | 'noteoff' | 'cc';
  channel: number;
  data1: number; // Note or CC number
  data2: number; // Velocity or Value
}

class MidiService {
  private access: any = null;
  private listeners: Set<MidiCallback> = new Set();

  async init() {
    if (!navigator.requestMIDIAccess) {
      console.warn("Web MIDI API not supported");
      return;
    }

    try {
      this.access = await navigator.requestMIDIAccess();
      this.access.inputs.forEach((input: any) => {
        input.onmidimessage = this.handleMidiMessage.bind(this);
      });

      this.access.onstatechange = (e: any) => {
        if (e.port.type === 'input' && e.port.state === 'connected') {
           e.port.onmidimessage = this.handleMidiMessage.bind(this);
        }
      };
    } catch (err) {
      console.error("MIDI Access failed", err);
    }
  }

  private handleMidiMessage(event: any) {
    const [status, data1, data2] = event.data;
    const command = status & 0xf0;
    const channel = status & 0x0f;

    let type: MidiMessage['type'] | null = null;

    if (command === 0x90 && data2 > 0) type = 'noteon';
    else if (command === 0x80 || (command === 0x90 && data2 === 0)) type = 'noteoff';
    else if (command === 0xB0) type = 'cc';

    if (type) {
      const msg: MidiMessage = { type, channel, data1, data2 };
      this.listeners.forEach(cb => cb(msg));
    }
  }

  addListener(callback: MidiCallback) {
    this.listeners.add(callback);
    if (!this.access) this.init();
    return () => this.listeners.delete(callback);
  }
}

export const midiService = new MidiService();
