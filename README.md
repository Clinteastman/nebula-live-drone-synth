

# Nebula Live Drone Synth

**A cinematic, AI-powered drone synthesizer for the web.**

Nebula Live is a performance-oriented drone synthesizer built with the Web Audio API. It combines a powerful 3-voice architecture with an intuitive XY pad interface and generative AI capabilities to create evolving soundscapes, textures, and atmospheres.

[View Demo](https://ai.studio/apps/drive/1dJoyE90j4wyC0I8pJ_hzx6OZf1Gwykgo)

---

## ✨ Features

- **Triple Oscillator Engine**: 3 independent voices with Saw, Square, Sine, and Triangle waveforms.
- **Deep Modulation**: Per-voice LFOs assignable to Pitch, Filter, Amp, or Pan.
- **Performance XY Pad**: Real-time control over Filter, Delay, and Reverb parameters.
- **AI Patch Generation**: Generate unique synth patches from text prompts using Google Gemini.
- **Studio Effects**: Integrated Delay and Reverb processors.
- **Real-time Visualization**: Responsive audio visualizer.

## 🎹 Controls & Shortcuts

### Keyboard Shortcuts
| Key | Action |
| :--- | :--- |
| **Space** | Start / Stop Audio |
| **1** | Toggle Mute Voice 1 |
| **2** | Toggle Mute Voice 2 |
| **3** | Toggle Mute Voice 3 |

### XY Pad Modes
- **Filter**: X = Cutoff Frequency, Y = Resonance
- **Delay**: X = Time, Y = Feedback
- **Reverb**: X = Decay Time, Y = Wet/Dry Mix

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- A Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nebula-live-drone-synth
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env.local` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Run Locally**
   ```bash
   npm run dev
   ```
   Open http://localhost:5173 to view the app.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Audio**: Web Audio API (Custom Engine)
- **AI**: Google Gemini API (`@google/genai`)
- **Icons**: Lucide React

---

<div align="center">
  <sub>Built with ❤️ using React & Web Audio</sub>
</div>
