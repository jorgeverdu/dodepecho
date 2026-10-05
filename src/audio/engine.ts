import { frequency } from "../music/notes";
import {
  clampPianoVolumePercent,
  DEFAULT_PIANO_VOLUME_PERCENT,
} from "./volume";
import type { MusicalEvent, Timeline } from "./timeline";
import {
  loadSample,
  nearestSample,
  samplePlaybackRate,
  SAMPLE_NOTES,
} from "./samples";
export interface AudioDriver {
  now(): number;
  ready(): Promise<void>;
  play(midi: number, at: number, duration: number): void;
  stopAll(): void;
  close(): void;
}
export class PianoDriver implements AudioDriver {
  private context: AudioContext;
  private master: GainNode;
  private limiter: DynamicsCompressorNode;
  private voices = new Set<{
    source: AudioScheduledSourceNode;
    gain: GainNode;
    at: number;
  }>();
  private buffers = new Map<number, AudioBuffer>();
  private requiredSamples: (typeof SAMPLE_NOTES)[number][];
  constructor(
    volumePercent = DEFAULT_PIANO_VOLUME_PERCENT,
    requiredMidi: number[] = [],
  ) {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.limiter = this.context.createDynamicsCompressor();
    this.master.gain.value = this.volumeGain(volumePercent);
    this.requiredSamples = [
      ...new Map(
        requiredMidi.map((midi) => {
          const sample = nearestSample(midi);
          return [sample[0], sample] as const;
        }),
      ).values(),
    ];
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.15;
    this.master.connect(this.limiter);
    this.limiter.connect(this.context.destination);
  }
  private volumeGain(volumePercent: number) {
    return (0.9 * clampPianoVolumePercent(volumePercent)) / 100;
  }
  setVolume(volumePercent: number) {
    this.master.gain.setTargetAtTime(
      this.volumeGain(volumePercent),
      this.now(),
      0.01,
    );
  }
  now() {
    return this.context.currentTime;
  }
  async ready() {
    await this.context.resume();
    const results = await Promise.allSettled(
      this.requiredSamples.map((sample) => loadSample(this.context, sample)),
    );
    results.forEach((result, index) => {
      if (result.status === "fulfilled")
        this.buffers.set(this.requiredSamples[index][0], result.value);
      else
        console.warn(
          `No se pudo cargar la muestra ${this.requiredSamples[index][1]}; se usará el sonido de respaldo.`,
          result.reason,
        );
    });
  }
  play(midi: number, at: number, duration: number) {
    const sample = nearestSample(midi);
    const buffer = this.buffers.get(sample[0]);
    if (buffer) {
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      const rate = samplePlaybackRate(midi, sample[0]);
      const voice = { source, gain, at };
      this.voices.add(voice);
      source.buffer = buffer;
      source.playbackRate.value = rate;
      const end = at + Math.max(0.02, duration);
      const attack = Math.min(0.006, duration * 0.25);
      const release = Math.min(0.035, duration * 0.3);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(1, at + attack);
      gain.gain.setValueAtTime(1, end - release);
      gain.gain.linearRampToValueAtTime(0, end);
      source.connect(gain);
      gain.connect(this.master);
      source.start(at);
      source.stop(end + 0.005);
      source.onended = () => this.releaseVoice(voice);
      return;
    }
    this.playFallback(midi, at, duration);
  }
  private releaseVoice(voice: {
    source: AudioScheduledSourceNode;
    gain: GainNode;
    at: number;
  }) {
    voice.source.disconnect();
    voice.gain.disconnect();
    this.voices.delete(voice);
  }
  private playFallback(midi: number, at: number, duration: number) {
    const frequencyHz = frequency(midi);
    for (const [harmonic, amplitude] of [
      [1, 0.19],
      [2, 0.065],
      [3, 0.022],
    ]) {
      const osc = this.context.createOscillator(),
        gain = this.context.createGain();
      const voice = { source: osc, gain, at };
      this.voices.add(voice);
      osc.type = "sine";
      osc.frequency.value = frequencyHz * harmonic;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(amplitude, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        at + Math.max(0.035, duration),
      );
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(at);
      osc.stop(at + duration + 0.03);
      osc.onended = () => this.releaseVoice(voice);
    }
  }
  stopAll() {
    const now = this.now();
    for (const voice of this.voices) {
      const { source, gain, at } = voice;
      gain.gain.cancelScheduledValues(now);
      if (at <= now) gain.gain.setTargetAtTime(0, now, 0.003);
      else gain.gain.setValueAtTime(0, now);
      try {
        source.stop(at <= now ? now + 0.02 : now);
      } catch {
        /* Voice already ended. */
      }
      if (at > now) this.releaseVoice(voice);
    }
  }
  close() {
    this.stopAll();
    this.master.disconnect();
    this.limiter.disconnect();
    void this.context.close();
  }
}
export type PlayerStatus = "ready" | "playing" | "paused" | "complete";
export interface PlayerSnapshot {
  status: PlayerStatus;
  event: MusicalEvent;
  elapsed: number;
  total: number;
}
export class PlaybackEngine {
  private status: PlayerStatus = "ready";
  private offset = 0;
  private origin = 0;
  private next = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  constructor(
    readonly timeline: Timeline,
    private driver: AudioDriver,
    private listener: (state: PlayerSnapshot) => void,
  ) {}
  private eventAt(time: number): MusicalEvent {
    let lo = 0,
      hi = this.timeline.events.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (this.timeline.events[mid].at <= time) lo = mid;
      else hi = mid - 1;
    }
    return this.timeline.events[lo];
  }
  snapshot(): PlayerSnapshot {
    const elapsed =
      this.status === "playing"
        ? Math.min(
            this.timeline.duration,
            Math.max(0, this.driver.now() - this.origin),
          )
        : this.offset;
    return {
      status: this.status,
      event: this.eventAt(elapsed),
      elapsed,
      total: this.timeline.duration,
    };
  }
  private emit() {
    this.listener(this.snapshot());
  }
  async play() {
    if (this.status === "playing") return;
    const generation = ++this.generation;
    await this.driver.ready();
    if (generation !== this.generation) return;
    if (this.status === "complete") this.offset = 0;
    this.status = "playing";
    this.origin = this.driver.now() + 0.06 - this.offset;
    this.next = this.timeline.events.findIndex(
      (e) => e.at >= this.offset - 0.00001,
    );
    if (this.next < 0) this.next = this.timeline.events.length;
    this.tick();
  }
  private tick = () => {
    if (this.status !== "playing") return;
    const now = this.driver.now(),
      elapsed = now - this.origin;
    if (elapsed >= this.timeline.duration) {
      this.status = "complete";
      this.offset = this.timeline.duration;
      this.driver.stopAll();
      this.emit();
      return;
    }
    while (
      this.next < this.timeline.events.length &&
      this.timeline.events[this.next].at < elapsed + 0.15
    ) {
      const e = this.timeline.events[this.next++];
      const startsAt = e.at + this.origin;
      const remaining = e.gate - Math.max(0, now - startsAt);
      // A throttled tab must never play a backlog of expired notes together.
      if (e.midi !== null && remaining > 0)
        this.driver.play(e.midi, Math.max(now, startsAt), remaining);
    }
    this.emit();
    this.timer = setTimeout(this.tick, 25);
  };
  pause() {
    const state = this.snapshot();
    this.generation++;
    clearTimeout(this.timer);
    this.driver.stopAll();
    this.offset = state.event.at;
    this.status = "paused";
    this.emit();
  }
  async seek(exercise: number, succession: number) {
    const wasPlaying = this.status === "playing";
    this.pause();
    const target = this.timeline.events.find(
      (e) =>
        e.exercise === exercise &&
        e.succession === succession &&
        e.phase === "note",
    );
    if (target) this.offset = target.at;
    this.emit();
    if (wasPlaying) await this.play();
  }
  dispose() {
    this.generation++;
    clearTimeout(this.timer);
    this.status = "paused";
    this.driver.close();
  }
}
