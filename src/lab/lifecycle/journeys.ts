/**
 * Lifecycle journeys: templates, message drafting and a simple outcome simulation.
 *
 * Messages are templates, not generated text. Placeholders such as {first_name} are filled from a
 * real customer's record or from the audience's own numbers (the replenishment reminder is timed
 * from the segment's median reorder gap), so a draft can never mention a product the customer
 * didn't buy or a number the data doesn't hold.
 */

import { ratio, sum } from "../shared/lib/safe-math.ts";
import { formatNumber } from "../shared/lib/format.ts";
import type { Dataset } from "./generate.ts";
import { cityOf, productOf } from "./model.ts";
import { gaps, median, type Profile, type SegmentId } from "./metrics.ts";

export type GoalId = "welcome" | "followup" | "replenish" | "reactivate" | "winback";
export type JourneyChannel = "whatsapp" | "email";

export type Step = {
  id: string;
  channel: JourneyChannel;
  /** Days after the previous step (the first step: days after the trigger). */
  delay: number;
  /** Email only. */
  subject: string;
  body: string;
};

export type Goal = {
  id: GoalId;
  label: string;
  trigger: string;
  /** Default incentive, editable in the builder. */
  offer: string;
  /** Orders per message read, before the step decay (a modelling assumption, shown in the interface). */
  conversion: number;
  /** Share of the order value given away when the offer is a percentage discount. */
  discount: number;
};

export const GOALS: Goal[] = [
  { id: "welcome", label: "Welcome", trigger: "First order delivered", offer: "10% off your second order with code SECOND10", conversion: 0.06, discount: 0.1 },
  { id: "followup", label: "Post-purchase follow-up", trigger: "Any order delivered", offer: "a free brewing guide", conversion: 0.035, discount: 0 },
  { id: "replenish", label: "Replenishment reminder", trigger: "Days since last order reach the reorder point", offer: "free delivery on your refill", conversion: 0.09, discount: 0 },
  { id: "reactivate", label: "Reactivation", trigger: "No order for 60 days", offer: "a free 50g sampler with your next order", conversion: 0.035, discount: 0 },
  { id: "winback", label: "Win-back", trigger: "No order for 120 days", offer: "15% off with code COMEBACK15", conversion: 0.025, discount: 0.15 },
];

export const goalOf = (id: GoalId) => GOALS.find((g) => g.id === id) as Goal;

/** The goal that fits a segment best (the builder's default). */
export function recommendedGoal(segment: SegmentId | "all"): GoalId {
  if (segment === "new") return "welcome";
  if (segment === "active" || segment === "loyal" || segment === "high") return "replenish";
  if (segment === "risk") return "reactivate";
  if (segment === "lapsed") return "winback";
  return "followup";
}

export const PLACEHOLDERS = ["first_name", "last_product", "days_since", "reorder_days", "city", "offer", "brand"] as const;
export type Vars = Record<(typeof PLACEHOLDERS)[number], string>;

/** Placeholders for one customer, with the audience-level reorder point. */
export function varsFor(p: Profile, reorderDays: number, offer: string): Vars {
  return {
    first_name: p.c.firstName,
    last_product: productOf(p.lastProduct).label,
    days_since: formatNumber(p.recency),
    reorder_days: formatNumber(reorderDays),
    city: cityOf(p.c.city).label,
    offer,
    brand: "Kettlebloom",
  };
}

/** Fill {placeholders}. Unknown ones are left in place and reported, so a typo is visible, not silent. */
export function fill(text: string, vars: Vars): { text: string; unknown: string[] } {
  const unknown: string[] = [];
  const out = text.replace(/\{([a-z_]+)\}/g, (whole, key: string) => {
    if (key in vars) return vars[key as keyof Vars];
    if (!unknown.includes(key)) unknown.push(key);
    return whole;
  });
  return { text: out, unknown };
}

/** The median days between orders for an audience; falls back to 35 when nobody has reordered. */
export function reorderPoint(data: Dataset, ps: Profile[]): { median: number; send: number; fromData: boolean } {
  const m = median(gaps(data, ps));
  const med = m === null ? 35 : Math.round(m);
  return { median: med, send: Math.max(7, med - 5), fromData: m !== null };
}

let stepN = 0;
const step = (channel: JourneyChannel, delay: number, body: string, subject = ""): Step => ({ id: `s${++stepN}`, channel, delay, subject, body });

