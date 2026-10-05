import { useEffect, useRef } from "react";
import type { Pattern } from "../types";
export function Contour({
  pattern,
  active = -1,
  small = false,
}: {
  pattern: Pattern;
  active?: number;
  small?: boolean;
}) {
  const n = pattern.semitones.length;
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!element || active < 0 || element.scrollWidth <= element.clientWidth)
      return;
    const x = 24 + (active / Math.max(1, n - 1)) * (element.scrollWidth - 48);
    if (
      x < element.scrollLeft + 25 ||
      x > element.scrollLeft + element.clientWidth - 25
    )
      element.scrollLeft = Math.max(0, x - element.clientWidth / 2);
  }, [active, n]);
  const width = small ? 500 : Math.max(500, n * 30);
  if (!n)
    return (
      <div className="empty-contour">Añade notas para dibujar tu patrón</div>
    );
  const min = Math.min(...pattern.semitones),
    max = Math.max(...pattern.semitones);
  const points = pattern.semitones.map((note, i) => ({
    x: n === 1 ? width / 2 : 24 + (i * (width - 48)) / (n - 1),
    y: 94 - ((note - min) / Math.max(1, max - min)) * 65,
  }));
  return (
    <div className="contour-scroll" ref={container}>
      <svg
        className={small ? "contour small" : "contour"}
        viewBox={`0 0 ${width} 132`}
        style={!small && n > 12 ? { minWidth: n * 26 } : undefined}
        role="img"
        aria-label={`Patrón ${pattern.degrees.join(", ")}`}
      >
        {!small &&
          [29, 61, 94].map((y) => (
            <line
              key={y}
              x1="14"
              y1={y}
              x2={width - 14}
              y2={y}
              className="gridline"
            />
          ))}
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          className="melody-line"
        />
        {points.map((p, i) => (
          <g key={i}>
            {i === active && (
              <circle cx={p.x} cy={p.y} r="13" className="note-halo" />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={i === active ? 6 : 4}
              className={i === active ? "note-dot active" : "note-dot"}
            />
            {!small && (
              <text
                x={p.x}
                y="123"
                textAnchor="middle"
                className={i === active ? "degree active" : "degree"}
              >
                {pattern.degrees[i]}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
