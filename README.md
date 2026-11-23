# Bini Voice

Real-time voice changer for **mobile (installable PWA)** and **Chrome (MV3 extension)**.
Male and female voices across every age group, character voices, and a studio for building your own.
All processing runs on-device. No audio leaves the device.

| | |
|---|---|
| **Voices** | 6 female (child → senior), 6 male (child → senior, incl. deep bass), 10 characters (Robot, Alien, Demon, Chipmunk, Giant, Whisper, Ghost, Radio, Cathedral, Angel) |
| **Custom voices** | Studio with 20 controls: pitch, timbre (formant), breathiness, robot, vibrato, tremolo, EQ, low/high cut, grit, metallic ring-mod, reverb, echo, output |
| **Live** | Real-time monitoring, intensity control, audio-reactive visualizer |
| **Library** | Record takes, re-voice any take with a different voice, import audio files, export WAV |
| **Calibration** | Measures *your* pitch so human voices land on the right target whoever speaks |
| **Extension** | Changes your mic on Meet, Discord, Zoom web, or any site, with a popup voice picker and the full Studio as an extension page |

## Quick start

```bash
npm run build          # → dist/app, dist/extension, dist/bini-voice-extension.zip
npm test               # DSP + preset tests (Node ≥ 18, no dependencies)
npm run serve          # serves the PWA on http://localhost:5173
```

**Mobile app:** deploy `dist/app` to any HTTPS host (Netlify, Vercel, GitHub Pages). On the phone, open it and choose *Add to Home Screen*. It runs full-screen and works offline.
To ship to the stores, wrap `dist/app` with [Capacitor](https://capacitorjs.com) (`webDir: "dist/app"`) and add the microphone permission (`NSMicrophoneUsageDescription` on iOS, `RECORD_AUDIO` on Android).

**Chrome extension:** open `chrome://extensions` and enable Developer mode. Click **Load unpacked** and select `dist/extension`. Pick a voice in the popup, then join or rejoin your call.

## How it works

```
mic → high/low cut → VoiceShifter (AudioWorklet) → EQ → grit → ring-mod → tremolo → echo/reverb → compressor → out
```

`shared/dsp.js` is a **formant-preserving phase vocoder**:
- **Pitch.** Phase-locked (Laroche–Dolson) time-stretch, then Catmull-Rom resampling. Harmonics stay exact and pure shifts keep unity gain.
- **Formants / timbre.** A cepstral spectral envelope is divided out and re-applied warped, so pitch and vocal-tract size move independently. This is what makes "female" sound like a woman instead of a chipmunk.
- **Whisper / robot.** Implemented in the spectral domain (phase randomisation and phase reset).

Human voices are defined by absolute targets (f0 plus a formant scale vs. an adult male tract) and resolved against the speaker's own voice (Male / Female / Calibrated).

The extension injects a MAIN-world hook that wraps `navigator.mediaDevices.getUserMedia`. The page receives the processed track, which carries the real mic's label and settings. Voice changes apply live mid-call. If a site's CSP blocks the worklet, the engine falls back to a ScriptProcessor running the same DSP.

## Layout

```
shared/     dsp.js · presets.js · engine.js · store.js · worklet-processor.js
app/        PWA (index.html, styles.css, app.js, manifest, service worker, icons)
extension/  manifest.json · inject.js (page hook) · bridge.js · popup · background.js
scripts/    build.mjs · make-icons.mjs
tests/      dsp.test.mjs
```
