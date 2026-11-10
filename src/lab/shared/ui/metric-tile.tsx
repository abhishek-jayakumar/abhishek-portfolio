import { isNum } from "@/lab/shared/lib/safe-math";
import { formatPercent } from "@/lab/shared/lib/format";
import { Sparkline } from "@/lab/shared/charts/sparkline";
import s from "./lab.module.css";

export type Delta = {
  /** Relative change as a fraction (0.12 = +12%). Null shows "no comparison". */
  value: number | null;
  /** Is an increase good for this metric? true (customers), false (CAC), or null when neither (spend). */
  upIsGood: boolean | null;
  /** What it is compared with: "vs previous period". */
  vs: string;
};

/** A stat tile: label, value, optional change against a named period, optional 12-point trend. */
export function MetricTile({ label, value, delta, trend, hint }: { label: string; value: string; delta?: Delta; trend?: (number | null)[]; hint?: string }) {
  let tone = s.deltaFlat;
  let arrow = "→";
  if (delta && isNum(delta.value) && Math.abs(delta.value) >= 0.0005) {
    const up = delta.value > 0;
    arrow = up ? "↑" : "↓";
    tone = delta.upIsGood === null ? s.deltaFlat : up === delta.upIsGood ? s.deltaGood : s.deltaBad;
  }
  return (
    <div className={s.tile}>
      <p className={s.tileLabel}>
        {label}
        {hint && <span className={s.tileHint}>{hint}</span>}
      </p>
      <p className={s.tileValue}>{value}</p>
      {delta && (
        <p className={`${s.delta} ${tone}`}>
          {isNum(delta.value) ? (
            <>
              <span aria-hidden="true">{arrow}</span> {formatPercent(Math.abs(delta.value))}
              <span className="sr-only">{delta.value > 0 ? " increase" : delta.value < 0 ? " decrease" : ""}</span>
            </>
          ) : (
            "no comparison"
          )}{" "}
          <span className={s.deltaVs}>{delta.vs}</span>
        </p>
      )}
      {trend && trend.filter(isNum).length > 1 && <Sparkline values={trend} label={`${label} trend`} />}
    </div>
  );
}
