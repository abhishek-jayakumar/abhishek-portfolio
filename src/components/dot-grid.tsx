import { dotsPath, DOT_ROWS } from "@/lib/dots";

const ALL = dotsPath(DOT_ROWS);
const FIRST = dotsPath(1);

/** The campaign as dots: the top row is the 50 seats, the whole grid is the 1,000 enquiries. */
export function DotGrid({ label }: { label?: string }) {
  return (
    <svg
      className="dot-grid"
      viewBox="0 0 500 200"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path className="dg-base" d={ALL} />
      <path className="dg-hi" d={FIRST} />
    </svg>
  );
}
