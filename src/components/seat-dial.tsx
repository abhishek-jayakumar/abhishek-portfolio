"use client";

import { useState, type CSSProperties } from "react";
import { dotsPath, DOT_ROWS } from "@/lib/dots";

/**
 * The seat dial. Enquiries stay at the campaign's real floor of 1,000; you
 * change the seats. One row of dots is 50 seats. The first position (50) is the
 * real campaign, and every other position is a what-if.
 */

const ALL = dotsPath(DOT_ROWS);
const ENQUIRIES = 1000;
const REAL = 50;

const per = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function reading(seats: number): string {
  const ratio = ENQUIRIES / seats;
  if (seats === REAL)
    return "This is the real one: 50 conversions for 50 seats, from at least 1,000 enquiries. More enquiries couldn't have added a seat, so who they were mattered more than how many.";
  if (seats <= 300) return `With ${seats} seats it's still a choosing problem: at least ${per(ratio)} enquiries for every place.`;
  if (seats <= 650) return `Around ${per(ratio)} enquiries a seat, choosing and closing start to be the same job.`;
  if (seats < ENQUIRIES) return "Nearly every enquiry would need a seat, so volume matters again.";
  return "Every enquiry needs a seat. Now it's a volume problem, and the ad budget is the lever.";
}

export function SeatDial() {
  const [seats, setSeats] = useState(REAL);
  const real = seats === REAL;
  const ratio = ENQUIRIES / seats;
  const share = Math.round((seats / ENQUIRIES) * 100);

  return (
    <div className="dial">
      <div className="dial-field" style={{ "--rows": seats / 50 } as CSSProperties}>
        <svg viewBox="0 0 500 200" aria-hidden="true" focusable="false">
          <path className="dial-base" d={ALL} />
        </svg>
        <svg className="dial-hi" viewBox="0 0 500 200" aria-hidden="true" focusable="false">
          <path d={ALL} />
        </svg>
      </div>
      <p className="dial-caption">
        Each dot is an enquiry: 1,000 of them. Each row of terracotta dots is 50 seats.
      </p>

      <div className="dial-control">
        <label htmlFor="seat-range">Seats</label>
        <input
          id="seat-range"
          type="range"
          min={50}
          max={1000}
          step={50}
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          aria-valuetext={`${seats} seats`}
          aria-describedby="dial-reading"
        />
        <button type="button" onClick={() => setSeats(REAL)} disabled={real}>
          Back to the real one
        </button>
      </div>

      <dl className="dial-stats">
        <div>
          <dt>Seats</dt>
          <dd>{seats.toLocaleString("en-IN")}</dd>
          <span>{real ? "real campaign" : "what-if"}</span>
        </div>
        <div>
          <dt>Enquiries</dt>
          <dd>1,000+</dd>
          <span>real campaign</span>
        </div>
        <div>
          <dt>Enquiries per seat</dt>
          <dd>{per(ratio)}+</dd>
          <span>{real ? "worked out from the above" : "what-if"}</span>
        </div>
        <div>
          <dt>Share that took a seat</dt>
          <dd>{share}% or less</dd>
          <span>{real ? "worked out from the above" : "what-if"}</span>
        </div>
      </dl>

      <p id="dial-reading" className="dial-reading" aria-live="polite" aria-atomic="true">
        {reading(seats)}
      </p>
    </div>
  );
}
