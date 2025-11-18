import { SynthPatch } from '../types';
import { DEFAULT_PATCH } from '../constants';

const STORAGE_KEY = 'nebula_patches';

export interface Preset {
  id: string;
  name: string;
  date: number;
  patch: SynthPatch;
}

export const presetManager = {
  savePreset: (patch: SynthPatch): Preset => {
    const presets = presetManager.getPresets();
    const newPreset: Preset = {
      id: crypto.randomUUID(),
      name: patch.name,
      date: Date.now(),
      patch: { ...patch } // Deep copy
    };
    
    presets.push(newPreset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return newPreset;
  },

  getPresets: (): Preset[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load presets", e);
      return [];
    }
  },

  deletePreset: (id: string) => {
    const presets = presetManager.getPresets().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  },

  exportPatch: (patch: SynthPatch) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(patch, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${patch.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  },

  importPatch: (file: File): Promise<SynthPatch> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          // Basic validation could go here
          resolve(json as SynthPatch);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }
};
