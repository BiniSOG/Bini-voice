/* Bini Voice — AudioWorklet wrapper (concatenated after dsp.js at build time) */
class BiniVoiceProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    var opts = (options && options.processorOptions) || {};
    this.dsp = new globalThis.BiniDSP.VoiceShifter(sampleRate, opts.fftSize || 1024);
    this.port.onmessage = (e) => this.dsp.setParams(e.data);
  }
  process(inputs, outputs) {
    var input = inputs[0] && inputs[0][0];
    var out = outputs[0];
    if (!out || !out[0]) return true;
    if (!input) { out[0].fill(0); } else { this.dsp.process(input, out[0]); }
    for (var c = 1; c < out.length; c++) out[c].set(out[0]);
    return true;
  }
}
registerProcessor('bini-voice', BiniVoiceProcessor);
