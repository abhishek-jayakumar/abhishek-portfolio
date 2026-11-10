/**
 * Site-level copy: point of view, capabilities, experience. As with projects.ts,
 * every claim traces back to the résumé, the old deck or the project folders.
 * Where a number or a date isn't known, it isn't here.
 */

export type Stage = {
  key: string;
  question: string;
  adView: string;
  myView: string;
  example: { label: string; slug: string; text: string };
};

export const STAGES: Stage[] = [
  {
    key: "Attention",
    question: "Did the right person notice?",
    adView: "Impressions, reach, click-through rate.",
    myView:
      "Who is this actually reaching, and does the creative say who it's for? A cheap click from the wrong person is the most expensive thing in the account.",
    example: {
      label: "Audience and creative work on Meta",
      slug: "cscp",
      text: "With 50 seats and 1,000+ enquiries, who the ads reached mattered more than how many.",
    },
  },
  {
    key: "Intent",
    question: "Did they lean in?",
    adView: "Clicks, cost per click, leads.",
    myView:
      "What were they hoping to find when they clicked? I look at whether the page keeps the promise the ad made, and at what people searched for to get there.",
    example: {
      label: "Search ads written around local intent",
      slug: "burl-concepts",
      text: "A free-consultation offer for searches like “interior designers in Kannur”: 6.4% click-through, ₹39.65 per conversion.",
    },
  },
  {
    key: "Experience",
    question: "What did the page make them do?",
    adView: "Nothing. The ad platform stops at the click.",
    myView:
      "Clarity, speed, and whether there is a reason to stay. Most visitors aren’t ready to enquire yet, so I look for what the page can give them first.",
    example: {
      label: "A quiz instead of a form",
      slug: "career-discovery",
      text: "Fifteen questions that give an unsure visitor a personalised result and a next step.",
    },
  },
  {
    key: "Conversion",
    question: "Did the ask match their readiness?",
    adView: "Conversions, as the pixel defines them.",
    myView:
      "One door suits one kind of person. I offer more than one, and I make sure the event that says “converted” fires when it actually happened.",
    example: {
      label: "Form, WhatsApp and a qualifying chat",
      slug: "burl-concepts",
      text: "Three ways to enquire, thirteen events, so each door can be compared.",
    },
  },
  {
    key: "Retention",
    question: "Did it turn into a relationship?",
    adView: "Rarely visible at all.",
    myView:
      "Follow-up, content that keeps the conversation going, and whether the leads were any good. A lead that can’t become a customer is a cost, not a result.",
    example: {
      label: "Webinars alongside paid campaigns",
      slug: "webinars",
      text: "Registration, event and follow-up as one loop, so each channel feeds the next.",
    },
  },
];

export type Capability = {
  verb: string;
  tone: "sun" | "sage" | "blush" | "white";
  promise: string;
  does: string[];
  reachFor: string;
  evidence: { slug: string; label: string }[];
};

export const CAPABILITIES: Capability[] = [
  {
    verb: "Acquire",
    tone: "sun",
    promise: "Get the right people to show up.",
    does: ["Paid media", "Campaign strategy", "Audience research", "Creative testing"],
    reachFor:
      "Google Ads, Meta Ads, TikTok Ads, Shopee and Tokopedia Ads, Google Trends, Mailchimp, WhatsApp Business",
    evidence: [
      { slug: "cscp", label: "Fixed seats, 1,000+ enquiries" },
      { slug: "burl-concepts", label: "Local search ads" },
      { slug: "sastrum", label: "A global GTM strategy" },
    ],
  },
  {
    verb: "Understand",
    tone: "sage",
    promise: "Know what is actually happening, and why.",
    does: ["GA4 and Tag Manager", "Attribution", "Funnel analysis", "CRO"],
    reachFor: "Google Analytics 4, Tag Manager, Meta Pixel and custom events, Looker Studio, Convertize",
    evidence: [
      { slug: "burl-concepts", label: "Thirteen tracked events" },
      { slug: "career-discovery", label: "Every step of a quiz, counted" },
    ],
  },
  {
    verb: "Build",
    tone: "blush",
    promise: "Make the thing, rather than write a brief for it.",
    does: ["Landing pages", "Digital experiences", "AI experiments and automation", "Marketing tools"],
    reachFor: "Claude Code, Google AI Studio, React, WordPress. AI-assisted, with a human deciding where to stop.",
    evidence: [
      { slug: "career-discovery", label: "A career-discovery quiz" },
      { slug: "burl-concepts", label: "A rebuilt lead system" },
    ],
  },
  {
    verb: "Create",
    tone: "white",
    promise: "Give the message a form people remember.",
    does: ["Ad creatives", "Video", "Web experiences", "Campaign systems"],
    reachFor: "Canva, Figma, Photoshop, Premiere Pro, CapCut",
    evidence: [
      { slug: "sastrum", label: "Launch films and website" },
      { slug: "foundation-day", label: "A digital magazine" },
    ],
  },
];

