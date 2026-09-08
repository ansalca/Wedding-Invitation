/* =========================================================================
   Soundscape — Web Audio synthesis, no asset files required.
   The silk rustle heard while the ribbon comes undone is generated at
   runtime, so the invitation stays self-contained; only the optional
   background music is a real file.

   All nodes hang off one lazily-created AudioContext. Browsers require a
   user gesture before audio may start, which is why unlock() is called from
   the ribbon click rather than on mount.
   ========================================================================= */

const clamp01 = (n) => Math.min(1, Math.max(0, n));

export function createSoundscape({ enabled = true, volume = 0.5 } = {}) {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let on = enabled;

  const ensure = () => {
    if (!on) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = clamp01(volume);
      master.connect(ctx.destination);
    }
    return ctx;
  };

  /* One second of white noise, reused by every whoosh. */
  const getNoise = () => {
    if (noiseBuffer) return noiseBuffer;
    const len = ctx.sampleRate;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  };

  /* Filtered noise sweep — the sound of silk sliding over silk. */
  const silk = ({ at = 0, duration = 0.5, from = 900, to = 2600, peak = 0.20, q = 1.1 }) => {
    if (!ensure()) return;
    const t = ctx.currentTime + at;

    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    src.loop = true;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = q;
    band.frequency.setValueAtTime(from, t);
    band.frequency.exponentialRampToValueAtTime(to, t + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + duration * 0.28);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    src.connect(band).connect(gain).connect(master);
    src.start(t);
    src.stop(t + duration + 0.05);
  };

  return {
    /* Must be called from inside a user gesture. */
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume();
    },

    /* The knot loosening — short, close, low. */
    ribbonPull() {
      silk({ duration: 0.34, from: 700, to: 1900, peak: 0.16, q: 0.9 });
    },

    /* Loops slipping and tails falling — longer, brighter, with a soft settle. */
    ribbonRelease() {
      silk({ at: 0.00, duration: 0.62, from: 1100, to: 3400, peak: 0.20 });
      silk({ at: 0.22, duration: 0.44, from: 2400, to: 700,  peak: 0.11, q: 1.6 });
    },

    setEnabled(next) {
      on = next;
      if (!next && ctx) master.gain.value = 0;
      else if (next && master) master.gain.value = clamp01(volume);
    },

    setVolume(v) {
      volume = v;
      if (master) master.gain.value = clamp01(v);
    },

    dispose() {
      if (ctx) ctx.close().catch(() => {});
      ctx = null;
      master = null;
      noiseBuffer = null;
    },
  };
}
