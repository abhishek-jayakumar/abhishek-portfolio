/**
 * The selected-work reel. Each project keeps its own brand colours, and every
 * visual is the real thing: screenshots of the live sites, frames and loops from
 * the films, and the clients' own photographs (Burl Concepts' project photos are
 * the ones its website uses).
 */

export type WorkLink = { href: string; label: string; external?: boolean };

export type Work = {
  key: "sastrum" | "career" | "burl" | "magazine" | "awareness";
  /** The tab label. */
  short: string;
  client: string;
  context: string;
  brief: string;
  body: string;
  made: string[];
  links: WorkLink[];
  /** The brand this project lives in: stage background, text, accent. */
  brand: { bg: string; fg: string; accent: string };
};

export const WORK: Work[] = [
  {
    key: "sastrum",
    short: "Sastrum",
    client: "Sastrum",
    context: "a B2B SaaS GRC platform from SecurEyes",
    brief: "Take a specialised GRC product to a global market, with one plan.",
    body: "I wrote the global go-to-market strategy: positioning, the website, content and search, paid, PR, partners and measurement, joined into a six-month roadmap. Alongside it, I built sastrum.ai and made the launch films.",
    made: [
      "Positioning and messaging for 3 buyer groups",
      "Website and conversion strategy",
      "Content, SEO and AEO plan",
      "Paid, PR and partner frameworks",
      "KPI framework and a 6-month roadmap",
    ],
    links: [
      { href: "/work/sastrum", label: "Read the GTM strategy" },
      { href: "https://sastrum.ai", label: "sastrum.ai", external: true },
    ],
    brand: { bg: "#141525", fg: "#f5ecdf", accent: "#d4796b" },
  },
  {
    key: "career",
    short: "Career quiz",
    client: "CSCP",
    context: "SecurEyes’ cybersecurity certificate programme",
    brief: "Get quality leads by giving people something first.",
    body: "Visitors answer 15 questions and get their cybersecurity career path in writing. The leads that come out want a career in security, and know about the programme.",
    made: [
      "The career discovery platform",
      "15 questions, scored into 6 career paths",
      "A written report for every visitor",
      "Lead capture, GA4 and Tag Manager",
    ],
    links: [{ href: "/work/career-discovery", label: "How it was built" }],
    brand: { bg: "#e6edff", fg: "#0d1b3d", accent: "#0b5fff" },
  },
  {
    key: "burl",
    short: "Burl",
    client: "Burl Concepts",
    context: "architecture and interiors, Kannur",
    brief: "Make a design studio easier to find, and easier to enquire with.",
    body: "Their own projects, on a site rebuilt as a lead system. Every route to an enquiry is measured.",
    made: [
      "The website, rebuilt as a lead system",
      "Local SEO and Google Ads",
      "Three ways to enquire: form, WhatsApp, chat",
      "13 events tracked",
    ],
    links: [
      { href: "/work/burl-concepts", label: "Read the case" },
      { href: "https://burl.co.in", label: "burl.co.in", external: true },
    ],
    brand: { bg: "#e4ded2", fg: "#28301f", accent: "#6b7764" },
  },
  {
    key: "magazine",
    short: "Magazine",
    client: "SecurEyes",
    context: "20th Foundation Day, internal brand",
    brief: "Turn twenty years into something the whole company opens.",
    body: "Internal brand building: a digital magazine for everyone at SecurEyes, which I edited.",
    made: [
      "Editor of the digital magazine",
      "Leadership letters and a 2006–2026 timeline",
      "Social campaign, event comms and highlight film",
      "Ships as a static site and a SharePoint app",
    ],
    links: [{ href: "/work/foundation-day", label: "Open the issue notes" }],
    brand: { bg: "#0f1b3d", fg: "#f4efe4", accent: "#c9a24a" },
  },
  {
    key: "awareness",
    short: "Awareness",
    client: "SecurEyes",
    context: "Cybersecurity Awareness Month 2026, social",
    brief: "A month of scams. One habit.",
    body: "Seven posts for SecurEyes’ social pages, each a different way to practise the same four steps. Readers solve a case, take a quiz or count red flags, instead of being told to be careful. The quiz posts end at SecurEyes’ training.",
    made: [
      "7 posts: 5 carousels and 2 reels",
      "33 carousel slides, designed in Canva",
      "Case files, quizzes and red-flag hunts",
      "One line throughout: aware, pause, verify, report",
    ],
    links: [],
    brand: { bg: "#0c1029", fg: "#f3efe6", accent: "#f7d117" },
  },
];

/** Smaller pieces that sit after the reel. */
export const ALSO = [
  { href: "/work/cybersecurity-consulting", value: "₹1.2Cr+", label: "consulting pipeline supported at SecurEyes", note: "Pipeline, not booked revenue." },
  { href: "/work/cscp", value: "1,000+", label: "enquiries for 50 seats on the CSCP campaign", note: "Meta and Google, judged on lead quality." },
  { href: "/work/webinars", value: "Webinars", label: "cybersecurity and career sessions, from topic to follow-up", note: "" },
];
