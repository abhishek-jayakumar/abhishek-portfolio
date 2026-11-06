"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import { gsap, useGSAP, ScrollTrigger, ScrollSmoother } from "@/lib/gsap-plugins";
import { ALSO, WORK, type Work } from "@/content/work";
import { POSTS } from "@/content/campaigns";
import { Lines } from "./lines";
import s from "./work-reel.module.css";

/* ---- The things each project made, laid out like a desk of real artifacts ------------- */

function Browser({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className={s.browser}>
      <div className={s.bar} aria-hidden="true"><i /><i /><i /><span>{url}</span></div>
      {children}
    </div>
  );
}

function SastrumDesk() {
  return (
    <>
      <figure className={`${s.item} ${s.sasSite}`} data-depth="0.15">
        <Browser url="sastrum.ai">
          <Image src="/img/work/sastrum-home.jpg" alt="The Sastrum homepage: GRC, simplified, with Book a demo and Watch the film" width={1440} height={900} sizes="(min-width: 60rem) 36vw, 64vw" />
        </Browser>
        <figcaption>The website</figcaption>
      </figure>
      <figure className={`${s.item} ${s.sasFilm}`} data-depth="0.55">
        <div className={s.film}>
          <video data-loop muted loop playsInline preload="none" poster="/img/work/sastrum-reveal-logo.jpg" aria-label="A loop from the Sastrum name-reveal film: scattered GRC icons join into one system">
            <source src="/img/work/sastrum-reveal-loop.mp4" type="video/mp4" />
          </video>
        </div>
        <figcaption>Name-reveal film</figcaption>
      </figure>
      <figure className={`${s.item} ${s.sasPlan}`} data-depth="0.4">
        <div className={s.plan}>
          <p className={s.tag}>GTM roadmap / 6 months</p>
          <ol>
            {["Foundation", "Visibility", "Demand", "Partners", "Optimise"].map((p, i) => (
              <li key={p}><span>{i + 1}</span>{p}</li>
            ))}
          </ol>
          <p className={s.planFoot}>Positioning · Website · SEO &amp; AEO · Paid · PR · Partners · KPIs</p>
        </div>
        <figcaption>The go-to-market plan</figcaption>
      </figure>
      <figure className={`${s.item} ${s.sasCount}`} data-depth="0.7">
        <div className={s.film}>
          <Image src="/img/work/sastrum-countdown-world.jpg" alt="A frame from the launch countdown film: Born in India. Built for the world." width={1280} height={720} sizes="(min-width: 60rem) 14vw, 24vw" />
        </div>
        <figcaption>Launch countdown</figcaption>
      </figure>
      <figure className={`${s.item} ${s.sasBrochure}`} data-depth="0.5">
        <Image src="/img/work/sastrum-brochure-cover.jpg" alt="The cover of the Sastrum product brochure" width={794} height={1123} sizes="(min-width: 60rem) 12vw, 20vw" />
        <figcaption>Brochure</figcaption>
      </figure>
      <div className={`${s.item} ${s.serp}`} data-depth="0.85" aria-hidden="true">
        <p className={s.tag}>Search</p>
        <p className={s.serpUrl}><b>S</b>sastrum.ai</p>
        <p className={s.serpTitle}>Sastrum: GRC, simplified, for small and mid-size regulated firms</p>
        <p className={s.serpText}>One platform for risk, compliance and internal audit, built for small and mid-size regulated firms.</p>
      </div>
      <div className={`${s.item} ${s.answer}`} data-depth="1" aria-hidden="true">
        <p className={s.tag}>AI answer</p>
        <p className={s.ask}>Which GRC platform fits a mid-size bank?</p>
        <p className={s.reply}><span data-type>Sastrum is one platform for risk, compliance and internal audit, built for small and mid-size regulated firms.</span></p>
        <p className={s.source}><span>sastrum.ai</span> cited</p>
      </div>
    </>
  );
}

const OPTIONS = ["I’m still studying or recently graduated", "I’m looking for my first job", "I’m currently working and want to upskill", "I want to switch careers into tech"];
const DIMENSIONS: [string, number][] = [["Curiosity", 82], ["Problem solving", 74], ["Learning agility", 88], ["Career motivation", 91], ["Commitment", 69]];

