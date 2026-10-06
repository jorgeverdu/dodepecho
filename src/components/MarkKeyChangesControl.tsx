export function MarkKeyChangesControl({
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
        <strong>Marcar cambios de tonalidad</strong>
        <small>
          Reproduce dos notas de referencia antes de cada nueva tonalidad.
        </small>
      </span>
    </label>
  );
}