/** A goal's starting steps. The replenishment reminder is timed from the audience's reorder point. */
export function templateSteps(goal: GoalId, sendDay: number): Step[] {
  switch (goal) {
    case "welcome":
      return [
        step("whatsapp", 2, "Hi {first_name}, your {last_product} should be with you now. Brew tip: 2 minutes for a lighter cup, 4 for a strong one. Reply here if anything arrived damaged. – Team {brand}"),
        step("email", 5, "Hi {first_name},\n\nThank you for your first order. Here is how our customers in {city} brew their {last_product}, and the three teas they try next.\n\nAs a welcome, here is {offer}.\n\n{brand}", "How to get the best cup from your {last_product}"),
        step("whatsapp", 14, "{first_name}, a quick one: how was the {last_product}? Your second order comes with {offer}. Valid for 7 days."),
      ];
    case "followup":
      return [
        step("email", 3, "Hi {first_name},\n\nWe hope the {last_product} is going well. Would you rate it in one tap? It takes ten seconds and helps us choose next season's blends.\n\nAs a thank-you, here is {offer}.\n\n{brand}", "How is your {last_product}?"),
        step("whatsapp", 10, "Hi {first_name}! Thanks for rating us. Here is {offer}, as promised. – {brand}"),
      ];
    case "replenish":
      return [
        step("whatsapp", sendDay, "Hi {first_name}, most people finish a pack of {last_product} in about {reorder_days} days, so you may be running low. Reorder in one tap and get {offer}. – {brand}"),
        step("email", 4, "Hi {first_name},\n\nIt has been {days_since} days since your last {last_product}. Reorder now and get {offer}.\n\n{brand}", "Running low on {last_product}?"),
      ];
    case "reactivate":
      return [
        step("email", 0, "Hi {first_name},\n\nIt has been {days_since} days since your last order. Our new season's teas are in, and your next order comes with {offer}.\n\n{brand}", "{first_name}, we've missed you"),
        step("whatsapp", 5, "Hi {first_name}, your {offer} is waiting. Shall we send your usual {last_product}? Reply YES and we'll set it up. – {brand}"),
        step("email", 9, "Hi {first_name},\n\nLast reminder: {offer} ends this Sunday.\n\n{brand}", "Last chance: {offer}"),
      ];
    case "winback":
      return [
        step("email", 0, "Hi {first_name},\n\nIt has been a while. Here is {offer}, on anything in the store, valid for 14 days.\n\n{brand}", "A little something to bring you back, {first_name}"),
        step("whatsapp", 7, "Hi {first_name}, your {offer} ends in a week. Your last order was {last_product}; it's back in stock. – {brand}"),
      ];
  }
}

// ---------------------------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------------------------

/** Assumptions behind the projection, shown next to it. */
export const CHANNEL_RATES: Record<JourneyChannel, { label: string; read: number; cost: number }> = {
  whatsapp: { label: "WhatsApp", read: 0.82, cost: 0.88 }, // read rate; ₹ per marketing message
  email: { label: "Email", read: 0.3, cost: 0.05 }, // open rate; ₹ per email
};
/** Each later step converts this much less than the one before (the keenest respond first). */
export const STEP_DECAY = 0.65;

export type Audience = { size: number; whatsapp: number; email: number; aov: number | null };

export function audienceOf(ps: Profile[]): Audience {
  const orders = sum(ps.map((p) => p.orders));
  return {
    size: ps.length,
    whatsapp: ps.filter((p) => p.c.whatsapp).length,
    email: ps.filter((p) => p.c.email).length,
    aov: ratio(sum(ps.map((p) => p.spend)), orders),
  };
}

export type StepResult = { id: string; day: number; sent: number; read: number; orders: number };
export type Simulation = { steps: StepResult[]; orders: number; revenue: number; discountCost: number; messageCost: number; conversion: number | null };

/**
 * Walk the audience through the steps. At each step, only people who haven't ordered yet and who
 * consented to that channel get the message; a share read it; a share of readers order and leave
 * the journey. Deliberately simple, and labelled as a simulation wherever it is shown.
 */
export function simulateJourney(steps: Step[], a: Audience, goal: GoalId): Simulation {
  const g = goalOf(goal);
  let remaining = a.size;
  let day = 0;
  const out: StepResult[] = [];
  steps.forEach((st, i) => {
    day += Math.max(0, st.delay);
    const consent = ratio(st.channel === "whatsapp" ? a.whatsapp : a.email, a.size) ?? 0;
    const sent = remaining * consent;
    const read = sent * CHANNEL_RATES[st.channel].read;
    const orders = read * g.conversion * STEP_DECAY ** i;
    remaining -= orders;
    out.push({ id: st.id, day, sent, read, orders });
  });
  const orders = sum(out.map((r) => r.orders));
  const gross = orders * (a.aov ?? 0);
  const discountCost = gross * g.discount;
  return {
    steps: out,
    orders,
    revenue: gross - discountCost,
    discountCost,
    messageCost: sum(out.map((r, i) => r.sent * CHANNEL_RATES[steps[i].channel].cost)),
    conversion: ratio(orders, a.size),
  };
}

/** A blank step for the builder's "Add a step". */
export function newStep(channel: JourneyChannel = "whatsapp"): Step {
  return step(channel, 3, "Hi {first_name}, ", channel === "email" ? "A note from {brand}" : "");
}