function CareerDesk() {
  return (
    <>
      <div className={`${s.item} ${s.phone}`} data-depth="0.2" aria-hidden="true">
        <div className={s.phoneScreen}>
          <p className={s.qBrand}>Cyber Career Discovery</p>
          <p className={s.qCount}>Question 3 of 15</p>
          <span className={s.qBar}><i /></span>
          <p className={s.qText}>What best describes your current situation?</p>
          <ul className={s.qOptions}>
            {OPTIONS.map((o, i) => <li key={o} className={i === 2 ? s.qPicked : undefined}>{o}</li>)}
          </ul>
          <span className={s.qNext}>Next question</span>
        </div>
      </div>
      <div className={`${s.item} ${s.report}`} data-depth="0.5" aria-hidden="true">
        <p className={s.tag}>Your report</p>
        <p className={s.reportFor}>Your best fit</p>
        <p className={s.reportRole}>Cloud Security Analyst</p>
        <ul className={s.dims}>
          {DIMENSIONS.map(([d, v]) => <li key={d}><span>{d}</span><i style={{ "--v": `${v}%` } as CSSProperties} /></li>)}
        </ul>
        <p className={s.reportNext}>Next step: talk to a counsellor about CSCP</p>
      </div>
      <div className={`${s.item} ${s.leads}`} data-depth="0.8" aria-hidden="true">
        <p className={s.tag}>Lead inbox</p>
        <ul>
          <li className={s.leadNew}><b>Cloud Security Analyst</b><span>finished all 15 · wants CSCP details</span><em>new</em></li>
          <li><b>SOC Analyst</b><span>finished all 15 · report downloaded</span></li>
          <li><b>GRC Analyst</b><span>finished all 15 · booked a call</span></li>
        </ul>
      </div>
      <div className={`${s.item} ${s.events}`} data-depth="0.65" aria-hidden="true">
        <code>assessment_started</code>
        <code>assessment_completed</code>
        <code>lead_submitted</code>
      </div>
      <p className={`${s.item} ${s.sticky}`} data-depth="1">
        The CSCP campaign: <strong>1,000+</strong> enquiries for 50 seats
      </p>
    </>
  );
}

function BurlDesk() {
  return (
    <>
      <figure className={`${s.item} ${s.polaroid} ${s.burlA}`} data-depth="0.3">
        <Image src="/img/work/burl-kitchen.jpg" alt="A sage-green modular kitchen with wooden glass-front cabinets, a Burl Concepts project" width={1400} height={1867} sizes="(min-width: 60rem) 18vw, 30vw" />
        <figcaption>Kitchen</figcaption>
      </figure>
      <figure className={`${s.item} ${s.polaroid} ${s.burlB}`} data-depth="0.55">
        <Image src="/img/work/burl-hall.jpg" alt="A living room with a wooden ceiling, blinds and a patterned daybed, a Burl Concepts project" width={1400} height={1857} sizes="(min-width: 60rem) 18vw, 30vw" />
        <figcaption>Living room</figcaption>
      </figure>
      <figure className={`${s.item} ${s.polaroid} ${s.burlC}`} data-depth="0.4">
        <Image src="/img/work/burl-bedroom.jpg" alt="A bedroom with a wooden headboard wall and a teal throw, a Burl Concepts project" width={1400} height={1912} sizes="(min-width: 60rem) 16vw, 28vw" />
        <figcaption>Bedroom</figcaption>
      </figure>
      <figure className={`${s.item} ${s.burlLogo}`} data-depth="0.7">
        <Image src="/img/work/burl-studio.jpg" alt="The Burl Concepts monogram" width={1400} height={1400} sizes="10vw" />
      </figure>
      <div className={`${s.item} ${s.chat}`} data-depth="0.9" aria-hidden="true">
        <p className={s.chatHead}><b>Burl Concepts</b><span>usually replies in minutes</span></p>
        <p className={s.bubble}>Looking to transform your space? Tell us what you need.</p>
        <p className={s.chips}><span>Residential</span><span>Modular Kitchen</span><span>Office</span><span>Custom Furniture</span></p>
        <p className={s.wa}>Chat on WhatsApp</p>
      </div>
      <p className={`${s.item} ${s.note}`} data-depth="1">
        <strong>13</strong> events tracked, from first click to enquiry
      </p>
    </>
  );
}

function MagazineDesk() {
  return (
    <>
      <figure className={`${s.item} ${s.magCover}`} data-depth="0.15">
        <Browser url="20th Foundation Day Issue">
          <Image src="/img/work/mag-home.jpg" alt="The magazine's cover: SecurEyes, Celebrating 20 Years of Excellence, with the leadership team on stage" width={1440} height={900} sizes="(min-width: 60rem) 36vw, 64vw" />
        </Browser>
        <figcaption>The digital issue</figcaption>
      </figure>
      <figure className={`${s.item} ${s.magContents}`} data-depth="0.5">
        <Image src="/img/work/mag-contents.jpg" alt="The magazine's contents page: from the CEO, twenty years, people of the year, the film, creative corner" width={1440} height={900} sizes="(min-width: 60rem) 22vw, 40vw" />
        <figcaption>Contents</figcaption>
      </figure>
      <figure className={`${s.item} ${s.magPhone}`} data-depth="0.8">
        <div className={s.handset}>
          <Image src="/img/work/mag-phone.jpg" alt="The magazine's cover on a phone" width={390} height={844} sizes="(min-width: 60rem) 10vw, 18vw" />
        </div>
        <figcaption>On a phone</figcaption>
      </figure>
      <p className={`${s.item} ${s.goldNote}`} data-depth="1">
        Ships as a static site <em>and</em> a SharePoint app
      </p>
    </>
  );
}

