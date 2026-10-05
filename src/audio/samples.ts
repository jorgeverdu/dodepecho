export const SAMPLE_NOTES = [
  [21, "A0"],
  [24, "C1"],
  [27, "Ds1"],
  [30, "Fs1"],
  [33, "A1"],
  [36, "C2"],
  [39, "Ds2"],
  [42, "Fs2"],
  [45, "A2"],
  [48, "C3"],
  [51, "Ds3"],
  [54, "Fs3"],
  [57, "A3"],
  [60, "C4"],
  [63, "Ds4"],
  [66, "Fs4"],
  [69, "A4"],
  [72, "C5"],
  [75, "Ds5"],
  [78, "Fs5"],
  [81, "A5"],
  [84, "C6"],
  [87, "Ds6"],
  [90, "Fs6"],
  [93, "A6"],
  [96, "C7"],
  [99, "Ds7"],
  [102, "Fs7"],
  [105, "A7"],
  [108, "C8"],
] as const;

export function nearestSample(midi: number) {
  return SAMPLE_NOTES.reduce((closest, sample) =>
    Math.abs(sample[0] - midi) < Math.abs(closest[0] - midi) ? sample : closest,
  );
}

export function samplePlaybackRate(midi: number, sampleMidi: number) {
  return 2 ** ((midi - sampleMidi) / 12);
}

const decoded = new WeakMap<AudioContext, Map<number, Promise<AudioBuffer>>>();

export function loadSample(
  context: AudioContext,
  sample: (typeof SAMPLE_NOTES)[number],
) {
  const [midi, name] = sample;
  let contextCache = decoded.get(context);
  if (!contextCache) {
    contextCache = new Map();
    decoded.set(context, contextCache);
  }
  let pending = contextCache.get(midi);
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}samples/salamander/${name}.mp3`)
      .then((response) => {
        if (!response.ok) throw new Error(`No se pudo cargar ${name}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .catch((error: unknown) => {
        contextCache.delete(midi);
        throw error;
      });
    contextCache.set(midi, pending);
  }
  return pending;
}
