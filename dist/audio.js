let ctx = null;
function ac() {
    if (ctx)
        return ctx;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
    }
    catch {
        ctx = null;
    }
    return ctx;
}
export function resumeAudio() {
    const c = ac();
    if (c && c.state === "suspended")
        void c.resume();
}
function tone({ freq, dur, type = "square", gain = 0.04, when = 0, slideTo }) {
    const c = ac();
    if (!c)
        return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo)
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
}
export function playClick() {
    tone({ freq: 660, dur: 0.05, gain: 0.03 });
}
export function playCoin() {
    tone({ freq: 988, dur: 0.07, gain: 0.05 });
    tone({ freq: 1319, dur: 0.1, gain: 0.05, when: 0.07 });
}
export function playChest() {
    tone({ freq: 220, dur: 0.1, type: "triangle", gain: 0.06 });
    tone({ freq: 277, dur: 0.12, type: "triangle", gain: 0.06, when: 0.08 });
    tone({ freq: 330, dur: 0.16, type: "triangle", gain: 0.06, when: 0.16 });
    tone({ freq: 440, dur: 0.3, gain: 0.06, when: 0.24 });
}
export function playWin() {
    tone({ freq: 523, dur: 0.12, gain: 0.05 });
    tone({ freq: 659, dur: 0.12, gain: 0.05, when: 0.1 });
    tone({ freq: 784, dur: 0.12, gain: 0.05, when: 0.2 });
    tone({ freq: 1047, dur: 0.4, gain: 0.06, when: 0.3 });
}
export function playLose() {
    tone({ freq: 392, dur: 0.2, type: "triangle", gain: 0.06 });
    tone({ freq: 330, dur: 0.2, type: "triangle", gain: 0.06, when: 0.18 });
    tone({ freq: 262, dur: 0.35, type: "triangle", gain: 0.06, when: 0.36 });
}
export function playSword() {
    tone({ freq: 900, dur: 0.08, type: "square", gain: 0.04, slideTo: 300 });
}
export function playHurt() {
    tone({ freq: 180, dur: 0.15, type: "sawtooth", gain: 0.05, slideTo: 90 });
}