const post = (key: string) => POSTS.find((p) => p.key === key)!;

function AwarenessDesk() {
  const reel = post("qr-swap");
  return (
    <>
      {[["scam-check-1", s.awA], ["case-file", s.awB], ["upi", s.awC]].map(([key, cls], i) => {
        const p = post(key);
        return (
          <figure key={key} className={`${s.item} ${s.awPost} ${cls}`} data-depth={[0.3, 0.5, 0.75][i]}>
            <div className={s.awScreen}>
              <Image src={p.slides[0].src} alt={p.slides[0].alt} width={1080} height={1350} sizes="(min-width: 60rem) 16vw, 28vw" />
            </div>
            <figcaption>{p.series}</figcaption>
          </figure>
        );
      })}
      <figure className={`${s.item} ${s.awPost} ${s.awReel}`} data-depth="0.55">
        <div className={s.awScreen}>
          <video data-loop muted loop playsInline preload="none" poster={reel.video!.poster} aria-label={reel.slides[0].alt}>
            <source src={reel.video!.src} type="video/mp4" />
          </video>
        </div>
        <figcaption>Reel, {reel.video!.seconds}s</figcaption>
      </figure>
      <p className={`${s.item} ${s.awWords}`} data-depth="1">
        Aware. Pause. Verify. <span>Report.</span>
        <small>The people are AI-generated; names and numbers in the posts are fictional.</small>
      </p>
    </>
  );
}

const DESKS: Record<Work["key"], () => React.ReactNode> = {
  sastrum: SastrumDesk,
  career: CareerDesk,
  burl: BurlDesk,
  magazine: MagazineDesk,
  awareness: AwarenessDesk,
};

function Card({ w }: { w: Work }) {
  return (
    <div className={s.card} data-card>
      <p className={s.client}><strong>{w.client}</strong> {w.context}</p>
      <h3 className={s.brief}>{w.brief}</h3>
      <p className={s.body}>{w.body}</p>
      <ul className={s.made} aria-label="What I made">
        {w.made.map((m) => <li key={m}>{m}</li>)}
      </ul>
      {w.links.length > 0 && <p className={s.links}>
        {w.links.map((l) =>
          l.external ? (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" data-track={`work_${w.key}_site`}>{l.label}<span aria-hidden="true"> ↗</span></a>
          ) : (
            <Link key={l.href} href={l.href} data-track={`work_${w.key}`}>{l.label}<span aria-hidden="true"> →</span></Link>
          ),
        )}
      </p>}
    </div>
  );
}

/**
 * Selected work as a fly-through. The stage pins, and scrolling carries you through five
 * projects in depth: each project's artifacts sit at different distances, rush past the
 * camera on the way out, and the next project's come up from far away. The stage takes on
 * each client's brand colours as you arrive, because the work lived inside their brands.
 * Reduced motion (and no JavaScript) gets the projects stacked, each in its colours.
 */
