import { frequency } from "../music/notes";
import {
  clampPianoVolumePercent,
  DEFAULT_PIANO_VOLUME_PERCENT,
} from "./volume";
import type { MusicalEvent, Timeline } from "./timeline";
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
  private voices = new Set<{ osc: OscillatorNode; gain: GainNode }>();
  constructor(volumePercent = DEFAULT_PIANO_VOLUME_PERCENT) {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.limiter = this.context.createDynamicsCompressor();
    this.master.gain.value = clampPianoVolumePercent(volumePercent) / 100;
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.15;
    this.master.connect(this.limiter);
    this.limiter.connect(this.context.destination);
  }
  setVolume(volumePercent: number) {
    this.master.gain.setTargetAtTime(
      clampPianoVolumePercent(volumePercent) / 100,
      this.now(),
      0.01,
    );
  }
  now() {
    return this.context.currentTime;
  }
  async ready() {
    await this.context.resume();
  }
  play(midi: number, at: number, duration: number) {
    const frequencyHz = frequency(midi);
    for (const [harmonic, amplitude] of [
      [1, 0.19],
      [2, 0.065],
      [3, 0.022],
    ]) {
      const osc = this.context.createOscillator(),
        gain = this.context.createGain();
      const voice = { osc, gain };
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
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        this.voices.delete(voice);
      };
    }
  }
  stopAll() {
    for (const { osc, gain } of this.voices) {
      gain.gain.cancelScheduledValues(0);
      gain.gain.setValueAtTime(0, this.now());
      try {
        osc.stop();
      } catch {
        /* Voice already ended. */
      }
      osc.disconnect();
      gain.disconnect();
    }
    this.voices.clear();
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
