"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { track } from "@/lib/track";
import { INVESTIGATION as NOTES } from "@/content/investigation";
import { DotGrid } from "./dot-grid";
import s from "./field-notes.module.css";

gsap.registerPlugin(useGSAP);

function Artifact({ kind }: { kind: (typeof NOTES)[number]["artifact"] }) {
  if (kind === "campaign") return (
    <div className={s.dotEvidence}>
      <p className={s.documentLabel}>Campaign record / capacity &amp; demand</p>
      <p className={s.bigRatio}><strong>1,000+</strong><span>enquiries</span></p>
      <DotGrid label="1,000 enquiry dots, with the first 50 highlighted to show seat capacity, not attributed conversions" />
      <div className={s.dotLegend}><span><i /> 50 available seats</span><span>1 dot = 1 enquiry</span></div>
      <p className={s.artifactNote}>A lot of attention.<br />A finite number of places.</p>
      <p className={s.artifactFoot}>Illustration of reported volume and capacity. Not a person-by-person conversion record.</p>
    </div>
  );
  if (kind === "website") return (
    <figure className={s.siteEvidence}>
      <div className={s.siteAddress}>burl.co.in <span>First website / archive capture</span></div>
      <Image src="/img/burl-site.jpg" alt="The first Burl Concepts website, with its interior design headline and Book Free Consultation button" width={1205} height={781} sizes="(min-width: 900px) 600px, 90vw" />
      <figcaption>The consultation offer is part of the page, not an afterthought.</figcaption>
    </figure>
  );
  if (kind === "quiz") return (
    <div className={s.quizEvidence}>
      <p className={s.documentLabel}>Career discovery / excerpt, not the live quiz</p>
      <span className={s.questionNumber}>04 <small>/ 15</small></span>
      <h4>Why are you interested in cybersecurity?</h4>
      <ul><li>I enjoy technology and problem-solving</li><li>I want to protect organizations from threats</li><li>High demand for jobs in the industry</li></ul>
      <p className={s.artifactNote}>Start with their curiosity.</p>
    </div>
  );
  if (kind === "event") return (
    <div className={s.eventEvidence}>
      <p className={s.documentLabel}>Measurement review / one event under the lens</p>
      <code>form_submit</code>
      <div className={s.eventLine}><span>Button pressed</span><span aria-hidden="true">↓</span><span>Request sent</span><span aria-hidden="true">↓</span><strong>Was it accepted?</strong></div>
      <p className={s.artifactNote}>This is the check I’d add.</p>
      <p className={s.artifactFoot}>Proposed: confirm the response before counting the conversion.</p>
    </div>
  );
  if (kind === "handover") return (
    <div className={s.handoverEvidence}>
      <p className={s.documentLabel}>Handover checklist / fields, not a customer record</p>
      <h4>Enough context<br />to start a conversation.</h4>
      <ul><li><span>Project type</span><em>Captured by the flow</em></li><li><span>Budget &amp; timing</span><em>Captured by the flow</em></li><li><span>Location</span><em>Captured by the flow</em></li><li><span>Sales outcome</span><em>Not linked here</em></li></ul>
      <p className={s.artifactNote}>Who picks it up from here?</p>
    </div>
  );
  return (
    <div className={s.questionEvidence}>
      <p className={s.documentLabel}>Research note / unanswered</p>
      <span className={s.openQuestion} aria-hidden="true">?</span>
      <h4>What did we promise?<br />What did they experience?</h4>
      <p>I’d bring those two answers back to the next campaign.</p>
      <p className={s.artifactNote}>Leave room for “I don’t know yet.”</p>
    </div>
  );
}

export function ClickInvestigation() {
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const interacted = useRef(false);
  const note = NOTES[index];

  useGSAP(() => {
    if (!interacted.current) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo("[data-note-artifact]", { opacity: 0.45, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
    });
    return () => mm.revert();
  }, { scope: root, dependencies: [index], revertOnUpdate: true });

  function select(next: number, focus = false) {
    interacted.current = true;
    setIndex(next);
    track("journey_stage", NOTES[next].label);
    if (focus) document.getElementById(`investigation-tab-${next}`)?.focus();
  }

  return (
    <div className={s.journey} ref={root}>
      <div className={s.journeyInstructions}><p>Follow the thread. Choose a stage.</p><span>Different projects, connected by the questions I ask.</span></div>
      <div className={s.stageTrack} role="tablist" aria-label="After the click: stages of the journey">
        {NOTES.map((item, n) => (
          <button type="button" key={item.label} role="tab" id={`investigation-tab-${n}`} aria-selected={n === index} aria-controls="investigation-panel" tabIndex={n === index ? 0 : -1} onClick={() => select(n)} onKeyDown={(e) => {
            let next: number;
            if (e.key === "ArrowRight") next = (n + 1) % NOTES.length;
            else if (e.key === "ArrowLeft") next = (n + NOTES.length - 1) % NOTES.length;
            else if (e.key === "Home") next = 0;
            else if (e.key === "End") next = NOTES.length - 1;
            else return;
            e.preventDefault();
            select(next, true);
          }}><span className={s.stageDot} aria-hidden="true" /><span>{item.label}</span></button>
        ))}
      </div>
      <div className={s.reading} id="investigation-panel" role="tabpanel" aria-labelledby={`investigation-tab-${index}`} tabIndex={0}>
        <div className={s.readingTop}><span>Field note {String(index + 1).padStart(2, "0")} / 06</span><span>{note.status}</span></div>
        <div className={s.readingBody}>
          <div className={s.artifactColumn}>
            <h3>{note.question}</h3>
            <div className={s.artifactMount} data-note-artifact><Artifact kind={note.artifact} /></div>
          </div>
          <div className={s.observations}>
            <p className={s.documentLabel}>{note.source}</p><h4>{note.title}</h4>
            <dl>
              <div><dt>{index >= 4 ? "What I would investigate" : "What I changed"}</dt><dd>{note.changed}</dd></div>
              <div><dt>What the evidence says</dt><dd>{note.evidence}</dd></div>
              <div><dt>{index >= 4 ? "What I take forward" : "What I learned"}</dt><dd>{note.learned}</dd></div>
            </dl>
            {note.slug && <Link href={`/work/${note.slug}`} className={s.textLink} data-track={`pov_evidence_${note.artifact}`}>Open the work behind this note <span aria-hidden="true">↗</span></Link>}
          </div>
        </div>
        <div className={s.readingBottom}><span aria-live="polite" aria-atomic="true">{index + 1} of 6 · {note.label}</span><button type="button" onClick={() => select((index + 1) % NOTES.length, true)}>{index === NOTES.length - 1 ? "Back to the next campaign" : `Follow it to ${NOTES[index + 1].label.toLowerCase()}`} <span aria-hidden="true">→</span></button></div>
      </div>
    </div>
  );
}
