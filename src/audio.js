// Three original looping arrangements, synthesized locally; no downloaded audio.
const tracks = {
  silkroad: { bpm: 108, root: 50, melody: [74,77,81,0,79,77,76,73,74,81,86,84,81,79,77,73], chords: [[0,3,7],[7,11,14],[5,8,12],[0,3,7]], wave: 'triangle' },
  morning: { bpm: 96, root: 48, melody: [72,76,79,76,74,77,81,77,76,79,84,79,74,77,79,71], chords: [[0,4,7],[5,9,12],[9,12,16],[7,11,14]], wave: 'triangle' },
  evening: { bpm: 116, root: 45, melody: [69,0,76,72,71,69,68,0,69,72,77,76,74,72,71,68], chords: [[0,3,7],[5,8,12],[3,7,10],[7,11,14]], wave: 'sine' },
};

export class GameAudio {
  constructor() {
    this.settings = { muted: false, music: true, track: 'morning' };
    this.playing = false;
    this.step = 0;
    this.voices = new Set();
  }
  unlock() {
    try {
      if (!this.context) {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
      }
      this.context.resume().catch(() => {});
      this.configure(this.settings);
    } catch { /* Gameplay remains available without audio support. */ }
  }
  configure(settings) {
    const changedTrack = settings.track !== this.settings.track;
    this.settings = { ...settings };
    if (this.master) this.master.gain.value = settings.muted ? 0 : 1;
    if (changedTrack) { this.stopMusic(); this.step = 0; }
    this.sync();
  }
  setPlaying(playing) {
    if (this.playing === playing) return;
    this.playing = playing;
    this.sync();
  }
  sync() {
    if (!this.context || !this.playing || this.settings.muted || !this.settings.music) {
      this.stopMusic();
      return;
    }
    if (this.timer) return;
    this.nextTime = this.context.currentTime + .04;
    this.timer = setInterval(() => this.schedule(), 50);
    this.schedule();
  }
  stopMusic() {
    clearInterval(this.timer);
    this.timer = null;
    for (const voice of this.voices) {
      if (voice.music) { try { voice.osc.stop(); } catch {} }
    }
  }
  note(midi, time, duration, volume, wave = 'triangle', music = true) {
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    osc.connect(gain); gain.connect(this.master);
    const voice = { osc, music }; this.voices.add(voice);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); this.voices.delete(voice); };
    osc.start(time); osc.stop(time + duration + .02);
  }
  schedule() {
    const song = tracks[this.settings.track], beat = 60 / song.bpm / 2;
    if (this.nextTime < this.context.currentTime) this.nextTime = this.context.currentTime + .02;
    while (this.nextTime < this.context.currentTime + .16) {
      const step = this.step % 32, chord = song.chords[Math.floor(step / 8)];
      const melody = song.melody[step % 16];
      if (melody) this.note(melody, this.nextTime, beat * 1.4, .055, song.wave);
      if (step % 4 === 0) this.note(song.root + chord[0] - 12, this.nextTime, beat * 3, .07, 'sine');
      this.note(song.root + chord[step % 3], this.nextTime, beat * .8, .022);
      if (step % 2 === 0) this.note(33, this.nextTime, .08, .025, 'triangle');
      this.step++; this.nextTime += beat;
    }
  }
  movement(kind) {
    if(this.settings.muted)return;
    this.unlock();
    if(!this.context)return;
    const time=this.context.currentTime;
    if(kind==='jump') {
      this.note(67,time,.12,.024,'sine',false);
      this.note(79,time+.055,.13,.018,'sine',false);
    } else if(kind==='lane') {
      this.note(74,time,.075,.016,'sine',false);
    }
  }
  effect(good) {
    if (this.settings.muted) return;
    this.unlock();
    if (!this.context) return;
    (good ? [72,76,79,84] : [60,55,48]).forEach((note, i) =>
      this.note(note, this.context.currentTime + i * .09, .23, .085, good ? 'triangle' : 'sawtooth', false));
  }
}
