/**
 * "A wider field of view": one customer journey, and what each job let Abhishek see of it.
 * Roles and responsibilities are as he supplied them; proof lines repeat figures already on the
 * site (projects.ts / site.ts) and are not upgraded. Coverage is the part of the journey each
 * seat gave him sight of, not a claim of ownership.
 */

export const JOURNEY = [
  { key: "ad", label: "Ad", note: "notices something" },
  { key: "click", label: "Click", note: "leans in" },
  { key: "page", label: "Page", note: "looks around" },
  { key: "enquiry", label: "Enquiry", note: "raises a hand" },
  { key: "sales", label: "Sales call", note: "asks the hard questions" },
  { key: "purchase", label: "Purchase", note: "decides" },
  { key: "return", label: "Comes back", note: "stays, or doesn’t" },
] as const;

export type Seat = {
  key: string;
  company: string;
  seat: string;
  /** Indexes into JOURNEY. */
  sees: readonly number[];
  saw: string;
  now: string;
  proof: string;
};

export const SEATS: readonly Seat[] = [
  {
    key: "ramco",
    company: "Ramco Cements",
    seat: "B2B sales desk",
    sees: [3, 4, 5],
    saw: "The conversation where the decision really gets made: objections, relationships, and dealers who had to believe in the offer before their customers would.",
    now: "I write messaging that has to survive a sales call, and I judge a campaign by the quality of its leads, not their count.",
    proof: "Business development, dealer and distributor relationships",
  },
  {
    key: "sofa",
    company: "Sofa.com",
    seat: "Showroom and storefront, UK",
    sees: [2, 4, 5],
    saw: "People arriving at very different levels of readiness. Some were browsing, some needed reassurance, a few were ready to buy that day.",
    now: "I give a page more than one next step, so each kind of visitor has a door that fits where they are.",
    proof: "Sales, Shopify, the online and offline customer journey",
  },
  {
    key: "foundever",
    company: "Foundever",
    seat: "Customer retention, UK",
    sees: [5, 6],
    saw: "What happens after the conversion: what was promised against what was experienced, and why customers stay or quietly leave.",
    now: "I measure past the lead. Follow-up, lead quality and repeat value are part of whether a campaign worked.",
    proof: "Retention, CRM, customer behaviour and value",
  },
  {
    key: "burl",
    company: "Burl Concepts",
    seat: "Website and acquisition",
    sees: [0, 1, 2, 3],
    saw: "The ad and the page as one piece of work: search and Meta campaigns, the site they pointed to, and every step in between.",
    now: "I build the landing page and the tracking myself, so the campaign and the destination can be tested together.",
    proof: "50+ leads from search in under four weeks, 6.4% click-through, 13 tracked events",
  },
  {
    key: "secureyes",
    company: "SecurEyes",
    seat: "Growth, demand gen and GTM",
    sees: [0, 1, 2, 3, 4, 6],
    saw: "Nearly all of it at once, as the only marketer: positioning, campaigns, webinars, the website, and the handoff to sales.",
    now: "I connect those pieces into one system, and use AI-assisted building to put an idea in front of people the same week.",
    proof: "Performance marketing, product GTM, webinars, content and marketing operations",
  },
];

/** The last view: every seat at once. */
export const TOGETHER = {
  key: "together",
  company: "All five seats",
  seat: "Put together",
  saw: "No single seat sees the whole journey. Having sat in each of these, I can follow a customer from the first ad to the second purchase.",
  now: "So I don’t stop at the click or at the lead. I plan the campaign, build the page, wire the tracking and keep asking what sales and retention make of it.",
  proof: "Sales, e-commerce, retention, acquisition and growth, in one practice",
} as const;