export const NUMBERS = [
  { to: 1000, suffix: "+", cap: "Acquire", line: "leads for 50 seats", note: "A fixed-capacity programme on about ₹2 lakh a month of Meta spend.", slug: "cscp" },
  { to: 50, suffix: "+", cap: "Acquire", line: "leads from search in under four weeks", note: "6.4% click-through and ₹39.65 per conversion for a local design studio.", slug: "burl-concepts" },
  { to: 13, suffix: "", cap: "Understand", line: "events tracked on one site", note: "Every route to an enquiry, measured so the routes can be compared.", slug: "burl-concepts" },
  { to: 15, suffix: "", cap: "Build", line: "questions in an interactive funnel", note: "Scored on five dimensions, measured with GA4, Tag Manager and Meta Pixel.", slug: "career-discovery" },
];

export type Chapter = {
  n: string;
  shift: string;
  title: string;
  body: string;
  proof: string;
};

export const CHAPTERS: Chapter[] = [
  {
    n: "01",
    shift: "Doing the work",
    title: "Learning the channels by running them.",
    body: "I started where most marketers do: running the activity. Social content, email, WhatsApp, the website, the ad accounts. It taught me what each channel is like from the inside, and how much of marketing is small, repeated craft.",
    proof: "Social, email, WhatsApp Business, WordPress, marketplace ads",
  },
  {
    n: "02",
    shift: "Thinking before doing",
    title: "Asking who it is for before what it says.",
    body: "I got more interested in the questions that sit upstream of the campaign: audience, positioning, the plan for going to market. A launch or an enquiry campaign goes better when the first sentence is about the person, not the product.",
    proof: "Audience research, positioning, GTM plans. A global GTM strategy for Sastrum; CSCP.",
  },
  {
    n: "03",
    shift: "Measuring",
    title: "Refusing to trust a number I couldn’t explain.",
    body: "Lead volume stopped being enough. I wanted to know which leads were any good and where people dropped out, so I got properly into GA4, Tag Manager, the Meta Pixel and custom events. I earned the Google Ads and Google Analytics certifications in 2024.",
    proof: "GA4, Tag Manager, Meta Pixel, Looker Studio. Cost per lead, conversion rate, lead quality.",
  },
  {
    n: "04",
    shift: "Experimenting",
    title: "Treating every campaign as a question.",
    body: "Audience variations, creative variations, landing-page changes, and a habit of writing down what I’d test next. The MSc in Digital and Social Media Marketing at Plymouth gave that habit some structure.",
    proof: "Audience and creative testing, CRO. The “what I’d do next” list on every Burl round.",
  },
  {
    n: "05",
    shift: "Building",
    title: "Making the thing instead of describing it.",
    body: "With AI-assisted tools I can now build the quiz, the landing page, the tracking and the tool myself, and test it the same week. That changed what I propose: less “we should”, more “here, try this”.",
    proof: "Career Discovery quiz, the Burl rebuild, the digital magazine, this site.",
  },
];

export const SCHOOL = [
  { years: "2013–2016", what: "B.Com, Finance & Taxation", where: "Payyannur College, India" },
  { years: "2016–2018", what: "PGDM, Marketing & HR", where: "SCMS, India" },
  { years: "2022–2023", what: "MSc, Digital & Social Media Marketing", where: "University of Plymouth, UK" },
];

export const BRANDS = [
  "SecurEyes",
  "Sastrum",
  "Burl Concepts",
  "Ramco Cements",
  "Foundever",
  "sofa.com",
  "Hanlons Brewery",
];

const SUBJECT = encodeURIComponent;
export const EMAIL = "abhishekjayakumar1994@gmail.com";
export const DOORS = [
  {
    key: "role",
    title: "There’s a role",
    text: "Growth, performance or marketing-technology. I’m open to remote and international roles.",
    href: `mailto:${EMAIL}?subject=${SUBJECT("A role I’d like to talk to you about")}`,
  },
  {
    key: "problem",
    title: "There’s a growth problem",
    text: "Tell me what you are trying to grow and what is in the way. I’ll tell you how I’d look at it.",
    href: `mailto:${EMAIL}?subject=${SUBJECT("A growth problem")}&body=${SUBJECT("What are you trying to grow?\n\nWhat's getting in the way?\n\n")}`,
  },
  {
    key: "curious",
    title: "I’m just curious",
    text: "About how something here was made, or an experiment you’d like to see. Also welcome.",
    href: `mailto:${EMAIL}?subject=${SUBJECT("A question about something on your site")}`,
  },
];

/** The CV download. Source: cv/cv.html, exported to this PDF. */
export const CV = { href: "/cv/Abhishek-Jayakumar-CV.pdf", file: "Abhishek-Jayakumar-CV.pdf" } as const;

/** Other places to reach me. Shown under the email doors and in the footer. */
export const SOCIALS = [
  {
    key: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/abhishek-jayakumar-557600145",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    href: `https://wa.me/919400806081?text=${SUBJECT("Hi Abhishek, I saw your portfolio.")}`,
  },
  {
    key: "x",
    label: "X",
    href: "https://x.com/abhishekgrowth1",
  },
] as const;
