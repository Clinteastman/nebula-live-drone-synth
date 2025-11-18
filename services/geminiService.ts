
import { GoogleGenAI, Type } from "@google/genai";
import { SynthPatch, Waveform, AIPatchResponse } from '../types';

// Initialize Gemini Client
// The API key is obtained safely from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePatch = async (prompt: string): Promise<AIPatchResponse> => {
  const model = "gemini-2.5-flash";

  const schema = {
    type: Type.OBJECT,
    properties: {
      patch: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          oscillators: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                enabled: { type: Type.BOOLEAN },
                waveform: { type: Type.STRING, enum: ["sine", "triangle", "sawtooth", "square", "noise"] },
                detune: { type: Type.NUMBER },
                gain: { type: Type.NUMBER },
                octave: { type: Type.NUMBER },
                pan: { type: Type.NUMBER },
                lfoWaveform: { type: Type.STRING, enum: ["sine", "triangle", "sawtooth", "square"] },
                lfoRate: { type: Type.NUMBER },
                lfoDepth: { type: Type.NUMBER },
                lfoTarget: { type: Type.STRING, enum: ["pitch", "cutoff", "amp", "pan"] },
                ampEnvelope: {
                    type: Type.OBJECT,
                    properties: {
                        attack: { type: Type.NUMBER },
                        decay: { type: Type.NUMBER },
                        sustain: { type: Type.NUMBER },
                        release: { type: Type.NUMBER }
                    }
                }
              }
            }
          },
          filter: {
            type: Type.OBJECT,
            properties: {
              cutoff: { type: Type.NUMBER },
              resonance: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["lowpass", "highpass", "bandpass", "notch", "peaking"] },
              envDepth: { type: Type.NUMBER },
              envelope: {
                  type: Type.OBJECT,
                  properties: {
                      attack: { type: Type.NUMBER },
                      decay: { type: Type.NUMBER },
                      sustain: { type: Type.NUMBER },
                      release: { type: Type.NUMBER }
                  }
              }
            }
          },
          delay: {
             type: Type.OBJECT,
             properties: {
               time: { type: Type.NUMBER },
               feedback: { type: Type.NUMBER },
               mix: { type: Type.NUMBER },
             }
          },
          reverb: {
             type: Type.OBJECT,
             properties: {
               decay: { type: Type.NUMBER },
               mix: { type: Type.NUMBER },
             }
          },
          master: {
             type: Type.OBJECT,
             properties: {
               gain: { type: Type.NUMBER },
               drive: { type: Type.NUMBER },
             }
          }
        }
      },
      description: { type: Type.STRING }
    }
  };

  const userPrompt = `
    Create a synthesizer patch based on this description: "${prompt}".
    The synth is a drone synthesizer with 3 oscillators, a filter, delay, and reverb.
    
    Constraints:
    - Oscillators: exactly 3 items. IDs 0, 1, 2.
    - Enabled: true or false. Useful for layering.
    - Detune: -1200 to 1200.
    - Gain: 0.0 to 1.0.
    - Octave: -2 to 2.
    - Pan: -1.0 to 1.0.
    - LFO Rate: 0.1 to 20.0 Hz.
    - LFO Depth: 0.0 to 1.0.
    - LFO Target: 'pitch', 'cutoff', 'amp', or 'pan'.
    - Filter Cutoff: 20 to 10000.
    - Delay Time: 0.0 to 2.0.
    - Delay Mix: 0.0 to 1.0.
    - Reverb Mix: 0.0 to 1.0.
    - Master Gain: 0.0 to 1.0.
    
    Return the JSON matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AIPatchResponse;
  } catch (error) {
    console.error("Error generating patch:", error);
    throw error;
  }
};
