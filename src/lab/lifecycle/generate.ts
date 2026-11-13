/**
 * Generates Kettlebloom's 22 months of synthetic customers and orders from a fixed seed.
 *
 * Each customer is created on the day of their first order and then walked forward: after every
 * order there is a chance of another one, roughly one pack-life later. An order dated after the
 * dataset's last day hasn't happened yet, so recent customers have short histories, exactly as
 * in a real store export. Subscribers order monthly until they cancel.
 *
 * A customer's orders are stored contiguously and in date order: orders.slice(c.o0, c.o0 + c.n).
 */

import { createRng, makeId, type Rng } from "../shared/lib/random.ts";
import {
  CHANNELS,
  CITIES,
  DAYS,
  END_DAY,
  EVENTS,
  FIRST_NAMES,
  PRODUCTS,
  SEED,
  WELCOME_CODE,
  calendarMonth,
  isFestive,
  productOf,
  type ChannelId,
  type CityId,
  type ProductId,
} from "./model.ts";

export type OrderChannel = "direct" | "marketplace";

export type Order = {
  id: string;
  /** Index into Dataset.customers. */
  customer: number;
  day: number;
  product: ProductId;
  /** Net value paid (₹), after any discount. */
  value: number;
  discount: number;
  channel: OrderChannel;
  /** 1 for the first order, 2 for the second … */
  seq: number;
};

export type Customer = {
  id: string;
  firstName: string;
  city: CityId;
  /** Where the customer was acquired. */
  channel: ChannelId;
  /** Day of the first order. */
  day: number;
  /** Acquired during the Diwali sale. */
  festive: boolean;
  /** Discount code on the first order, if any. */
  code: string | null;
  subscriber: boolean;
  firstProduct: ProductId;
  /** Consent to marketing messages on each channel. */
  whatsapp: boolean;
  email: boolean;
  /** First order index and order count. */
  o0: number;
  n: number;
};

export type Dataset = { customers: Customer[]; orders: Order[] };

const SEASON = [1.0, 0.95, 1.0, 0.95, 0.9, 0.92, 1.0, 1.0, 1.05, 1.25, 1.15, 1.05]; // Jan … Dec
const BASE_NEW = 16; // new customers on an ordinary day at the start
const TEAS: ProductId[] = ["masala", "assam", "kahwa", "darjeeling"];

function lognormalAround(rng: Rng, mean: number, sigma: number): number {
  // Mean-preserving lognormal: E[exp(N(μ, σ²))] = exp(μ + σ²/2).
  return mean * Math.exp(rng.normal(-(sigma * sigma) / 2, sigma));
}

function quantity(rng: Rng, product: ProductId): number {
  if (product === "club") return 1;
  return rng.weighted([1, 2, 3], product === "gift" ? [0.6, 0.25, 0.15] : [0.72, 0.23, 0.05]);
}

export function generate(seed = SEED): Dataset {
  const rng = createRng(seed);
  const customers: Customer[] = [];
  const orders: Order[] = [];
  let orderN = 0;

  const addOrder = (ci: number, day: number, product: ProductId, rate: number, channel: OrderChannel, seq: number) => {
    let gross = productOf(product).price * quantity(rng, product);
    if (product === "club" && seq > 1 && rng.chance(0.15)) gross += 450; // an add-on pack
    const discount = Math.round(gross * rate);
    orders.push({ id: makeId("OR", ++orderN), customer: ci, day, product, value: gross - discount, discount, channel, seq });
  };

  for (let day = 0; day < DAYS; day++) {
    const festive = isFestive(day);
    const growth = 0.8 + 0.5 * (day / (DAYS - 1));
    const lambda = BASE_NEW * growth * SEASON[calendarMonth(day)] * (festive ? EVENTS.festiveSale.acquisition : 1);
    const count = rng.poisson(lambda);

    for (let k = 0; k < count; k++) {
      const ch = rng.weighted(CHANNELS, CHANNELS.map((c) => c.share * (festive ? c.festive : 1)));
      const city = rng.weighted(CITIES, CITIES.map((c) => c.share)).id;
      const subscriber = rng.chance(ch.sub * (festive ? 0.3 : 1));
      const teaAndGifts = PRODUCTS.filter((p) => p.id !== "club");
      const first: ProductId = subscriber ? "club" : rng.weighted(teaAndGifts, teaAndGifts.map((p) => (festive ? p.festiveWeight : p.weight))).id;
      let code: string | null = null;
      let rate = 0;
      if (ch.id !== "marketplace") {
        if (festive && rng.chance(EVENTS.festiveSale.codeShare)) {
          code = EVENTS.festiveSale.code;
          rate = EVENTS.festiveSale.discount;
        } else if (!festive && !subscriber && rng.chance(WELCOME_CODE.share)) {
          code = WELCOME_CODE.code;
          rate = WELCOME_CODE.discount;
        }
      }
      const ci = customers.length;
      const customer: Customer = {
        id: makeId("KB", ci + 1),
        firstName: rng.pick(FIRST_NAMES),
        city,
        channel: ch.id,
        day,
        festive,
        code,
        subscriber,
        firstProduct: first,
        whatsapp: ch.id === "whatsapp" || rng.chance(0.68),
        email: rng.chance(0.86),
        o0: orders.length,
        n: 0,
      };
      customers.push(customer);
      const firstChannel: OrderChannel = ch.id === "marketplace" ? "marketplace" : "direct";
      addOrder(ci, day, first, rate, firstChannel, 1);
      let n = 1;

      if (subscriber) {
        // Monthly boxes until they cancel. Referred subscribers cancel a little less.
        const cancel = ch.id === "referral" ? 0.04 : 0.055;
        let d = day;
        for (;;) {
          const next = d + rng.int(28, 32);
          if (next > END_DAY || rng.chance(cancel)) break;
          addOrder(ci, next, "club", 0, "direct", ++n);
          d = next;
        }
      } else {
        // One pack-life later, maybe another order. Loyalty builds with every order.
        const personalGap = lognormalAround(rng, productOf(first).gap, 0.25);
        const propensity = Math.max(0.3, Math.min(1.6, rng.normal(1, 0.18)));
        let base = ch.repeat * propensity;
        if (festive && code === EVENTS.festiveSale.code) base *= EVENTS.festiveRepeatFactor;
        if (first === "gift") base *= 0.7;
        let product: ProductId = first === "gift" ? rng.pick(TEAS) : first;
        let d = day;
        for (;;) {
          let p = Math.min(0.9, base + 0.1 * (n - 1));
          const next = d + Math.max(7, Math.round(lognormalAround(rng, personalGap, 0.3)));
          // Regulars rely on the reminder; once it broke, fewer of them came back by themselves.
          if (n >= 2 && next >= EVENTS.reminderOutage.fromDay) p *= EVENTS.reminderOutage.factor;
          if (!rng.chance(p) || next > END_DAY) break;
          if (rng.chance(0.25)) product = rng.pick(TEAS);
          const channel: OrderChannel = ch.id === "marketplace" ? (rng.chance(EVENTS.marketplaceStays) ? "marketplace" : "direct") : rng.chance(0.04) ? "marketplace" : "direct";
          addOrder(ci, next, product, 0, channel, ++n);
          d = next;
        }
      }
      customer.n = n;
    }
  }
  return { customers, orders };
}

let cache: Dataset | null = null;
/** The dataset, generated once per page load (deterministic, so it's the same for everyone). */
export function getDataset(): Dataset {
  cache ??= generate();
  return cache;
}
