export function PianoVolumeControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="piano-volume-control">
      Volumen del piano · {value} %
      <input
        type="range"
        min="0"
        max="200"
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Volumen del piano"
      />
    </label>
  );
}
