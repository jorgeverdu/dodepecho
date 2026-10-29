export function MetronomeControl({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="mark-key-control">
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <strong>Metrónomo</strong>
        <small>Marca el pulso del tempo durante la vocalización.</small>
      </span>
    </label>
  );
}
