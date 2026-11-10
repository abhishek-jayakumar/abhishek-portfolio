/**
 * Every claim here comes from the résumé, the old portfolio deck, or the
 * project folders. Anything that couldn't be backed up is left out and noted
 * in `left out` comments, not paraphrased into something stronger.
 */

export type Kind = "Professional work" | "Client work";

export type Fact = { value: string; label: string; note?: string };
type Img = { src: string; alt: string; w: number; h: number; caption?: string };
/** A real screenshot of a live site, shown whole in a browser window on the case cover. */
export type Screen = Img & { url: string };

export type Block = {
  title: string;
  body: string[];
  list?: string[];
  steps?: { title: string; text: string }[];
  table?: { head: string[]; rows: string[][] };
  image?: Img;
  wide?: boolean;
};

/** A piece of campaign creative. `video` makes it play; `src` is then its poster. */
export type Creative = { src: string; alt: string; w: number; h: number; caption: string; video?: string };
export type Gallery = { title: string; body: string; items: Creative[] };

export type Cap = "Acquire" | "Understand" | "Build" | "Create";

export type Project = {
  slug: string;
  /** The problem, stated first. The card and the case-study opener lead with this. */
  problem: string;
  /** The project or company, as supporting context. Never the headline. */
  title: string;
  caps: Cap[];
  approach: string;
  changed: string;
  learned: string;
  kind: Kind;
  tone: "marigold" | "sage" | "forest" | "blush" | "terracotta" | "cream";
  line: string; // short promise, used on the card
  headline: string; // case-study H1
  intro: string;
  facts: Fact[];
  blocks: Block[];
  watched?: string[];
  image?: Img;
  image2?: Img;
  /** Live-site screenshots for the cover. The first is the main window; a second overlaps it. */
  screens?: Screen[];
  /** Campaign creative, shown as a contact sheet after the story. */
  creative?: Gallery[];
  link?: { href: string; label: string };
};

const cs = (f: string) => `/img/campaigns/cscp/${f}`;

/** CSCP campaign creative. Designed by Abhishek; the people in the images are AI-generated. */
const CSCP_CREATIVE: Gallery[] = [
  {
    title: "Ads, one offer in every size",
    body: "The paid campaign ran on Meta and Google, so each message was made for the square feed, stories and landscape placements, plus a 30-second film. I designed them in Canva; the people in them are AI-generated.",
    items: [
      { src: cs("ad-1.jpg"), w: 1080, h: 1080, caption: "Feed", alt: "CSCP ad: Want a career in cybersecurity? Tags for expert mentorship, job-ready skills, a 3-month online course and hands-on labs." },
      { src: cs("ad-2.jpg"), w: 1080, h: 1080, caption: "Feed", alt: "CSCP ad: Graduated? Now become cybersecurity ready." },
      { src: cs("ad-3.jpg"), w: 1080, h: 1080, caption: "Feed", alt: "CSCP ad: Want a career in cybersecurity? Join the SecurEyes certification program and stand out in the job market." },
      { src: cs("ad-4.jpg"), w: 1080, h: 1080, caption: "Feed", alt: "CSCP ad: Ready for your first cybersecurity role? Practical skills through hands-on labs, live training and mentorship." },
      { src: cs("ad-8.jpg"), w: 1080, h: 1080, caption: "Feed", alt: "CSCP ad: Become a certified cybersecurity professional. Batch starts 11 August." },
      { src: cs("ad-7.jpg"), w: 1080, h: 1080, caption: "Feed", alt: "CSCP ad: your path to a cybersecurity career in just 3 months." },
      { src: cs("ad-5.jpg"), w: 1080, h: 1920, caption: "Story", alt: "CSCP story ad: Ready for your first cybersecurity role?" },
      { src: cs("ad-6.jpg"), w: 1080, h: 1920, caption: "Story", alt: "CSCP story ad: Want a career in cybersecurity?" },
      { src: cs("promo-poster.jpg"), video: cs("promo.mp4"), w: 1080, h: 1350, caption: "Film, 0:31", alt: "CSCP promo film: from cybercrime, to ‘what if you could be the one to stop it?’, to 450+ hours of hands-on training, to register now." },
      { src: cs("ad-wide.jpg"), w: 1080, h: 566, caption: "Landscape", alt: "CSCP landscape ad: Cybersecurity Certificate Program, become a certified cybersecurity professional, batch starts 11 August." },
    ],
  },
  {
    title: "The batch poster",
    body: "Each new batch gets its poster: dates, timings, fees and early-bird offers on one page. The Batch 16 poster I built in HTML rather than a design tool.",
    items: [
      { src: cs("poster-15.jpg"), w: 1080, h: 1528, caption: "Batch 15", alt: "CSCP Batch 15 poster: why join, schedule, duration, fees and early-bird offers." },
      { src: cs("poster-16.jpg"), w: 1080, h: 1528, caption: "Batch 16, built in HTML", alt: "CSCP Batch 16 poster: 450 hours of live, hands-on training, next class 1 February 2027, early-bird offers of 25% and 20%." },
    ],
  },
  {
    title: "Organic: a career carousel",
    body: "For the Instagram feed, seven slides on why cybersecurity is a career worth looking at, ending on the batch date and a ‘comment CSCP’ prompt.",
    items: [1, 2, 3, 4, 5, 6, 7].map((n) => ({
      src: cs(`insta-${n}.jpg`),
      w: 1080,
      h: 1080,
      caption: `${n}/7`,
      alt: [
        "Why cybersecurity is one of the fastest growing careers.",
        "Every business is becoming digital.",
        "The biggest gap isn’t technology, it’s skills.",
        "Cybersecurity isn’t just for tech companies: banking, healthcare, retail, manufacturing, IT and government.",
        "One industry, many career options: SOC analyst, incident responder, threat intelligence, cloud security, GRC.",
        "Employers want more than technical knowledge: problem-solving, communication, analytical thinking.",
        "Ready to build industry-relevant skills? CSCP batch starts 11 August. DM or comment CSCP.",
      ][n - 1],
    })),
  },
];

