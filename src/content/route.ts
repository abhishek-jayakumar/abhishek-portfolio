/**
 * The route: Abhishek's career as told by him, in the order he told it. Everything here is
 * from his own account. Years appear only where the site already carries them (the studies);
 * work years are left out because they have not been given. The last stop is a direction, not
 * a role, and is labelled that way.
 *
 * x / y place each stop on the route map, in percent of the map. `flight` marks a stop reached
 * by crossing a border: the road becomes a dotted flight arc and the traveller becomes a plane.
 */
export type Stop = {
  key: string;
  kind: "Studied" | "Worked" | "Working" | "Exploring";
  title: string;
  when?: string;
  place?: string;
  line: string;
  x: number;
  y: number;
  /** Where the stop sits on the portrait (phone) map. */
  mx: number;
  my: number;
  flight?: string;
};

export const ROUTE: readonly Stop[] = [
  {
    key: "bcom",
    kind: "Studied",
    title: "B.Com, Finance",
    when: "2013 to 2016",
    place: "Payyannur College",
    line: "Where it started: numbers, ledgers and tax. Somewhere in it, I realised my interests were not aligned with finance.",
    x: 7,
    y: 74,
    mx: 16,
    my: 5,
  },
  {
    key: "pgdm",
    kind: "Studied",
    title: "PGDM, Marketing",
    when: "2016 to 2018",
    place: "SCMS",
    line: "So I moved toward marketing, and made it my core specialisation.",
    x: 19,
    y: 64,
    mx: 66,
    my: 15,
  },
  {
    key: "ramco",
    kind: "Worked",
    title: "Ramco Cements",
    when: "Three years",
    place: "Sales and marketing",
    line: "Brand marketing, offline marketing, channel sales management, and day-to-day sales and marketing activity.",
    x: 31,
    y: 54,
    mx: 22,
    my: 29,
  },
  {
    key: "plymouth",
    kind: "Studied",
    title: "MSc, Digital & Social Media Marketing",
    when: "2022 to 2023",
    place: "University of Plymouth, UK",
    line: "I wanted to upgrade my skills and go deeper into digital marketing.",
    x: 45,
    y: 66,
    mx: 72,
    my: 49,
    flight: "Flew to the UK",
  },
  {
    key: "sofa",
    kind: "Worked",
    title: "Sofa.com",
    when: "Alongside the MSc",
    place: "UK",
    line: "Sales experience met digital knowledge, across online and offline activity.",
    x: 56,
    y: 50,
    mx: 26,
    my: 61,
  },
  {
    key: "foundever",
    kind: "Worked",
    title: "Foundever",
    place: "UK",
    line: "Customer experience and retention.",
    x: 66,
    y: 58,
    mx: 70,
    my: 71,
  },
  {
    key: "secureyes",
    kind: "Working",
    title: "SecurEyes",
    when: "About a year so far",
    place: "India, back home",
    line: "The only marketing professional here, leading the function from strategy to execution: performance marketing, content strategy and creative direction.",
    x: 80,
    y: 34,
    mx: 22,
    my: 88,
    flight: "Flew back home to India",
  },
  {
    key: "now",
    kind: "Exploring",
    title: "Building what comes next",
    when: "Now",
    place: "a direction, not a job title",
    line: "Experimenting with digital and AI-assisted experiences: the things I make to understand what happens next.",
    x: 93,
    y: 16,
    mx: 74,
    my: 97,
  },
];

/** Passport stamps, pressed when the traveller reaches stop `at`. Placed in percent of the map. */
export const STAMPS = [
  { at: 0, country: "India", note: "where it started", x: 6, y: 34, mx: 80, my: 5, tilt: -8 },
  { at: 3, country: "United Kingdom", note: "2022", x: 47, y: 14, mx: 24, my: 44, tilt: 6 },
  { at: 6, country: "India", note: "back home", x: 84, y: 64, mx: 82, my: 83, tilt: -5 },
] as const;

/**
 * The road, one segment per stop: segment i ends at stop i. Right angles while it is finance,
 * then it learns to curve; the two border crossings are flight arcs. Coordinates are percent of
 * the map; buildSegments turns them into real pixels so the line is never stretched (a stretched
 * SVG would distort its stroke and break the draw-on effect).
 */
type Cmd = readonly [string, ...number[]];
const SEGMENTS: ReadonlyArray<{ flight: boolean; cmds: readonly Cmd[] }> = [
  { flight: false, cmds: [["M", 3, 74], ["H", 7]] },
  { flight: false, cmds: [["M", 7, 74], ["V", 68], ["H", 19], ["V", 64]] },
  { flight: false, cmds: [["M", 19, 64], ["C", 25, 64, 26, 54, 31, 54]] },
  { flight: true, cmds: [["M", 31, 54], ["C", 35, 27.3, 39.7, 31.3, 45, 66]] },
  { flight: false, cmds: [["M", 45, 66], ["C", 50, 66, 51, 50, 56, 50]] },
  { flight: false, cmds: [["M", 56, 50], ["C", 61, 50, 61, 58, 66, 58]] },
  { flight: true, cmds: [["M", 66, 58], ["C", 69.3, 30, 74, 22, 80, 34]] },
  { flight: false, cmds: [["M", 80, 34], ["C", 86, 34, 87, 16, 93, 16]] },
];

/** The same road for a portrait screen: it snakes down the page, so scrolling down walks it. */
const SEGMENTS_MOBILE: ReadonlyArray<{ flight: boolean; cmds: readonly Cmd[] }> = [
  { flight: false, cmds: [["M", 16, 0], ["V", 5]] },
  { flight: false, cmds: [["M", 16, 5], ["V", 10], ["H", 66], ["V", 15]] },
  { flight: false, cmds: [["M", 66, 15], ["C", 66, 24, 22, 20, 22, 29]] },
  { flight: true, cmds: [["M", 22, 29], ["C", 30, 36, 96, 30, 72, 49]] },
  { flight: false, cmds: [["M", 72, 49], ["C", 72, 58, 26, 52, 26, 61]] },
  { flight: false, cmds: [["M", 26, 61], ["C", 26, 70, 70, 62, 70, 71]] },
  { flight: true, cmds: [["M", 70, 71], ["C", 66, 82, 2, 74, 22, 88]] },
  { flight: false, cmds: [["M", 22, 88], ["C", 22, 96, 74, 90, 74, 97]] },
];
const segmentsFor = (mobile: boolean) => (mobile ? SEGMENTS_MOBILE : SEGMENTS);

const toPath = (cmds: readonly Cmd[], width: number, height: number, skipMove = false) => {
  const x = (v: number) => +((v * width) / 100).toFixed(2);
  const y = (v: number) => +((v * height) / 100).toFixed(2);
  return cmds
    .filter(([cmd]) => !(skipMove && cmd === "M"))
    .map(([cmd, ...n]) => {
      if (cmd === "H") return `H ${x(n[0])}`;
      if (cmd === "V") return `V ${y(n[0])}`;
      return `${cmd} ${n.map((v, k) => (k % 2 === 0 ? x(v) : y(v))).join(" ")}`;
    })
    .join(" ");
};

export function buildSegments(width: number, height: number, mobile = false) {
  return segmentsFor(mobile).map((s) => ({ flight: s.flight, d: toPath(s.cmds, width, height) }));
}

/** The whole road as one continuous path, for the traveller to ride. */
export function buildRoad(width: number, height: number, mobile = false): string {
  return segmentsFor(mobile).map((s, i) => toPath(s.cmds, width, height, i > 0)).join(" ");
}

