// A short, soft two-note chime made with Web Audio, so no sound files ship.
let ctx: AudioContext | null = null;

export function playChime(kind: "focus-done" | "break-done") {
  try {
    ctx ??= new AudioContext();
    const now = ctx.currentTime;
    const notes = kind === "focus-done" ? [660, 880, 1320] : [880, 660];
    notes.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
  } catch {
    /* audio unavailable */
  }
}