export const projects: Project[] = [
  {
    slug: "cybersecurity-consulting",
    problem: "Supporting demand for cybersecurity consulting.",
    title: "SecurEyes: cybersecurity consulting demand generation",
    caps: ["Acquire", "Understand"],
    approach: "Connect marketing activity to the commercial conversation around cybersecurity consulting.",
    changed: "₹1.2Cr+ consulting pipeline supported through my marketing contribution.",
    learned: "Pipeline is a useful commercial measure, but it needs to remain distinct from revenue and sole attribution.",
    kind: "Professional work",
    tone: "forest",
    line: "B2B demand generation with a commercial context.",
    headline: "From market interest to a business conversation.",
    intro: "My work at SecurEyes spans growth marketing, performance marketing and demand generation. Supporting the cybersecurity consulting business is one part of that work, alongside product marketing and education acquisition.",
    facts: [{ value: "₹1.2Cr+", label: "consulting pipeline supported", note: "Contribution, not sole attribution or booked revenue" }],
    blocks: [
      { title: "The problem and context", body: ["Build demand for cybersecurity consulting services and connect marketing activity with potential business. This is a consulting-services context, separate from the education programme and product launch work elsewhere in this portfolio."] },
      { title: "My role", body: ["I contributed through my growth, performance marketing and demand-generation responsibilities at SecurEyes. My wider remit also includes content, webinars, digital experiences and marketing operations; those activities are not individually attributed to this pipeline figure here."] },
      { title: "The commercial evidence", body: ["My work supported ₹1.2Cr+ in cybersecurity consulting pipeline. Pipeline represents potential opportunities. It is not a statement of closed-won revenue, and ‘supported’ does not mean I generated the entire amount independently."] },
      { title: "What the figure does not tell us", body: ["A campaign-by-campaign intervention record, reporting period and channel-level attribution are not included in this case note. Without those details, I am not attaching the pipeline figure to a particular creative, landing-page change or conversion rate."] },
      { title: "What I take forward", body: ["Demand generation should be read in a commercial context. The next useful questions are which opportunities progressed, how qualification was defined and what marketing contributed at each stage."] },
    ],
  },
  {
    slug: "cscp",
    problem: "Turning a fixed-capacity programme into an acquisition problem.",
    title: "CSCP: Cybersecurity Certificate Program",
    caps: ["Acquire", "Understand"],
    approach: "Judge the campaign on audience behaviour, creative performance and lead quality, not on lead volume alone.",
    changed: "1,000+ leads and 50 conversions against 50 seats.",
    learned: "When capacity is fixed, lead quality is the metric and lead volume is the vanity number.",
    kind: "Professional work",
    tone: "marigold",
    line: "1,000+ leads for 50 seats.",
    headline: "1,000+ people asked. There were 50 seats.",
    intro:
      "The Cybersecurity Certificate Program at SecurEyes had a fixed number of places. My job was to fill them with the right people, not just to make the lead count look big.",
    facts: [
      { value: "~₹2,00,000", label: "Meta budget a month", note: "approximate" },
      { value: "1,000+", label: "leads generated" },
      { value: "50", label: "conversions" },
      { value: "50", label: "seats available" },
    ],
    blocks: [
      {
        title: "The brief",
        body: [
          "Generate awareness and qualified enquiries for a cybersecurity certification programme, and turn that interest into a limited number of seats.",
        ],
      },
      {
        title: "What I did",
        body: [
          "I planned and ran the Meta campaign: audience targeting, messaging, coordinating creative, and watching performance. I worked across Meta and Google Ads, and on the landing pages and conversion paths that connect an ad to an enquiry.",
          "I judged the campaign on audience behaviour, creative performance and lead quality, not on lead volume alone. With the seats capped, a thousand enquiries that couldn't take one weren't a win.",
        ],
      },
      {
        title: "What came out of it",
        body: [
          "About 1,000 leads and 50 conversions against 50 available seats. Divide one by the other and there were at least 20 enquiries for every seat, which is why quality mattered more than volume. The seats slider at the end of this page shows how the problem changes shape if the seats change.",
        ],
      },
    ],
    // left out: cost per lead, campaign length and lead-quality outcomes — watched, but no values in the source material
    watched: ["Cost per lead", "Click-through rate", "Cost per click", "Conversion rate", "Lead quality"],
    creative: CSCP_CREATIVE,
  },
  {
    slug: "career-discovery",
    problem: "Giving uncertain traffic a reason to stay.",
    title: "Cyber Career Discovery Platform",
    caps: ["Build", "Understand"],
    approach: "Replace an early ask with something useful: a quiz that scores five dimensions and suggests one of six career paths.",
    changed: "A 15-question path from unsure visitor to personalised result and next step, with every step measurable.",
    learned: "An enquiry form on its own asks too much, too soon. Give people something first.",
    kind: "Professional work",
    tone: "sage",
    line: "A 15-question quiz that points people to a cybersecurity path.",
    headline: "A quiz that finds your place in cybersecurity.",
    intro:
      "Campaign traffic arrives unsure. This interactive platform gave people a reason to stay, a personalised result, and a relevant next step.",
    facts: [
      { value: "15", label: "questions in the funnel" },
      { value: "6", label: "career profiles it can suggest" },
      { value: "5", label: "dimensions it scores" },
    ],
    blocks: [
      {
        title: "The brief",
        body: [
          "Get quality leads for CSCP, the cybersecurity certificate programme. Most visitors don't know which part of cybersecurity suits them, so an enquiry form on its own asks too much, too soon. Instead, people get something in writing as soon as they arrive: they answer 15 questions and discover their cybersecurity career. The leads that come out the other end are people interested in a cybersecurity career and in the certification programme.",
        ],
      },
      {
        title: "What I did",
        body: [
          "I helped build a 15-question career discovery experience that scores curiosity, problem solving, learning agility, career motivation and commitment, then suggests one of six profiles: SOC Analyst, Security Analyst, GRC Analyst, Cloud Security Analyst, Security Engineer or Incident Response Analyst.",
          "Each person gets a personalised report and a clear next step. I set up measurement with GA4, Google Tag Manager, Meta Pixel and custom events, so every step of the journey, from starting to finishing to opening the lead form, can be counted.",
        ],
      },
      {
        title: "What I can and can't say about it",
        body: [
          "It was used as part of the acquisition and conversion strategy for the education campaigns. I don't have completion-rate or conversion figures for it in front of me, so I'm not going to quote any.",
        ],
      },
    ],
  },
  {
    slug: "sastrum",
    problem: "Taking a specialised GRC product to a global market.",
    title: "Sastrum: a global go-to-market strategy for a B2B SaaS GRC platform",
    caps: ["Acquire", "Understand", "Create"],
    approach: "Start with positioning, then plan every channel (website, content and search, paid, PR, partners) around it, and measure the pipeline, not the likes.",
    changed: "Separate marketing activities became one go-to-market plan: seven connected areas, a KPI framework, and a five-phase, six-month roadmap.",
    learned: "In B2B SaaS, several people decide, over a long time. The plan has to speak to each of them, and the measurement has to follow the whole journey.",
    kind: "Professional work",
    tone: "forest",
    line: "A global GTM strategy for a B2B SaaS GRC platform.",
    headline: "One go-to-market plan for a specialised B2B SaaS product.",
    intro:
      "Sastrum is a SecurEyes SaaS platform for governance, risk and compliance (GRC). It needed a clear identity in the market and a structured way to grow beyond its home market. I developed its global marketing strategy, connecting positioning, the website, demand generation, brand awareness and partner-led growth into one plan.",
    facts: [
      { value: "7", label: "areas in one plan, from positioning to measurement" },
      { value: "3", label: "buyer groups the messaging speaks to" },
      { value: "5", label: "phases in the roadmap" },
      { value: "6", label: "months, from foundation to optimisation" },
    ],
    blocks: [
      {
        title: "The challenge",
        body: [
          "The challenge wasn't more posts or more content. It was giving a specialised B2B SaaS product a clear marketing direction. That meant:",
        ],
        list: [
          "Explaining a technical GRC product in language business decision-makers understand.",
          "Standing out in a specialised, competitive category.",
          "A website that explains the value and leads to real enquiries.",
          "Reaching the right international audiences through a focused set of channels.",
          "Connecting organic, paid, PR and partner work, instead of running them separately.",
          "Measuring more than surface-level engagement.",
        ],
      },
      {
        title: "My role",
        body: [
          "Marketing strategy and go-to-market planning: product positioning, website strategy, content marketing, SEO and AEO, paid acquisition, PR, partner marketing and analytics. Alongside the strategy, I built the website, sastrum.ai, and made the launch films.",
        ],
      },
      {
        title: "Positioning and messaging",
        body: [
          "Everything else depends on this, so it came first. The aim was to make the value easy to understand and easy to repeat.",
        ],
        list: [
          "Clear messaging about outcomes, not features.",
          "Product capabilities tied to the business problems they solve.",
          "Three audiences: business leadership, risk and compliance professionals, and information security teams.",
          "One consistent message across the website, content and campaigns.",
        ],
      },
      {
        title: "The website as a demand channel",
        body: [
          "I treated the website as a channel for demand, not just a page of product information.",
        ],
        list: [
          "Clearer messaging and content hierarchy.",
          "Information organised around what each audience needs and the outcomes they want.",
          "Stronger calls to action and enquiry journeys.",
          "Opportunities to improve search visibility and conversion paths.",
        ],
      },
      {
        title: "Content, SEO and AEO",
        body: [
          "An organic plan to build topical authority and educate buyers before they are ready to talk to sales.",
        ],
        list: [
          "Content built around GRC challenges, industry questions and business use cases.",
          "Educational and thought-leadership pieces.",
          "Keyword and search-intent planning.",
          "AEO, so answer engines and AI assistants can find and quote the right information.",
          "A path from educational content to product discovery and enquiry.",
        ],
      },
      {
        title: "Paid, PR and partners",
        body: [
          "Three ways to reach people the organic plan can't reach on its own, each with its own job.",
        ],
        steps: [
          {
            title: "Paid acquisition",
            text: "Google Search to capture existing demand, LinkedIn Ads evaluated for professional and account-based targeting, campaign themes built on business problems rather than product promotion, retargeting for a long buying journey, and conversion tracking that judges lead quality, not just volume.",
          },
          {
            title: "PR and thought leadership",
            text: "Credibility in a specialised category: industry story angles, thought-leadership opportunities, relevant publications, and PR that says the same thing as the positioning.",
          },
          {
            title: "Partner marketing",
            text: "Partner-facing messaging and collateral, co-marketing and content collaborations, partner enablement, and a way to track the enquiries and opportunities partners bring in.",
          },
        ],
      },
      {
        title: "Measuring what matters",
        body: [
          "A KPI framework that connects marketing activity to business goals, from the first visit to the sales pipeline:",
        ],
        list: [
          "Website traffic and engagement.",
          "Landing-page conversion rates.",
          "Organic search visibility and qualified organic enquiries.",
          "Paid campaign performance and cost per lead.",
          "Lead quality and progress through the funnel.",
          "Partner-sourced enquiries and opportunities.",
          "Marketing's contribution to the sales pipeline.",
        ],
      },
      {
        title: "A six-month roadmap",
        body: ["The plan grows in five phases, each building on the one before."],
        steps: [
          { title: "Foundation", text: "Refine positioning and messaging, review the website's structure and conversion journeys, and set baseline analytics and tracking." },
          { title: "Visibility", text: "Build the SEO and AEO content foundation, start consistent social and thought-leadership communication, and set the PR story angles." },
          { title: "Demand generation", text: "Design the paid campaign structure, choose priority audiences and campaign themes, and plan lead capture and nurturing." },
          { title: "Partner growth", text: "Create partner marketing material, plan co-marketing, and set up partner lead tracking." },
          { title: "Optimisation", text: "Review how each channel performs, find gaps in conversion and lead quality, and refine priorities based on the evidence." },
        ],
      },
      {
        title: "What I take forward",
        body: [
          "This project brought product marketing, digital strategy, organic visibility, paid acquisition, PR, partnerships and measurement into one go-to-market framework.",
          "It also taught me how marketing has to support a long B2B buying journey, especially when a specialised technology product has to convince several decision-makers, each asking a different question.",
        ],
      },
      {
        title: "What this case does and doesn't show",
        body: [
          "This page documents the strategy, frameworks and recommendations I developed. It doesn't claim that every proposed campaign or initiative was launched, or that specific commercial results were achieved. I'll add performance figures only when there is campaign data and business records behind them.",
        ],
      },
    ],
    screens: [
      { src: "/img/work/sastrum-home.jpg", url: "sastrum.ai", alt: "The Sastrum homepage: GRC, simplified, with Book a demo and Watch the film", w: 1440, h: 900, caption: "sastrum.ai, built as a demand channel: booking a demo is on the first screen, and the platform page explains the product in one line." },
      { src: "/img/work/sastrum-platform.jpg", url: "sastrum.ai", alt: "The Sastrum platform page: One control library. Four modules. Lumina across all of them.", w: 1440, h: 900 },
    ],
    image2: { src: "/img/work/sastrum-countdown-world.jpg", alt: "A frame from the Sastrum launch countdown film: Born in India. Built for the world.", w: 1280, h: 720, caption: "Born in India, built for the world: the global ambition, in the launch countdown film." },
    link: { href: "https://sastrum.ai", label: "Visit the live site, sastrum.ai" },
  },
  {
    slug: "foundation-day",
    problem: "Making a twenty-year celebration something people actually open.",
    title: "SecurEyes 20th Foundation Day",
    caps: ["Create"],
    approach: "Edit it like a magazine, design it to be read, and make it easy for IT to publish.",
    changed: "A digital issue that ships two ways: a static site, and a SharePoint app with a half-hour guide.",
    learned: "Shipping is part of the creative job. If the people who host it can't publish it, it doesn't exist.",
    kind: "Professional work",
    tone: "blush",
    line: "A digital magazine for a 20-year celebration, edited and shipped.",
    headline: "Twenty years, one digital magazine.",
    intro:
      "The digital magazine was made as part of internal brand building for SecurEyes' 20th Foundation Day. I was its editor, and I worked across the social content, event communication and highlight videos around it.",
    facts: [
      { value: "20", label: "years celebrated" },
      { value: "4", label: "event videos in the issue" },
      { value: "~127 MB", label: "static site, no server needed" },
    ],
    blocks: [
      {
        title: "The brief",
        body: [
          "Celebrate twenty years in a way people would actually open: leadership letters, moments from across the offices, a timeline from 2006 to 2026, and awards and sports, under the theme \"The Power of ONE: Together We Keep Winning\".",
        ],
      },
      {
        title: "What I did",
        body: [
          "I organised the content, photographs and leadership communications, wrote the editor's note, and shaped how the issue looked and read. Alongside it I worked on the social campaign, the event communication and the highlight videos.",
        ],
      },
      {
        title: "The practical constraint",
        body: [
          "Not every team has a web server to host a magazine on. So it ships two ways: as a plain static site that any server can host, and as a SharePoint app with a step-by-step guide a site owner can follow in about half an hour. Making it easy for IT to publish was part of the job.",
        ],
      },
    ],
    screens: [
      { src: "/img/work/mag-home.jpg", url: "SecurEyes 20th Foundation Day, digital issue", alt: "The magazine's cover: SecurEyes, Celebrating 20 Years of Excellence, with the leadership team on stage", w: 1440, h: 900, caption: "The cover of the digital issue." },
    ],
    image2: { src: "/img/work/mag-contents.jpg", alt: "The magazine's contents page, from the CEO's letter to the creative corner", w: 1440, h: 900, caption: "In this issue." },
  },
  {
    slug: "burl-concepts",
    problem: "Making a small studio findable, then easy to enquire with.",
    title: "Burl Concepts: a Kannur design studio",
    caps: ["Acquire", "Understand", "Build"],
    approach: "Two rounds: get found with local SEO and search ads, then rebuild the site as a lead system with three ways to enquire and every step measured.",
    changed: "15+ leads in 30 days with no ad spend, 50+ from search in under four weeks, then a rebuilt site tracking 13 events.",
    learned: "Treat the site as a lead system, and read your own build critically enough to list what to fix.",
    kind: "Client work",
    tone: "terracotta",
    line: "From a first site and local SEO to a rebuilt lead system.",
    headline: "A Kannur design studio, found first and then easy to enquire with.",
    intro:
      "Burl Concepts is an architecture and interior design studio in Kannur, Kerala. I've worked on their online presence in two rounds: a first site with local SEO and Google Ads, then a full rebuild that treats the website as a lead system, with three ways to enquire and every step measured.",
    link: { href: "https://burl.co.in", label: "Visit the live site, burl.co.in" },
    facts: [
      { value: "15+", label: "leads in the first 30 days, no ad spend", note: "round one" },
      { value: "+380%", label: "organic impressions in month one", note: "round one" },
      { value: "50+", label: "leads in under four weeks from Google Search ads", note: "round one, 6.4% click-through, ₹39.65 per conversion" },
      { value: "13", label: "event types tracked on the rebuilt site" },
      { value: "7", label: "steps in the chat that qualifies a lead" },
      { value: "10", label: "project walkthrough videos on the portfolio page" },
    ],
    blocks: [
      {
        title: "The brief",
        body: [
          "A studio that designs homes, offices and custom furniture for clients across Kerala, Karnataka, Tamil Nadu and the UAE, with a point of view and very little online presence. It needed to be found by people searching in Kannur, look as considered as the work, and turn a visit into a consultation request.",
        ],
      },
      {
        title: "Round one: get found",
        body: [
          "I built the first site in five days: clean and mobile-friendly, with clear service pages, calls to action and a lead form that was hard to miss. I did the technical SEO (meta titles, alt text, schema markup) and connected Google Search Console, Google Analytics 4 and a Google Business Profile for local discovery.",
          "In the first month organic impressions grew by 380% and the site generated 15+ leads in 30 days with no ad spend. It ranked for searches like \"interior designers in Kannur\" and \"modular kitchen Kannur\", and bounce rate came down to 28% after optimising.",
          "Then I ran a Google Search campaign across Kannur, Bangalore and Kochi, built around a free design consultation: a 6.4% click-through rate, 50+ leads in under four weeks, and ₹39.65 per conversion.",
        ],
      },
      {
        title: "Round two: rebuild it as a lead system",
        body: [
          "The rebuild is a React site built with AI-assisted tools (Google AI Studio). It has a home page, portfolio, services, a Who We Are page, privacy policy and terms pages, and a thank-you page, and everything on it exists to move someone from looking to enquiring.",
        ],
        list: [
          "Home: hero, the studio's vision, three featured services, six of the studio's promises (24-hour site visit, 48-hour design, 18-day completion, and more), client reviews, a seven-question FAQ and the consultation form.",
          "Portfolio: nine projects in five categories (bedrooms, kitchens, living spaces, office interiors, custom furniture), with filters and photo galleries, plus ten project walkthrough videos.",
          "Services: seven services, from residential and commercial design to government approvals and renovation, each with its own \"request this service\" link.",
          "Who We Are: the philosophy, the story behind the name \"Burl\", a four-step design process, and the team.",
        ],
        image: {
          src: "/img/burl-new-portfolio.jpg",
          alt: "The rebuilt Burl Concepts portfolio page with category filters and project photos of a bedroom, a kitchen and a living area",
          w: 1440,
          h: 1100,
          caption: "Round two: the portfolio page, with category filters and project galleries.",
        },
      },
      {
        title: "Three ways to enquire, not one",
        body: [
          "A form is one door. People who'd rather call, chat or message get their own, and each one is tracked so I can see which ones work.",
        ],
        steps: [
          {
            title: "The consultation form",
            text: "Five fields. It records when someone starts filling it in and when they send it, then moves them to a thank-you page that says what happens next (the team reviews, calls within 24 hours, schedules a consultation) and offers a call or WhatsApp if they'd rather talk sooner.",
          },
          {
            title: "The WhatsApp button",
            text: "A floating button on every page, for people who would rather message than fill in a form.",
          },
          {
            title: "A short chat that qualifies the lead",
            text: "It opens a couple of seconds after the page loads and asks seven things in order: the kind of project, the specific type (2BHK, villa, clinic, L-shaped kitchen and so on), budget, timeline, location, name and phone. The answers land with the enquiry, so the team knows what they're ringing about before they pick up. You can try a recreation of it at the end of this page.",
          },
        ],
      },
      {
        title: "Writing for the people who are searching",
        body: [
          "Most of the SEO work is plain and unglamorous, which is the point:",
        ],
        list: [
          "Structured data for the website, the organisation and the architect, with the areas served: Kerala, Karnataka, Tamil Nadu and the UAE.",
          "Page titles written around the search: \"Architecture & Interior Design Studio in Kannur\".",
          "A sitemap of six pages with priorities, a robots file, and 301 redirects so old addresses (/projects, /about-us, /contact) still land in the right place.",
          "A seven-question FAQ written around how people actually search: interior designers in Kannur, an architecture studio in Kannur, modern interior design in Kerala, and whether the studio works outside Kerala.",
          "Portfolio images served in the right format and quality through Cloudinary, so the gallery stays quick.",
          "Privacy policy and terms pages covering lead data, cookies, analytics and ad platforms, the kind of pages ad platforms expect a site to have.",
        ],
      },
      {
        title: "Measuring every step",
        wide: true,
        body: [
          "Tracking is declarative. Any button or link can carry a few data attributes, and one listener pushes the event and its details (which button, which section) to Google Tag Manager. Adding a tracked button takes no new code, so the tracking stays consistent as the site grows. These are the thirteen events, and what each one tells me:",
        ],
        table: {
          head: ["Event", "Fires when", "What it tells me"],
          rows: [
            ["cta_click", "A tracked button or link is clicked, with its name and section", "Which calls to action, in which sections, pull people towards enquiring"],
            ["form_start", "Someone clicks into the first field", "How many begin the form"],
            ["form_submit", "The form is sent", "Consultation requests, and with form_start, where people give up"],
            ["chatbot_open", "The chat bubble is opened", "How many want to talk rather than fill in a form"],
            ["chatbot_start", "The first chat option is picked", "How many engage once it opens"],
            ["chatbot_submit", "The chat reaches name and phone", "Leads captured in the chat"],
            ["whatsapp_click", "Any WhatsApp button is clicked", "How many prefer to message"],
            ["phone_click", "A phone number is tapped", "How many prefer to call"],
            ["email_click", "An email address is clicked", "How many prefer email"],
            ["faq_click", "A question is opened, with the question text", "Which doubts people have before they enquire"],
            ["project_view", "A portfolio project is opened, with its name and category", "Which kinds of work attract interest"],
            ["category_filter", "A portfolio filter is used", "Which categories people go looking for"],
            ["video_view", "A walkthrough video is opened, with its title", "Which walkthroughs people watch"],
          ],
        },
      },
      {
        title: "What I can't tell you yet",
        body: [
          "I don't yet have lead counts, form-completion rates or search rankings for the rebuilt site, so there are none here. The round-one results are from my earlier reporting for the first site and the Google Ads campaign.",
        ],
      },
      {
        title: "What I'd do next",
        body: ["Reading my own build critically, these are the five things I'd fix first:"],
        steps: [
          {
            title: "Check how Google sees the pages",
            text: "The site is a React app that sets its page titles in the browser. I'd pre-render the pages, or at least confirm in Search Console that each one is crawled and indexed as intended.",
          },
          {
            title: "Stop counting submissions I can't confirm",
            text: "The form sends to its endpoint without reading the reply, so form_submit fires even if the server rejected the entry. I'd confirm success before firing the event, so the conversion count can be trusted.",
          },
          {
            title: "Record where each lead came from",
            text: "The lead data has no campaign source, and chat leads are saved with a placeholder email address. I'd capture UTM parameters and add a proper source field, so every lead can be tied to the ad or search that brought it.",
          },
          {
            title: "Test the chat's timing",
            text: "It opens by itself after two seconds. That could help or irritate. I'd test it against opening only on click, and compare chatbot_start and form_submit.",
          },
          {
            title: "Use the thank-you page as a clean conversion point",
            text: "It already exists as a separate page. I'd use its visits as the conversion signal in Google Ads and Meta, alongside the events above.",
          },
        ],
      },
    ],
    screens: [
      { src: "/img/burl-new-home.jpg", url: "burl.co.in", alt: "The new Burl Concepts homepage: Elevating the ordinary into the extraordinary, with Start your project and a WhatsApp button", w: 1440, h: 900, caption: "The new burl.co.in, rebuilt as a lead system: a project enquiry and WhatsApp are on the first screen." },
    ],
    image2: {
      src: "/img/work/burl-hall-wide.jpg",
      alt: "A living room with a wooden ceiling, blinds and a patterned daybed, a Burl Concepts project",
      w: 1400,
      h: 875,
      caption: "One of the studio's own projects, as shown on the new site.",
    },
  },
  {
    slug: "webinars",
    problem: "Filling the room, and following up after.",
    title: "Webinars and demand generation",
    caps: ["Acquire"],
    approach: "Run the whole loop (topic, speaker, promotion, registration, event, follow-up) alongside paid and organic.",
    changed: "10+ webinars supported, typically 100-150 attendees on the CSCP sessions.",
    learned: "Each channel should feed the next one.",
    kind: "Professional work",
    tone: "cream",
    line: "10+ webinars, from topic to follow-up.",
    headline: "Webinars that fill the room.",
    intro:
      "Alongside paid campaigns, webinars were a channel for awareness and demand: cybersecurity and career topics, run end to end.",
    facts: [
      { value: "10+", label: "webinars supported" },
      { value: "100-150", label: "typical CSCP attendance" },
    ],
    blocks: [
      {
        title: "What I did",
        body: [
          "I worked on every step: choosing topics, lining up speakers, promoting the session, handling registration, running the event and following up after. I used webinars next to paid and organic campaigns, so each channel fed the others.",
          "For one event I also built the registration page, with a countdown, agenda, FAQ and a registration form that records the click, so we could see what the promotion was doing.",
        ],
      },
    ],
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}

export const concepts = [
  {
    title: "FreshMart WhatsApp re-engagement",
    tag: "Concept",
    body: "A segmented WhatsApp plan for an online grocery app: inactive users get a \"we miss you\" offer, low-order users get habit-building bundles, loyal customers get rewards and referral codes. A strategy exercise, not a live campaign.",
  },
  {
    title: "Red Paddle Co content strategy",
    tag: "University project",
    body: "A full-funnel content and SEO audit for a UK inflatable paddle board brand, with a content calendar, topic clusters and 10+ long-form blog posts. Done as coursework during my MSc.",
  },
];
