# Abhishek's field notes

This prototype covers the homepage opening and the after-the-click investigation only. The existing archive, LAB, biography and contact sections remain in place for the next design review.

## 1. What makes it different

The introduction is a working surface: authorship, a photograph, campaign evidence, a question excerpt and a thread into an investigation. Abhishek's combination of marketing, creative, data, building and AI-assisted experimentation is the subject. Growth marketing is background context, not the masthead.

## 2. What makes it human

Use Abhishek's actual photograph and specific work. Marginal notes explain a thought. Evidence gaps remain visible. Avoid fictional client results, invented personal anecdotes, decorative handwriting and generic AI imagery. The question excerpt is labeled; it does not pretend to be an original ad or a functioning quiz.

## 3. How asymmetry works

A narrow author column supports a wider investigation. A yellow campaign sheet arrives before an offset page fragment; a single line connects the question to the next section. Small rotations belong to paper artifacts, not controls or paragraphs. Mobile preserves the reading order and stacks the artifacts. Shared spacing and a clear type hierarchy keep the irregularity readable.

## 4. How typography creates personality

Keep Fraunces for the name and the questions, Figtree for evidence and explanation, Caveat for observations in the margin. The largest type identifies the person. Figures are large only where scale is the point of the artifact. Type does not become a decorative background.

Palette: cream #fbf3e4, forest #1f3a28, yellow #f4b03f; white paper #fffcf6 and annotation ink #b8472a are supporting colors.

## 5. How motion communicates

Motion is there to move the reader from one "world" to the next, and every piece answers a question: where am I, what is the next thing, what just changed. GSAP only.

- The hero positions Abhishek as a growth marketer who also builds the martech, and shows both at once (src/components/growth-hero.tsx). Growth: every dot is a visitor, streaming in from four traffic sources (google / cpc, meta / paid_social, organic / search, whatsapp / chat), and his name is built out of them. The pointer engages nearby visitors; a click converts the nearest few, and each conversion flies into the name and stays gold. Martech: a live dataLayer console logs engaged and generate_lead events by source, beside a running funnel (arrived, engaged, converted, conversion rate). The visitors are simulated and labelled so; rows marked "you" are the visitor's real events from src/lib/track.ts. On the way out the name crumbles toward the next section. Reduced motion gets a still drawing; without JavaScript the name is plain type.
- The career route follows the hero (src/components/career-route.tsx), with Abhishek as the protagonist and no photograph: a route drawn over ledger paper (where it started: finance). The line leaves in right angles and learns to curve; each stop is a chapter in the order he tells it (B.Com, PGDM, Ramco Cements, MSc at Plymouth, Sofa.com, Foundever, SecurEyes, then what he is building next). The two border crossings (to the UK, then back home) are dotted flight arcs: the traveller becomes a paper plane, the board reads "In the air", and a passport stamp presses down in each country. The section pins and scrolling rides the traveller along the route: the walked line fills in, the ruled paper loosens into a dot grid, the world darkens for the last stop, and a split-flap board flips to each stop's name. Phones get the same motion on a portrait map: the road snakes down the screen so scrolling down walks it, with the board below. Only reduced motion gets a plain list. The last stop is labelled a direction, not a job title. Projects such as CSCP or Sastrum appear later as evidence, never as identity. Content lives in src/content/route.ts and is taken from his own account; add years only when he gives them.
- A wider field of view (src/components/field-of-view.tsx, content in src/content/career.ts) follows the route and answers a different question: not where he worked, but what each job let him see. One customer journey runs along the bottom (ad, click, page, enquiry, sales call, purchase, comes back); his five seats sit along the top. Choosing a seat shines a sun beam onto the stages it showed him, and a beam splits rather than cover a stage the seat never saw. "Put them together" fires every beam and covers all seven. Each seat reads as what I saw, what I do with it now, and proof that is already on the site.
- Selected work is a fly-through (src/components/work-reel.tsx, content in src/content/work.ts). The stage pins, and scrolling carries you through four projects in depth: Sastrum, the CSCP career quiz, Burl Concepts and the Foundation Day magazine. Each project's artifacts sit at different depths, rush past the camera on the way out, and the next project's come up from far away. The stage takes on each client's brand colours, because the work lived inside their brands. A paper case card (brief, what I made, links) stays the same on every brand. Every visual is real: screenshots of sastrum.ai and the magazine, frames and a loop from the Sastrum films, the brochure, and Burl Concepts' own project photos (public/img/work). The search listing, AI answer, quiz phone, report, lead inbox and chat are drawn in HTML. Tabs jump between projects. Phones get the same fly-through with the artifacts above the card; reduced motion gets the projects stacked.
- Social campaigns follow the reel (src/components/campaign-feed.tsx, content in src/content/campaigns.ts): Cybersecurity Awareness Month 2026 for SecurEyes, seven posts in its own navy, yellow and red. Each post sits in a phone on a shelf that scrolls sideways; carousels swipe inside the phone, reels play only while on screen (muted, with a sound toggle). The four words of the campaign land one at a time. A note says plainly: designed in Canva, the people are AI-generated, the scenarios are fictional, no reach figures yet. Reduced motion: nothing plays on its own.
- The CSCP case page shows the campaign creative as contact sheets (ads in every size and the promo film, the batch posters, the organic carousel), each strip at a shared height so every format keeps its true shape. Programme facts (batches, students, placements) and the Kyarena platform are deliberately left out: they are SecurEyes' achievements, not this work.
- Arrival (the older hero, now replaced): the hero is staged on load (headline rises by line, portrait is uncovered), then its layers separate on the way out.
- Rooms: the "How I approach the work" section widens from a card to full bleed as it arrives (a curtain), and is the page's one dark world besides the launch block.
- The walk: that section pins and Position, Acquire, Convert and Learn & build travel past sideways, with a thread that fills along the bottom. Phones get the same walk with each stage stacked inside its own screen; reduced motion gets the four stages stacked, nothing pinned.
- Phones get every animation desktop has. Where desktop relies on hover, touch gets an equivalent: in the hero a gold campaign ring drifts through the crowd (a finger takes it over), and archive rows take their hover treatment as they cross the middle of the screen. Only ScrollSmoother stays off on touch, where native scrolling feels better.
- The header is the journey (src/components/site-header.tsx): no bar, three floating pieces. A name tag folds into an AJ monogram once you scroll. The nav is a dock that shows the page as a route of nine stops, with a gold traveller riding along as you scroll and a label that flips to the section you are in; the label opens the whole route as a sheet, which is the menu on phones. A hello tag carries "open to roles" and the time in Bengaluru, and folds to "Say hello". The dock replaces the old scroll progress thread.
- Smaller cues: headlines that rise line by line, counters, controls that lean toward a fine pointer.
- The investigation, the career lens and the quizzes keep their short, 10-pixel state changes.

