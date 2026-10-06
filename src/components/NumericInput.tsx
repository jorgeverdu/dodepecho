import { useState } from "react";
import type { ComponentProps } from "react";

export function parseNumericDraft(raw: string): number {
  return raw.trim() === "" ? Number.NaN : Number(raw);
}

export function NumericInput({
  value,
  onValueChange,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number;
  onValueChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      {...props}
      type="number"
      value={draft ?? (Number.isFinite(value) ? String(value) : "")}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        onValueChange(parseNumericDraft(raw));
      }}
      onBlur={() => {
        if (draft !== null) {
          onValueChange(parseNumericDraft(draft));
          setDraft(null);
        }
      }}
    />
  );
}