export function WorkReel() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const st = stage.current;
      if (!st) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const scenes = gsap.utils.toArray<HTMLElement>("[data-scene]", st);
        const tabs = gsap.utils.toArray<HTMLElement>("[data-tab]", st);
        const items = scenes.map((sc) => gsap.utils.toArray<HTMLElement>("[data-depth]", sc));
        const cards = scenes.map((sc) => sc.querySelector<HTMLElement>("[data-card]"));
        const depth = (el: HTMLElement) => Number(el.dataset.depth || 0.5);
        st.dataset.camera = "true";

        // Everything but the first project starts far away.
        scenes.forEach((sc, i) => {
          if (i === 0) return;
          gsap.set(sc, { autoAlpha: 0 });
          gsap.set(items[i], { autoAlpha: 0, scale: (_, el) => 0.55 - depth(el) * 0.15, y: (_, el) => 60 + depth(el) * 80 });
          gsap.set(cards[i], { autoAlpha: 0, y: 40 });
        });
        gsap.set(st, { backgroundColor: WORK[0].brand.bg, color: WORK[0].brand.fg });

        let live = -1;
        const setLive = (i: number) => {
          if (i === live) return;
          live = i;
          scenes.forEach((sc, n) => sc.classList.toggle(s.live, n === i));
          tabs.forEach((t, n) => t.setAttribute("aria-current", n === i ? "true" : "false"));
          st.style.setProperty("--tab-bg", WORK[i].brand.fg);
          st.style.setProperty("--tab-ink", WORK[i].brand.bg);
          scenes.forEach((sc, n) =>
            sc.querySelectorAll<HTMLVideoElement>("video[data-loop]").forEach((v) => {
              if (n === i) void v.play().catch(() => {});
              else v.pause();
            }),
          );
        };

        // A hold on each project (1), then the move to the next (1).
        const tl = gsap.timeline({ defaults: { ease: "none" } });
        scenes.forEach((_, i) => {
          const t = i * 2;
          tl.addLabel(`p${i}`, t);
          tl.to(items[i], { y: (_, el) => `-=${depth(el) * 36}`, duration: 1 }, t);
          if (i === scenes.length - 1) return;
          const out = t + 1;
          tl.to(items[i], { autoAlpha: 0, scale: (_, el) => 1.25 + depth(el) * 0.6, y: (_, el) => -40 - depth(el) * 120, duration: 0.6, ease: "power2.in" }, out);
          tl.to(cards[i], { autoAlpha: 0, y: -40, duration: 0.35, ease: "power2.in" }, out);
          tl.set(scenes[i], { autoAlpha: 0 }, out + 0.6);
          tl.set(scenes[i + 1], { autoAlpha: 1 }, out + 0.3);
          tl.to(st, { backgroundColor: WORK[i + 1].brand.bg, color: WORK[i + 1].brand.fg, duration: 0.5 }, out + 0.25);
          tl.to(items[i + 1], { autoAlpha: 1, scale: 1, y: 0, duration: 0.65, ease: "power3.out", stagger: 0.04 }, out + 0.35);
          tl.to(cards[i + 1], { autoAlpha: 1, y: 0, duration: 0.45, ease: "power3.out" }, out + 0.5);
        });

        const trigger = ScrollTrigger.create({
          trigger: st,
          start: "top top",
          end: () => `+=${window.innerHeight * (scenes.length * 1.15)}`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          animation: tl,
          onUpdate: () => setLive(Math.min(scenes.length - 1, Math.floor((tl.time() + 0.6) / 2))),
          onToggle: (self) => {
            if (!self.isActive) scenes.forEach((sc) => sc.querySelectorAll<HTMLVideoElement>("video[data-loop]").forEach((v) => v.pause()));
            else { const i = live; live = -1; setLive(Math.max(0, i)); }
          },
        });
        setLive(0);

        // The tabs jump straight to a project.
        const onTab = (e: Event) => {
          const i = tabs.indexOf(e.currentTarget as HTMLElement);
          const y = trigger.labelToScroll(`p${i}`);
          const smoother = ScrollSmoother.get();
          if (smoother) smoother.scrollTo(y, true);
          else gsap.to(window, { duration: 1, ease: "power2.inOut", scrollTo: { y, autoKill: false } });
        };
        tabs.forEach((t) => t.addEventListener("click", onTab));

        return () => {
          tabs.forEach((t) => t.removeEventListener("click", onTab));
          delete st.dataset.camera;
          scenes.forEach((sc) => sc.classList.remove(s.live));
        };
      });
    },
    { scope: root },
  );

  return (
    <section id="work" ref={root} className={s.section} data-section="selected-work" aria-labelledby="work-heading">
      <header className={s.head}>
        <p className={s.caption}>Selected work</p>
        <Lines as="h2" id="work-heading">Five briefs.<br />Everything they needed.</Lines>
        <p>Each project lived inside its client’s brand, so the colours change as you scroll. Around every brief is what I actually made for it.</p>
      </header>

      <div className={s.stage} ref={stage}>
        <nav className={s.tabs} aria-label="Projects">
          {WORK.map((w, i) => (
            <button key={w.key} type="button" data-tab aria-current={i === 0 ? "true" : "false"}>
              <span>{w.short}</span>
            </button>
          ))}
        </nav>
        <div className={s.scenes}>
          {WORK.map((w) => {
            const Desk = DESKS[w.key];
            return (
              <article
                key={w.key}
                className={`${s.scene} ${s[w.key]}`}
                data-scene
                aria-label={w.client}
                style={{ "--bg": w.brand.bg, "--fg": w.brand.fg, "--accent": w.brand.accent } as CSSProperties}
              >
                <Card w={w} />
                <div className={s.deskWrap}>
                  <div className={s.desk}>
                    <Desk />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className={s.also}>
        <p className={s.alsoHead}>Also on the desk</p>
        <ul>
          {ALSO.map((a) => (
            <li key={a.href}>
              <Link href={a.href} data-track={`work_${a.href.split("/").pop()}`}>
                <strong>{a.value}</strong>
                <span>{a.label}</span>
                {a.note && <small>{a.note}</small>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
