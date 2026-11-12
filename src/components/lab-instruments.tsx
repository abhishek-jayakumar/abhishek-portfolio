"use client";

import { useImperativeHandle, useRef, type Ref } from "react";
import type { Preview } from "@/lab/experiments";
import { ORDINAL, SEQUENTIAL, SERIES } from "@/lab/shared/lib/palette";
import { twoProportionTest } from "@/lab/shared/lib/stats";

/**
 * The Lab bench's instruments: one small, playable picture per experiment that shows the idea
 * the tool is built on. Each has a single control, t from 0 to 1, that the bench drives from the
 * pointer, the keyboard or a slow demo. `apply` writes straight to the SVG (no React render per
 * frame) and returns the sentence the readout shows. They are illustrations, not data: the
 * experiments themselves hold the synthetic datasets.
 */
export type InstrumentApi = {
  apply: (t: number) => string;
  /** Adds this instrument's entrance to a timeline (plays once, the first time it opens). */
  intro: (tl: gsap.core.Timeline) => void;
  /** Where the control sits at rest, and the range the demo sweeps. */
  rest: number;
  demo: [number, number];
  /** Seconds for one sweep of the demo. */
  sweep: number;
  ease: string;
  /** Keyboard step. */
  step: number;
};

export const INSTRUMENT_LABEL: Record<Preview, string> = {
  growth: "Try it: change the MQL to SQL conversion rate",
  paid: "Try it: change the spend on one channel",
  lifecycle: "Try it: pick a month since first order",
  cro: "Try it: change the visitors per variant",
};

const VB = "0 0 560 230";
const INK = "#1d1736";
const MUTED = "#625c78";
const AXIS = "#c9c2dc";
const BRASS = "#b5801a";
const PAPER = "#fffdf8";
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

type Props = { api: Ref<InstrumentApi | null> };

export function Instrument({ kind, api }: Props & { kind: Preview }) {
  if (kind === "growth") return <Funnel api={api} />;
  if (kind === "paid") return <Returns api={api} />;
  if (kind === "lifecycle") return <Cohorts api={api} />;
  return <AbTest api={api} />;
}

/* ---------------------------------------------------------------- growth */

const STAGES = ["Lead", "MQL", "SQL", "Opportunity", "Customer"];
const BASE = [1, 0.62, 0.34, 0.2, 0.11];
const FX0 = 120;
const FW = 420;
const fy = (i: number) => 12 + i * 43;
const factor = (t: number) => 0.6 + clamp01(t) * 0.9;

