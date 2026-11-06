/**
 * Social campaigns. Abhishek designed these in Canva; the people in them are
 * AI-generated, and every message, name and number inside the posts is fictional
 * (the posts say so themselves). No reach or engagement figures yet: add them here
 * only when they come from the platform's own insights.
 */

export type Slide = { src: string; alt: string };

export type Post = {
  key: string;
  /** The series label printed on the post itself. */
  series: string;
  format: "Carousel" | "Reel";
  title: string;
  /** One line: what the post asks the reader to do. */
  move: string;
  slides: Slide[];
  /** Reels only. */
  video?: { src: string; poster: string; seconds: number };
};

const aw = (f: string) => `/img/campaigns/aware/${f}`;

export const AWARENESS = {
  name: "Cybersecurity Awareness Month 2026",
  client: "SecurEyes",
  line: ["Aware.", "Pause.", "Verify.", "Report."],
  counts: [
    { value: "7", label: "posts" },
    { value: "33", label: "carousel slides" },
    { value: "2", label: "reels" },
    { value: "5", label: "formats" },
  ],
};

export const POSTS: Post[] = [
  {
    key: "scam-check-1",
    series: "Scam check 01",
    format: "Carousel",
    title: "Would you fall for these 5 messages?",
    move: "Five everyday scams, one red flag each, then a comment prompt: which one have you had?",
    slides: [
      { src: aw("p1-01.jpg"), alt: "Cover: Would you fall for these 5 messages? A phone shows a message from an unknown number asking for ₹5,000." },
      { src: aw("p1-02.jpg"), alt: "1 of 5, delivery scam: a missed delivery, a costly click. Red flag: a cancellation threat pushes you to click." },
      { src: aw("p1-03.jpg"), alt: "2 of 5, banking scam: 30 minutes, that’s the trap. Red flag: a rushed deadline leaves less time to think." },
      { src: aw("p1-04.jpg"), alt: "3 of 5, fake job offer: an interview with an entry fee. Red flag: an unsolicited interview fee." },
      { src: aw("p1-05.jpg"), alt: "4 of 5, impersonation: new number, same friend? Red flag: a familiar story isn’t proof of identity." },
      { src: aw("p1-06.jpg"), alt: "5 of 5, OTP scam: your OTP, their way in. Red flag: your code could give someone account access." },
      { src: aw("p1-07.jpg"), alt: "Close: Scammers create urgency. You create the pause. Aware, pause, verify, report. Which scam have you encountered?" },
    ],
  },
  {
    key: "case-file",
    series: "Cyber case file #001",
    format: "Carousel",
    title: "The Midnight File",
    move: "A phishing story told as a case file. The reader looks at the evidence and solves it before the reveal.",
    slides: [
      { src: aw("p3-01.jpg"), alt: "Cyber case file #001, The Midnight File: her classmate sent the file, then denied sending it." },
      { src: aw("p3-02.jpg"), alt: "Evidence A, the message: it came from her project partner’s real account, asking her to update her part before 12." },
      { src: aw("p3-03.jpg"), alt: "Evidence B, the destination: a presentation link that opens a university sign-in screen." },
      { src: aw("p3-04.jpg"), alt: "Evidence C, the discrepancy: one detail changes everything. northbridge.example against northbrldge.example." },
      { src: aw("p3-05.jpg"), alt: "Witness statement: then she called her partner. “I didn’t send any presentation link.”" },
      { src: aw("p3-06.jpg"), alt: "Incident reconstruction: unauthorised access at 11:42, a fraudulent message at 11:47, a counterfeit login page at 11:48." },
      { src: aw("p3-07.jpg"), alt: "Case findings, confirmed: the account was real; the request was a trap." },
      { src: aw("p3-08.jpg"), alt: "Case closed: your next move makes the difference. Aware, pause, verify, report." },
    ],
  },
  {
    key: "qr-swap",
    series: "Scam check 02",
    format: "Reel",
    title: "₹220 paid. Not to the café.",
    move: "A QR sticker swapped on a café table, played out in 25 seconds.",
    slides: [{ src: aw("p2-cover.jpg"), alt: "₹220 paid. Not to the café. A UPI payment goes to a QR sticker someone swapped onto the table." }],
    video: { src: aw("p2-reel.mp4"), poster: aw("p2-cover.jpg"), seconds: 25 },
  },
  {
    key: "hacker-mindset",
    series: "Hacker mindset · level 01",
    format: "Carousel",
    title: "Can you spot the flaw in 10 seconds?",
    move: "A quiz: find the flaw in a password-reset screen, lock in A, B or C, then swipe for the answer.",
    slides: [
      { src: aw("p4-01.jpg"), alt: "Hacker mindset level 01: can you spot the flaw in 10 seconds? A student portal’s password reset screen." },
      { src: aw("p4-02.jpg"), alt: "What’s wrong with this system? Three options, A, B or C, for the flaw in the reset flow." },
      { src: aw("p4-03.jpg"), alt: "The answer is B: whoever asks picks where the key goes. Reset links should only go to a recovery channel already verified." },
      { src: aw("p4-04.jpg"), alt: "You spotted one security flaw. What if you could find more? Learn to think like a hacker, with a link to cybersecurity training." },
    ],
  },
  {
    key: "challenge",
    series: "Cyber challenge · level 02",
    format: "Carousel",
    title: "₹2,40,000 left the account.",
    move: "An investigation the reader runs: three true clues, pick what to check first, then the reveal.",
    slides: [
      { src: aw("p5-01.jpg"), alt: "Cyber challenge level 02: ₹2,40,000 left the account, but the owner never approved it." },
      { src: aw("p5-02.jpg"), alt: "The evidence, three clues, all true: a recognised device, a successful authorisation, and the owner saying “I didn’t approve it.”" },
      { src: aw("p5-03.jpg"), alt: "Your move: which would you investigate first? A, someone guessed the password; B, a signed-in session was abused; C, a stranger cloned the SIM." },
      { src: aw("p5-04.jpg"), alt: "The reveal, B: the device was trusted, the activity wasn’t. A recognised device isn’t a legitimate user." },
      { src: aw("p5-05.jpg"), alt: "Level 02 cleared: you spotted it. Could you prove it? Explore how cybersecurity is learned." },
    ],
  },
  {
    key: "clicked-allow",
    series: "Reel",
    format: "Reel",
    title: "You didn’t get hacked. You clicked Allow.",
    move: "What a browser extension can do once you give it permission, in 30 seconds.",
    slides: [{ src: aw("p6-cover.jpg"), alt: "You didn’t get hacked. You clicked Allow. A young man reads a browser extension’s permission request." }],
    video: { src: aw("p6-reel.mp4"), poster: aw("p6-cover.jpg"), seconds: 30 },
  },
  {
    key: "upi",
    series: "Spot the red flags",
    format: "Carousel",
    title: "You got ₹5,000 by mistake.",
    move: "The UPI “sent by mistake” scam, step by step: count the red flags, then check your score.",
    slides: [
      { src: aw("p7-01.jpg"), alt: "You got ₹5,000 by mistake. Would you send it back? A young man holds a phone showing a credit SMS." },
      { src: aw("p7-02.jpg"), alt: "Then he texts you: a story about his mother’s hospital bill, asking for the money back fast." },
      { src: aw("p7-03.jpg"), alt: "So you open his request to send it back. Wait, read the button: it is a payment request." },
      { src: aw("p7-04.jpg"), alt: "The ₹5,000 never came. That SMS was fake; the bank balance never changed." },
      { src: aw("p7-05.jpg"), alt: "Spot the 4 red flags. Count them before you swipe." },
      { src: aw("p7-06.jpg"), alt: "Here are all 4: a mobile number instead of a bank sender ID, a sob story with “fast”, names that don’t match, and a button that says Pay." },
      { src: aw("p7-07.jpg"), alt: "Screenshot this: UPI PIN means money going out. You never need a PIN to receive money. Lost money? Call 1930 or report at cybercrime.gov.in." },
      { src: aw("p7-08.jpg"), alt: "You just spotted 4 red flags. Some people do this for a living. Explore cybersecurity training." },
      { src: aw("p7-09.jpg"), alt: "Send this to the most honest person you know. Their honesty is the target. Aware, pause, verify, report." },
    ],
  },
];