Everything is gated by prefers-reduced-motion, content is readable without JavaScript, and nothing uses a scroll listener (ScrollTrigger only).

## 6. How work avoids identical cards

Campaign evidence uses a volume/capacity sheet; a website uses a real capture; a quiz uses a question excerpt; measurement uses an event inspection. Future magazine and launch projects should use spreads and film artifacts respectively. Retain a shared editorial voice, not a universal rounded container.

## 7. The signature interaction

Ad → Landing page → Experience → Lead → Sales → Customer → next campaign.

Each selected stage exposes a question, a distinct artifact, an intervention, evidence and a lesson. Different projects illustrate different questions: this is not presented as a single attributable customer funnel. Sales and customer are explicitly proposed investigations/open questions. Existing case-study outcomes are repeated with their limitations, not independently upgraded into verified results.

The interaction supports click/tap, arrow keys, Home/End, a next-stage control and a return to the beginning. The opening and surrounding page remain Server Components; the investigation owns the client state.

## 8. How the LAB will differ

Professional work is a record of decisions and delivered artifacts. The LAB will be a personal research notebook, organized around questions and revisions.

Planned categories: Experiments, AI, Marketing systems, Creative code, Data, Odd ideas. These are topics, not claims of completed projects.

Use independent metadata fields rather than ambiguous badges:

- Origin: professional work, client work, personal build.
- Nature: experiment, recreation, hypothetical model, research question.
- State: question, exploring, prototype, in progress, complete.
- Availability: working demo, source link, open source only when actually released under an appropriate license.

Only complete artifacts receive completed-work treatment. An AI diagnosis tool, attribution playground or API experiment starts as a labeled question until there is an implementation. Open questions can be designed and browsed without pretending they are working demos.

The LAB architecture and archive redesign are intentionally held for review after this two-section prototype.

## Implementation notes

- No packages added. Existing photography, Next Image, fonts, GSAP and dot visualization reused.
- Existing Journey component retained for reference; the prototype uses ClickInvestigation.
- CSS Modules isolate the prototype. The existing Turbopack Tailwind rule now targets globals.css, rather than converting module styles into global CSS.
- The later homepage retains its previous styling and content; it is not a preview of the proposed archive or LAB design.
