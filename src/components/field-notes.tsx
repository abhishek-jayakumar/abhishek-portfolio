import Image from "next/image";
import Link from "next/link";
import { DotGrid } from "./dot-grid";
import { ClickInvestigation } from "./click-investigation";
import s from "./field-notes.module.css";

/** Two-section prototype; the remaining homepage is unchanged. */
export function FieldNotes() {
  return (
    <div className={s.notebook}>
      <section className={s.opening} aria-labelledby="notebook-name" data-section="hero">
        <div className={s.masthead}><span>A personal collection of work &amp; questions</span><span>Bengaluru, India</span></div>
        <h1 id="notebook-name" className={s.name}>Abhishek <span>Jayakumar.</span></h1>
        <div className={s.disciplines}><p>Marketing / creative / data / building</p><span>Always something in progress.</span></div>
        <div className={s.desk}>
          <aside className={s.author}>
            <figure className={s.portrait}>
              <Image src="/img/abhishek-street.jpg" alt="Abhishek smiling on a street, in a navy blazer and sunglasses" width={660} height={881} sizes="(min-width: 800px) 210px, 140px" loading="eager" />
              <figcaption>Usually asking one more question.</figcaption>
            </figure>
            <p>I work in growth marketing. But my curiosity rarely stays inside the ad account.</p>
            <p>I make the page, explore the data, try the idea. AI is part of my workshop; deciding what is useful is still my job.</p>
            <a href="#pov" className={s.textLink} data-track="hero_follow_question">Follow my thinking <span aria-hidden="true">↘</span></a>
          </aside>
          <div className={s.investigation}>
            <h2>The click is where<br />I get curious.</h2>
            <p className={s.marginNote}>an enquiry isn’t the end of the story</p>
            <div className={s.evidenceTrail}>
              <svg className={s.thread} viewBox="0 0 800 400" preserveAspectRatio="none" aria-hidden="true"><path d="M 15 95 C 160 30 295 45 345 150 S 470 360 650 310 L 760 345" /><path d="m 747 330 13 15 -20 4" /></svg>
              <div className={s.campaignSlip}>
                <p className={s.documentLabel}>From an education campaign</p>
                <p className={s.capacity}><strong>50</strong> seats.<br /><strong>1,000+</strong> enquiries.</p>
                <DotGrid label="1,000 dots representing minimum reported enquiries, with 50 highlighted for available seats" />
                <Link href="/work/cscp">Campaign context <span aria-hidden="true">↗</span></Link>
              </div>
              <div className={s.pageFragment}>
                <p className={s.fragmentTop}><span>Another way into the conversation</span><span aria-hidden="true">↗</span></p>
                <p className={s.documentLabel}>Career discovery · question excerpt</p>
                <h3>Why are you interested in cybersecurity?</h3>
                <p className={s.answer}><span aria-hidden="true">○</span> I enjoy technology and problem-solving</p>
                <p className={s.answer}><span aria-hidden="true">○</span> I want to protect organizations from threats</p>
                <p className={s.fragmentFoot}>Give someone something useful before asking for their details.</p>
              </div>
              <a href="#pov" className={s.followThread} data-track="hero_follow_click">What happens after? <span aria-hidden="true">↓</span></a>
            </div>
            <p className={s.trailCaption}>Two pieces of real work. One recurring question: what makes the next step worthwhile?</p>
          </div>
        </div>
      </section>
      <section id="pov" className={s.pov} aria-labelledby="pov-heading" data-section="point-of-view">
        <div className={s.povInner}>
          <div className={s.povHeading}>
            <p className={s.sectionNote}>Following the click</p>
            <h2 id="pov-heading">I don’t stop<br />at the campaign.</h2>
            <p>I want to understand what happens after the click. Follow a stage to see the question, the work, and where I still need an answer.</p>
          </div>
          <ClickInvestigation />
          <div className={s.povEnd}><p className={s.endNote}>Then the answer becomes the next question.</p><a href="#work" className={s.textLink}>See the work behind these notes <span aria-hidden="true">↗</span></a></div>
        </div>
      </section>
    </div>
  );
}
