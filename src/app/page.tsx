import Image from "next/image";
import { CareerStory, PortfolioOpening } from "@/components/portfolio-opening";
import { MarketingApproach } from "@/components/marketing-approach";
import { Lab } from "@/components/lab";
import { AboutStickers } from "@/components/about-stickers";
import { Lines } from "@/components/lines";
import { PageMotion } from "@/components/page-motion";
import { WorkReel } from "@/components/work-reel";
import { SessionLog } from "@/components/session-log";
import { SessionReplay } from "@/components/session-replay";
import { SocialLinks } from "@/components/social-links";
import direction from "@/components/portfolio-direction.module.css";
import { DOORS, SCHOOL } from "@/content/site";

export default function Home() {
  return (
    <>
      <PortfolioOpening />
      <WorkReel />
      <CareerStory />
      <MarketingApproach />
      <div className={direction.continuation}>
      {/* 5. THE LAB */}
      <section id="lab" className="labwrap" data-section="lab">
        <div className="lab-inner">
          <div className="section-head" data-reveal>
            <h2>The lab</h2>
            <p className="hand">working tools for real growth questions</p>
          </div>
          <p className="lab-lede" data-reveal>
            A workshop of growth marketing experiments: analytics, paid media, retention and conversion tools I built
            to answer the questions a growth team asks every week. Each one runs on clearly labelled synthetic data, and
            every recommendation shows the numbers it rests on.
          </p>
          <Lab />
          <details className={direction.sessionDisclosure}>
            <summary>This visit, as a measurement experiment</summary>
            <SessionLog />
            <p>A personal build. Events stay in this browser session and are also pushed to a local data layer. No analytics service receives them.</p>
          </details>
        </div>
      </section>

      {/* 7. ABOUT */}
      <section id="about" className="section about" data-section="about">
        <div className="about-photo" data-reveal>
          <div className="about-frame" data-clip>
            <Image
              src="/img/abhishek-street.jpg"
              alt="Abhishek smiling on a street, in a navy blazer and sunglasses"
              width={660}
              height={881}
              sizes="(min-width: 60rem) 26rem, 80vw"
              data-parallax-img
            />
          </div>
          <AboutStickers />
          <p className="hand">out and about in Bengaluru</p>
        </div>
        <div className="about-copy" data-reveal>
          <Lines as="h2">I came to marketing through the customer.</Lines>
          <p>
            Before a funnel was something I measured, it was a conversation I was part of. B2B sales at Ramco,
            customer retention at Foundever and sales and e-commerce at Sofa.com gave me different views of
            the same decision: why someone buys, hesitates or stays.
          </p>
          <p>
            Website and acquisition work for Burl Concepts, and growth, demand generation and product marketing
            at SecurEyes, brought those questions into campaigns and digital experiences. Learning to build
            expanded what I could do with an idea: make the page, instrument the journey, or put a prototype
            in front of someone.
          </p>
          <p>
            I&rsquo;m based in Bengaluru. I use AI-assisted tools as part of that practice, and I&rsquo;m
            interested in experiments that make marketing work more useful, understandable or measurable.
          </p>
          <p>
            I completed the Google Ads and Google Analytics certifications in 2024, and I&rsquo;m open to remote
            and international roles.
          </p>
          <h3>Where I studied</h3>
          <ol className="school">
            {SCHOOL.map((s) => (
              <li key={s.years}>
                <span>{s.years}</span>
                <div>
                  <strong>{s.what}</strong>
                  <br />
                  {s.where}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="contact" data-section="contact" data-world-enter="block">
        <Lines as="h2">Let&rsquo;s work on what happens next.</Lines>
        <svg className="swash" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path data-draw d="M3 14 C 70 2, 120 24, 200 12 S 330 4, 397 14" /></svg>
        <SessionReplay />
        <p data-reveal>
          Pick the one that fits and the email will start in the right place. A real person, me, replies.
        </p>
        <div className="doors" data-reveal>
          {DOORS.map((d) => (
            <a key={d.key} href={d.href} className="door" data-track={`door_${d.key}`} data-burst>
              <strong>{d.title}</strong>
              <span>{d.text}</span>
              <em>
                Start an email <span aria-hidden="true">→</span>
              </em>
            </a>
          ))}
        </div>
        <p className="socials-lede" data-reveal>Or find me here.</p>
        <SocialLinks />
      </section>
      </div>
      <PageMotion />
    </>
  );
}
