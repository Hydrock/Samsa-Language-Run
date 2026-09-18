export const trackOrder = ['main','folk','morning','evening','silkroad'];
const audioFiles = {main:'main-theme.mp3',folk:'folk.mp3'};
// Two lazy-loaded MP3 tracks and three locally synthesized arrangements.
const tracks = {
  silkroad: { bpm: 108, root: 50, melody: [74,77,81,0,79,77,76,73,74,81,86,84,81,79,77,73], chords: [[0,3,7],[7,11,14],[5,8,12],[0,3,7]], wave: 'triangle' },
  morning: { bpm: 96, root: 48, melody: [72,76,79,76,74,77,81,77,76,79,84,79,74,77,79,71], chords: [[0,4,7],[5,9,12],[9,12,16],[7,11,14]], wave: 'triangle' },
  evening: { bpm: 116, root: 45, melody: [69,0,76,72,71,69,68,0,69,72,77,76,74,72,71,68], chords: [[0,3,7],[5,8,12],[3,7,10],[7,11,14]], wave: 'sine' },
};

export class GameAudio {
  constructor(createAudio = () => new Audio()) {
    this.createAudio = createAudio;
    this.settings = { muted: false, music: true, track: 'folk' };
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
        this.musicGain=this.context.createGain();
        this.musicGain.connect(this.master);
      }
      this.context.resume().catch(() => {});
      this.configure(this.settings);
    } catch { /* Gameplay remains available without audio support. */ }
  }
  configure(settings) {
    const changedTrack = settings.track !== this.settings.track;
    this.settings = { ...settings, musicVolume: Number.isFinite(settings.musicVolume) ? Math.max(0,Math.min(1,settings.musicVolume)) : .3 };
    if(this.musicGain)this.musicGain.gain.value=this.settings.musicVolume/.3;
    this.updateMediaVolume();
    if (this.master) this.master.gain.value = settings.muted ? 0 : 1;
    if (changedTrack) { this.stopMusic(); this.releaseMedia(); this.step = 0; }
    this.sync();
  }
  setPlaying(playing) {
    if (this.playing === playing) return;
    this.playing = playing;
    this.sync();
  }
  sync() {
    if (!this.playing || this.settings.muted || !this.settings.music) {
      this.stopMusic();
      return;
    }
    if (audioFiles[this.settings.track]) {
      if (!this.media) {
        this.media = this.createAudio();
        this.media.preload = 'none';
        this.media.loop = !this.settings.autoMusic;
        this.media.volume = this.settings.musicVolume;
        this.media.src = new URL(`./assets/${audioFiles[this.settings.track]}`, import.meta.url).href;
      }
      this.connectMedia();
      this.updateMediaVolume();
      this.media.loop = !this.settings.autoMusic;
      this.media.onended = () => this.nextTrack();
      if (this.media.paused && !this.mediaPlayPending) {
        const media = this.media;
        this.mediaPlayPending = media;
        Promise.resolve(media.play()).catch(() => {}).finally(() => {
          if (this.mediaPlayPending === media) this.mediaPlayPending = null;
        });
      }
      return;
    }
    if (!this.context || this.timer) return;
    this.nextTime = this.context.currentTime + .04;
    this.timer = setInterval(() => this.schedule(), 50);
    this.schedule();
  }
  connectMedia() {
    if(!this.media || this.mediaSource || !this.context?.createMediaElementSource)return;
    // iOS ignores HTMLMediaElement.volume; control the decoded stream with Web Audio.
    this.mediaGain=this.context.createGain();
    this.mediaSource=this.context.createMediaElementSource(this.media);
    this.mediaSource.connect(this.mediaGain);
    this.mediaGain.connect(this.master);
  }
  updateMediaVolume() {
    if(!this.media)return;
    if(this.mediaGain){
      this.media.volume=1;
      this.mediaGain.gain.value=this.settings.musicVolume;
    }else this.media.volume=this.settings.musicVolume;
  }
  nextTrack() {
    if (!this.playing || !this.settings.music || this.settings.muted || !this.settings.autoMusic) return;
    const track=trackOrder[(trackOrder.indexOf(this.settings.track)+1)%trackOrder.length];
    this.configure({...this.settings,track});
    this.onTrackChange?.(track);
  }
  releaseMedia() {
    if (!this.media) return;
    this.mediaSource?.disconnect();
    this.mediaGain?.disconnect();
    this.mediaSource=null;this.mediaGain=null;
    this.media.onended = null;
    this.media.pause();
    this.media.removeAttribute('src');
    this.media.load(); // Cancel requests for a track that is no longer selected.
    this.media = null;
    this.mediaPlayPending = null;
  }
  stopMusic() {
    this.media?.pause();
    this.mediaPlayPending = null;
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
    osc.connect(gain); gain.connect(music ? (this.musicGain || this.master) : this.master);
    const voice = { osc, music }; this.voices.add(voice);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); this.voices.delete(voice); };
    osc.start(time); osc.stop(time + duration + .02);
  }
  schedule() {
    const song = tracks[this.settings.track], beat = 60 / song.bpm / 2;
    if(this.settings.autoMusic && this.step>=128){
      if(this.context.currentTime>=this.nextTime+.5)this.nextTrack();
      return;
    }
    if (this.nextTime < this.context.currentTime) this.nextTime = this.context.currentTime + .02;
    while (this.nextTime < this.context.currentTime + .16) {
      if(this.settings.autoMusic && this.step>=128)break;
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
