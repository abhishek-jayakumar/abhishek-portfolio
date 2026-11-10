import type { Preview } from "@/lab/experiments";
import { ORDINAL, SEQUENTIAL, SERIES } from "@/lab/shared/lib/palette";

/**
 * Small, abstract previews for the Lab cards: the shape of each tool, not its numbers (the real
 * numbers live inside the experiments, labelled as synthetic). Parts carry data-* hooks for the
 * card animation in lab.tsx; without motion they are simply the finished picture.
 */
export function LabPreview({ kind }: { kind: Preview }) {
  const common = { viewBox: "0 0 320 180", width: "100%", height: "100%", "aria-hidden": true, focusable: false, preserveAspectRatio: "xMidYMid meet" } as const;

  if (kind === "growth") {
    const widths = [150, 116, 84, 56, 34];
    const pts = [
      [190, 132],
      [212, 120],
      [234, 124],
      [256, 98],
      [278, 84],
      [300, 56],
    ];
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join("");
    return (
      <svg {...common}>
        {[52, 92, 132].map((y) => (
          <line key={y} x1="186" x2="304" y1={y} y2={y} stroke="#e4dcf7" strokeWidth="1" />
        ))}
        {widths.map((w, i) => (
          <rect key={w} data-grow x="20" y={34 + i * 24} width={w} height="16" rx="4" fill={ORDINAL[i]} />
        ))}
        <path data-wash d={`${line}L300,150L190,150Z`} fill={SERIES[0]} opacity="0.1" />
        <path data-draw d={line} fill="none" stroke={SERIES[0]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle data-pop cx="300" cy="56" r="5" fill={SERIES[0]} stroke="#fffdf8" strokeWidth="2" />
      </svg>
    );
  }

  if (kind === "paid") {
    const rows = [
      { y: 44, split: [0.44, 0.36, 0.2] },
      { y: 84, split: [0.3, 0.28, 0.42] },
    ];
    const W = 270;
    return (
      <svg {...common}>
        {rows.map((r, ri) => {
          let x = 25;
          return (
            <g key={r.y}>
              {r.split.map((f, i) => {
                const w = f * W - 2;
                const el = <rect key={i} data-seg={ri} x={x} y={r.y} width={w} height="22" rx="4" fill={SERIES[i]} />;
                x += f * W;
                return el;
              })}
            </g>
          );
        })}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="25" y={128 + i * 14} width="270" height="3" rx="1.5" fill="#e4dcf7" />
            <circle data-knob cx={[150, 120, 210][i]} cy={129.5 + i * 14} r="5.5" fill="#fffdf8" stroke={SERIES[i]} strokeWidth="2.5" />
          </g>
        ))}
      </svg>
    );
  }

  if (kind === "lifecycle") {
    const size = 7;
    const cell = 19;
    const gap = 3;
    const cells: { x: number; y: number; fill: string; d: number }[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size - r; c++) {
        const strength = c === 0 ? 1 : Math.max(0, 0.78 - c * 0.11 + (r % 3) * 0.03);
        const idx = Math.max(1, Math.min(SEQUENTIAL.length - 1, Math.round(strength * (SEQUENTIAL.length - 1))));
        cells.push({ x: 80 + c * (cell + gap), y: 16 + r * (cell + gap), fill: SEQUENTIAL[idx], d: r + c });
      }
    }
    return (
      <svg {...common}>
        {cells.map((c) => (
          <rect key={`${c.x}-${c.y}`} data-cell={c.d} x={c.x} y={c.y} width={cell} height={cell} rx="4" fill={c.fill} />
        ))}
      </svg>
    );
  }

  // cro: control vs variation with uncertainty whiskers.
  return (
    <svg {...common}>
      <line x1="40" x2="290" y1="150" y2="150" stroke="#c9c2dc" strokeWidth="1" />
      {[
        { x: 95, h: 72, color: ORDINAL[1], label: "A", ci: 26 },
        { x: 195, h: 96, color: ORDINAL[3], label: "B", ci: 22 },
      ].map((b) => (
        <g key={b.label}>
          <path data-bar d={`M${b.x},150V${150 - b.h + 4}A4,4 0 0 1 ${b.x + 4},${150 - b.h}H${b.x + 36}A4,4 0 0 1 ${b.x + 40},${150 - b.h + 4}V150Z`} fill={b.color} />
          <g data-whisker>
            <line x1={b.x + 20} x2={b.x + 20} y1={150 - b.h - b.ci} y2={150 - b.h + b.ci} stroke="#1d1736" strokeWidth="1.5" />
            <line x1={b.x + 13} x2={b.x + 27} y1={150 - b.h - b.ci} y2={150 - b.h - b.ci} stroke="#1d1736" strokeWidth="1.5" />
            <line x1={b.x + 13} x2={b.x + 27} y1={150 - b.h + b.ci} y2={150 - b.h + b.ci} stroke="#1d1736" strokeWidth="1.5" />
          </g>
          <text x={b.x + 20} y="168" textAnchor="middle" fontSize="12" fontWeight="700" fill="#2c2645" fontFamily="var(--f-body)">
            {b.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