/** A funnel where the MQL → SQL step is a lever: every stage after it moves with it. */
function Funnel({ api }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  useImperativeHandle(api, (): InstrumentApi => {
    const q = <T extends Element>(sel: string) => Array.from(svg.current?.querySelectorAll<T & Element>(sel) ?? []) as T[];
    return {
      rest: 0.4 / 0.9,
      demo: [0.08, 0.95],
      sweep: 3.6,
      ease: "sine.inOut",
      step: 0.05,
      apply(t) {
        const f = factor(t);
        const bars = q<SVGRectElement>("[data-bar]");
        bars.forEach((b, i) => b.setAttribute("width", String(FW * BASE[i] * (i >= 2 ? f : 1))));
        const kx = FX0 + FW * BASE[2] * f;
        q<SVGGElement>("[data-knob]")[0]?.setAttribute("transform", `translate(${kx} 0)`);
        const cx = FX0 + FW * BASE[4] * f;
        const out = q<SVGTextElement>("[data-out]")[0];
        if (out) {
          out.setAttribute("x", String(cx + 12));
          out.textContent = `×${f.toFixed(2)} customers`;
        }
        const change = Math.round((f - 1) * 100);
        if (change <= -6) return `MQL → SQL down ${-change}%: every stage after it shrinks with it.`;
        if (change >= 6) return `MQL → SQL up ${change}%: opportunities and customers follow.`;
        return "Today's rates. One step in the middle sets everything below it.";
      },
      intro(tl) {
        tl.from(q("[data-bar]"), { scaleX: 0, transformOrigin: "0% 50%", duration: 0.8, stagger: 0.08, ease: "power3.out" }, 0)
          .from(q("[data-label]"), { opacity: 0, x: -8, duration: 0.5, stagger: 0.06 }, 0.1)
          .from(q("[data-knob] > *"), { scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(2.5)" }, 0.7)
          .from(q("[data-out]"), { opacity: 0, duration: 0.4 }, 0.9);
      },
    };
  }, []);

  const sql = fy(2);
  return (
    <svg ref={svg} viewBox={VB} aria-hidden="true" focusable="false">
      {STAGES.map((st, i) => (
        <g key={st}>
          <text data-label data-l x="0" y={fy(i) + 20} fontSize="16" fontWeight="600" fill={i === 2 ? INK : MUTED}>
            {st}
          </text>
          <rect data-bar x={FX0} y={fy(i)} height="30" rx="5" width={FW * BASE[i]} fill={ORDINAL[i]} />
        </g>
      ))}
      <g data-knob transform={`translate(${FX0 + FW * BASE[2]} 0)`}>
        <line x1="0" x2="0" y1={sql - 7} y2={sql + 37} stroke={BRASS} strokeWidth="3" strokeLinecap="round" />
        <circle cx="0" cy={sql + 15} r="8" fill={PAPER} stroke={BRASS} strokeWidth="3" />
      </g>
      <text data-out data-l x={FX0 + FW * BASE[4] + 12} y={fy(4) + 20} fontSize="16" fontWeight="700" fill={INK}>
        ×1.00 customers
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ paid */

const PX0 = 72;
const PW = 462;
const PY0 = 22;
const PH = 172;
const K = 3;
const NORM = 1 - Math.exp(-K);
const resp = (s: number) => (1 - Math.exp(-K * s)) / NORM;
const px = (s: number) => PX0 + s * PW;
const py = (s: number) => PY0 + PH - resp(s) * PH;
const CURVE = Array.from({ length: 61 }, (_, i) => i / 60)
  .map((s, i) => `${i ? "L" : "M"}${px(s).toFixed(1)},${py(s).toFixed(1)}`)
  .join("");

/** A response curve: the first dollars on a channel buy a lot, later ones buy less. */
function Returns({ api }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  useImperativeHandle(api, (): InstrumentApi => {
    const one = <T extends Element>(sel: string) => svg.current?.querySelector(sel) as T | null;
    return {
      rest: 0.3,
      demo: [0.06, 0.94],
      sweep: 4.2,
      ease: "sine.inOut",
      step: 0.05,
      apply(t) {
        const s = 0.04 + clamp01(t) * 0.92;
        const x = px(s);
        const y = py(s);
        const pts = [];
        for (let i = 0; i <= 40; i++) {
          const u = (s * i) / 40;
          pts.push(`L${px(u).toFixed(1)},${py(u).toFixed(1)}`);
        }
        one("[data-area]")?.setAttribute("d", `M${PX0},${PY0 + PH}${pts.join("")}L${x.toFixed(1)},${PY0 + PH}Z`);
        one("[data-dot]")?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        one("[data-drop]")?.setAttribute("x1", x.toFixed(1));
        one("[data-drop]")?.setAttribute("x2", x.toFixed(1));
        one("[data-drop]")?.setAttribute("y1", y.toFixed(1));
        // The tangent: how many leads the next dollar buys, drawn as a slope.
        const slope = ((K * Math.exp(-K * s)) / NORM) * (PH / PW);
        const len = Math.hypot(1, slope);
        const dx = 70 / len;
        const dy = (70 * slope) / len;
        const tan = one<SVGLineElement>("[data-tan]");
        tan?.setAttribute("x1", (x - dx * 0.7).toFixed(1));
        tan?.setAttribute("y1", (y + dy * 0.7).toFixed(1));
        tan?.setAttribute("x2", (x + dx).toFixed(1));
        tan?.setAttribute("y2", (y - dy).toFixed(1));
        const marginal = Math.exp(-K * s);
        if (marginal > 0.45) return "Room to grow: the next dollar here still buys plenty of leads.";
        if (marginal > 0.17) return "Flattening: each extra dollar buys fewer leads than the last.";
        return "Saturated: this budget would work harder on another channel.";
      },
      intro(tl) {
        tl.from(one("[data-curve]"), { drawSVG: "0%", duration: 1.1, ease: "power2.inOut" }, 0)
          .from(one("[data-area]"), { opacity: 0, duration: 0.6 }, 0.6)
          .from([one("[data-drop]"), one("[data-tan]")], { opacity: 0, duration: 0.4 }, 0.9)
          .from(one("[data-dot] circle"), { scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(2.5)" }, 0.9);
      },
    };
  }, []);

  return (
    <svg ref={svg} viewBox={VB} aria-hidden="true" focusable="false">
      <line x1={PX0} x2={PX0 + PW} y1={PY0 + PH} y2={PY0 + PH} stroke={AXIS} />
      <line x1={PX0} x2={PX0} y1={PY0 - 6} y2={PY0 + PH} stroke={AXIS} />
      <text data-l x={PX0 - 10} y={PY0 + 10} fontSize="16" fontWeight="600" fill={MUTED} textAnchor="end">
        Leads
      </text>
      <text data-l x={PX0 + PW} y={PY0 + PH + 26} fontSize="16" fontWeight="600" fill={MUTED} textAnchor="end">
        Spend on one channel
      </text>
      <path data-area d="" fill={SERIES[0]} opacity="0.12" />
      <path data-curve d={CURVE} fill="none" stroke={SERIES[0]} strokeWidth="3" strokeLinecap="round" />
      <line data-drop x1="0" x2="0" y1="0" y2={PY0 + PH} stroke={SERIES[0]} strokeWidth="1.5" strokeDasharray="3 4" />
      <line data-tan stroke={BRASS} strokeWidth="3" strokeLinecap="round" />
      <g data-dot>
        <circle r="8" fill={PAPER} stroke={SERIES[0]} strokeWidth="3" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------- lifecycle */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const CELL = 24;
const STEP = 27;
const CX0 = 150;
const CY0 = 28;
/** Share of a cohort still buying c months after its first order (illustrative shape). */
const share = (r: number, c: number) => (c === 0 ? 1 : 0.46 * Math.exp(-0.3 * (c - 1)) + 0.05 * (r / 6));
const tone = (v: number) => SEQUENTIAL[Math.max(1, Math.min(SEQUENTIAL.length - 1, Math.round(v * (SEQUENTIAL.length - 1))))];
const COHORT_LINES = [
  "Month 0: every customer's first order.",
  "Month 1: the biggest drop. Most one-time buyers leave here.",
  "Month 2: the curve starts to flatten.",
  "Month 3: newer cohorts are holding on better than older ones.",
  "Month 4: a loyal core is settling in.",
  "Month 5: whoever is left is worth a win-back plan.",
  "Month 6: the oldest cohort gives the clearest view of loyalty.",
];

/** A cohort triangle. The control picks a month and pulls that column out as bars. */
function Cohorts({ api }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  useImperativeHandle(api, (): InstrumentApi => {
    const q = <T extends Element>(sel: string) => Array.from(svg.current?.querySelectorAll(sel) ?? []) as T[];
    return {
      rest: 1 / 6,
      demo: [0, 1],
      sweep: 7,
      ease: "none",
      step: 1 / 6,
      apply(t) {
        const k = Math.round(clamp01(t) * 6);
        q<SVGRectElement>("[data-cell]").forEach((el) => {
          el.style.opacity = Number(el.dataset.c) === k ? "1" : "0.32";
        });
        const hl = q<SVGRectElement>("[data-col]")[0];
        if (hl) {
          hl.setAttribute("x", String(CX0 + k * STEP - 3));
          hl.setAttribute("height", String((7 - k) * STEP + 3));
        }
        q<SVGRectElement>("[data-pull]").forEach((el) => {
          const r = Number(el.dataset.r);
          const show = r <= 6 - k;
          el.style.transform = `scaleX(${show ? share(r, k) : 0})`;
        });
        const head = q<SVGTextElement>("[data-month]")[0];
        if (head) head.textContent = `Month ${k}`;
        return COHORT_LINES[k];
      },
      intro(tl) {
        tl.from(q("[data-cell]"), { opacity: 0, scale: 0.4, transformOrigin: "50% 50%", duration: 0.35, stagger: { each: 0.012, from: "start" }, ease: "back.out(2)" }, 0)
          .from(q("[data-col]"), { opacity: 0, duration: 0.4 }, 0.6)
          .from(q("[data-month], [data-tick]"), { opacity: 0, duration: 0.4 }, 0.6);
      },
    };
  }, []);

  const cells = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7 - r; c++) {
      cells.push(
        <rect key={`${r}-${c}`} data-cell data-c={c} x={CX0 + c * STEP} y={CY0 + r * STEP} width={CELL} height={CELL} rx="4" fill={tone(share(r, c))} />,
      );
    }
  }
  return (
    <svg ref={svg} viewBox={VB} aria-hidden="true" focusable="false">
      {MONTHS.map((m, r) => (
        <text key={m} data-l x={CX0 - 12} y={CY0 + r * STEP + 17} fontSize="15" fontWeight="600" fill={MUTED} textAnchor="end">
          {m}
        </text>
      ))}
      <text data-tick x={CX0} y={CY0 - 10} fontSize="13" fontWeight="600" fill={MUTED}>
        months since first order →
      </text>
      {cells}
      <rect data-col x={CX0 + STEP - 3} y={CY0 - 3} width={CELL + 6} height={6 * STEP + 3} rx="6" fill="none" stroke={BRASS} strokeWidth="2.5" />
      <text data-month x="380" y={CY0 - 8} fontSize="22" fontWeight="600" fill={INK} style={{ fontFamily: "var(--f-head)" }}>
        Month 1
      </text>
      {MONTHS.map((m, r) => (
        <rect
          key={m}
          data-pull
          data-r={r}
          x="380"
          y={CY0 + r * STEP + 4}
          width="160"
          height={CELL - 8}
          rx="3"
          fill={SERIES[0]}
          style={{ transformBox: "fill-box", transformOrigin: "0% 50%", transform: `scaleX(${share(r, 1)})` }}
        />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------- cro */

const RATE_A = 0.04;
const RATE_B = 0.046;
const ry = (p: number) => 196 - (p / 0.07) * 172;
const visitors = (t: number) => Math.round(300 * Math.pow(100, clamp01(t)));
const BARS = [
  { key: "A", x: 130, rate: RATE_A, fill: ORDINAL[1] },
  { key: "B", x: 260, rate: RATE_B, fill: ORDINAL[3] },
];

/** Control against variation. More visitors shrink the uncertainty until the gap is real. */
function AbTest({ api }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  useImperativeHandle(api, (): InstrumentApi => {
    const one = <T extends Element>(sel: string) => svg.current?.querySelector(sel) as T | null;
    const q = <T extends Element>(sel: string) => Array.from(svg.current?.querySelectorAll(sel) ?? []) as T[];
    return {
      rest: 0.2,
      demo: [0.04, 1],
      sweep: 5,
      ease: "sine.inOut",
      step: 0.04,
      apply(t) {
        const n = visitors(t);
        BARS.forEach((b, i) => {
          const h = 1.96 * Math.sqrt((b.rate * (1 - b.rate)) / n);
          const top = ry(Math.min(0.07, b.rate + h));
          const bot = ry(Math.max(0, b.rate - h));
          const w = q<SVGGElement>("[data-whisker]")[i];
          if (!w) return;
          const [stem, capT, capB] = Array.from(w.children) as SVGLineElement[];
          stem.setAttribute("y1", top.toFixed(1));
          stem.setAttribute("y2", bot.toFixed(1));
          capT.setAttribute("y1", top.toFixed(1));
          capT.setAttribute("y2", top.toFixed(1));
          capB.setAttribute("y1", bot.toFixed(1));
          capB.setAttribute("y2", bot.toFixed(1));
        });
        const test = twoProportionTest(Math.round(RATE_A * n), n, Math.round(RATE_B * n), n);
        const real = !!test && test.pValue < 0.05;
        const count = one<SVGTextElement>("[data-n]");
        if (count) count.textContent = n.toLocaleString("en-US");
        const verdict = one<SVGTextElement>("[data-verdict]");
        if (verdict) verdict.textContent = real ? "Likely a real lift" : "Too early to call";
        one("[data-flag]")?.setAttribute("fill", real ? "#2f8a3a" : AXIS);
        const each = `${n.toLocaleString("en-US")} visitors each`;
        return real ? `${each}: B's lift is now unlikely to be noise.` : `${each}: the ranges overlap, so it is too early to call.`;
      },
      intro(tl) {
        tl.from(q("[data-ab]"), { scaleY: 0, transformOrigin: "50% 100%", duration: 0.8, stagger: 0.15, ease: "power3.out" }, 0)
          .from(q("[data-whisker]"), { opacity: 0, scaleY: 1.8, transformOrigin: "50% 50%", duration: 0.7, stagger: 0.15 }, 0.5)
          .from(q("[data-side]"), { opacity: 0, x: 10, duration: 0.5, stagger: 0.08 }, 0.6);
      },
    };
  }, []);

  return (
    <svg ref={svg} viewBox={VB} aria-hidden="true" focusable="false">
      <line x1="96" x2="370" y1="196" y2="196" stroke={AXIS} />
      {BARS.map((b) => (
        <g key={b.key}>
          <path
            data-ab
            d={`M${b.x},196V${ry(b.rate) + 5}A5,5 0 0 1 ${b.x + 5},${ry(b.rate)}H${b.x + 59}A5,5 0 0 1 ${b.x + 64},${ry(b.rate) + 5}V196Z`}
            fill={b.fill}
          />
          <text x={b.x + 32} y={ry(b.rate) + 24} fontSize="15" fontWeight="700" fill={PAPER} textAnchor="middle">
            {(b.rate * 100).toFixed(1)}%
          </text>
          <g data-whisker stroke={INK} strokeWidth="2" strokeLinecap="round">
            <line x1={b.x + 32} x2={b.x + 32} />
            <line x1={b.x + 22} x2={b.x + 42} />
            <line x1={b.x + 22} x2={b.x + 42} />
          </g>
          <text x={b.x + 32} y="220" fontSize="17" fontWeight="700" fill={INK} textAnchor="middle">
            {b.key}
          </text>
        </g>
      ))}
      <g data-side>
        <text x="410" y="70" fontSize="14" fontWeight="600" fill={MUTED}>
          visitors per variant
        </text>
        <text data-n x="410" y="104" fontSize="32" fontWeight="600" fill={INK} style={{ fontFamily: "var(--f-head)" }}>
          1,000
        </text>
      </g>
      <g data-side>
        <circle data-flag cx="417" cy="135" r="6" fill={AXIS} />
        <text data-verdict x="430" y="140" fontSize="14" fontWeight="700" fill={INK}>
          Too early to call
        </text>
      </g>
    </svg>
  );
}
