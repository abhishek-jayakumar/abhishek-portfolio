/**
 * Kettlebloom, a fictional direct-to-consumer tea brand selling online in India: its products,
 * acquisition channels, cities and the assumptions the synthetic generator works from. Every
 * chart, segment and assistant finding is derived from customer and order records built on
 * these definitions; nothing downstream hardcodes a result.
 */

export const START_ISO = "2025-01-01"; // day 0
export const DAYS = 669; // 1 Jan 2025 … 31 Oct 2026: 22 full months
export const END_DAY = DAYS - 1; // 31 Oct 2026, the "today" of the dataset
export const MONTHS = 22;
export const SEED = 20261031;
/** Gross margin used to turn revenue into customer lifetime value. */
export const GROSS_MARGIN = 0.55;

export type ChannelId = "instagram" | "google" | "marketplace" | "referral" | "whatsapp";
export type ProductId = "masala" | "assam" | "kahwa" | "darjeeling" | "gift" | "club";
export type CityId = "BLR" | "BOM" | "DEL" | "PNQ" | "HYD" | "MAA" | "CCU" | "AMD" | "COK" | "JAI";

export type Channel = {
  id: ChannelId;
  label: string;
  /** Share of new customers on a normal day. */
  share: number;
  /** Multiplier on that share during the festive sale. */
  festive: number;
  /** Chance a customer acquired here places a second order (before other effects). */
  repeat: number;
  /** Chance a new customer starts on the monthly subscription. */
  sub: number;
};

export const CHANNELS: Channel[] = [
  { id: "instagram", label: "Instagram", share: 0.32, festive: 1.5, repeat: 0.4, sub: 0.07 },
  { id: "google", label: "Google search", share: 0.24, festive: 0.9, repeat: 0.44, sub: 0.06 },
  { id: "marketplace", label: "Marketplace", share: 0.2, festive: 1.6, repeat: 0.3, sub: 0 },
  { id: "referral", label: "Referral", share: 0.12, festive: 0.6, repeat: 0.58, sub: 0.14 },
  { id: "whatsapp", label: "WhatsApp", share: 0.12, festive: 0.7, repeat: 0.52, sub: 0.1 },
];

export type Product = {
  id: ProductId;
  label: string;
  /** Price per unit (₹). */
  price: number;
  /** Typical days a pack lasts before a reorder. */
  gap: number;
  /** Weight as a first purchase on a normal day, and during the festive sale. */
  weight: number;
  festiveWeight: number;
};

export const PRODUCTS: Product[] = [
  { id: "masala", label: "Masala Chai 250g", price: 450, gap: 32, weight: 0.34, festiveWeight: 0.18 },
  { id: "assam", label: "Assam Breakfast 250g", price: 420, gap: 35, weight: 0.22, festiveWeight: 0.1 },
  { id: "kahwa", label: "Kashmiri Kahwa 100g", price: 520, gap: 40, weight: 0.18, festiveWeight: 0.12 },
  { id: "darjeeling", label: "Darjeeling First Flush 100g", price: 780, gap: 45, weight: 0.14, festiveWeight: 0.12 },
  { id: "gift", label: "Festive Gift Box", price: 1450, gap: 90, weight: 0.12, festiveWeight: 0.48 },
  { id: "club", label: "Chai Club subscription", price: 699, gap: 30, weight: 0, festiveWeight: 0 },
];

export const CITIES: { id: CityId; label: string; share: number }[] = [
  { id: "BLR", label: "Bengaluru", share: 0.18 },
  { id: "BOM", label: "Mumbai", share: 0.17 },
  { id: "DEL", label: "Delhi NCR", share: 0.17 },
  { id: "PNQ", label: "Pune", share: 0.09 },
  { id: "HYD", label: "Hyderabad", share: 0.09 },
  { id: "MAA", label: "Chennai", share: 0.08 },
  { id: "CCU", label: "Kolkata", share: 0.07 },
  { id: "AMD", label: "Ahmedabad", share: 0.06 },
  { id: "COK", label: "Kochi", share: 0.05 },
  { id: "JAI", label: "Jaipur", share: 0.04 },
];

export const FIRST_NAMES = [
  "Aarav", "Ananya", "Diya", "Ishaan", "Kavya", "Rohan", "Meera", "Arjun", "Nisha", "Vikram",
  "Priya", "Aditya", "Sneha", "Rahul", "Pooja", "Karthik", "Lakshmi", "Sameer", "Tara", "Nikhil",
  "Divya", "Farhan", "Gauri", "Harish", "Ira", "Jayant", "Kiran", "Leela", "Manav", "Neha",
  "Omkar", "Pallavi", "Rhea", "Siddharth", "Tanvi", "Uday", "Varun", "Zoya", "Asha", "Dev",
];

/**
 * Things that happen to the business. They shape the records the way real events would; the
 * Retention assistant has to find their effects in the data without being told about them.
 */
export const EVENTS = {
  /** The Diwali sale, 25 Sep – 21 Oct 2025: acquisition surges, mostly gift boxes, on a 30% code. */
  festiveSale: { fromDay: 267, toDay: 293, acquisition: 2.6, code: "DIWALI30", discount: 0.3, codeShare: 0.85 },
  /** Bargain hunters bought at 30% off and mostly never came back. */
  festiveRepeatFactor: 0.42,
  /** The replenishment reminder flow broke on 28 Jul 2026; regulars who relied on it drifted. */
  reminderOutage: { fromDay: END_DAY - 95, factor: 0.5 },
  /** Marketplace customers who come back mostly come back on the marketplace. */
  marketplaceStays: 0.82,
} as const;

export const WELCOME_CODE = { code: "WELCOME10", discount: 0.1, share: 0.4 } as const;

/** Day index → ISO date. */
export function dayToIso(day: number): string {
  const d = new Date(`${START_ISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day);
  return d.toISOString().slice(0, 10);
}

/** Months since January 2025 (0 = Jan 25, 21 = Oct 26). */
export function monthIndex(day: number): number {
  const d = new Date(Date.UTC(2025, 0, 1 + day));
  return (d.getUTCFullYear() - 2025) * 12 + d.getUTCMonth();
}

/** Month index → ISO month ("2025-03"). */
export function monthIso(i: number): string {
  return `${2025 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
}

/** Calendar month (0–11) of a day. */
export function calendarMonth(day: number): number {
  return new Date(Date.UTC(2025, 0, 1 + day)).getUTCMonth();
}

export const isFestive = (day: number) => day >= EVENTS.festiveSale.fromDay && day <= EVENTS.festiveSale.toDay;
export const channelOf = (id: ChannelId) => CHANNELS.find((c) => c.id === id) as Channel;
export const productOf = (id: ProductId) => PRODUCTS.find((p) => p.id === id) as Product;
export const cityOf = (id: CityId) => CITIES.find((c) => c.id === id) as (typeof CITIES)[number];
