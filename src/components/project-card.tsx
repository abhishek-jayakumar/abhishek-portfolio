import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/content/projects";
import { DotGrid } from "./dot-grid";

/** Each card gets its own picture, built from the real work, not a stock thumbnail. */
function Visual({ p }: { p: Project }) {
  switch (p.slug) {
    case "cscp":
      return (
        <div className="v v-dots">
          <DotGrid label="1,000 dots for 1,000 enquiries; the top row of 50 is the 50 seats" />
          <p className="v-caption">1,000 enquiries. The top row is the 50 seats.</p>
        </div>
      );
    case "career-discovery":
      return (
        <div className="v v-quiz" aria-hidden="true">
          <p className="v-quiz-n">Question 4 of 15</p>
          <p className="v-quiz-q">Why are you interested in cybersecurity?</p>
          <span>I enjoy technology and problem-solving</span>
          <span className="on">I want to protect organizations from threats</span>
          <span>High demand for jobs in the industry</span>
        </div>
      );
    case "sastrum":
      return (
        <div className="v v-photo">
          <Image src="/img/sastrum-reveal.webp" alt="" width={1280} height={720} sizes="(min-width: 60rem) 40vw, 90vw" />
        </div>
      );
    case "foundation-day":
      return (
        <div className="v v-emblem">
          <Image src="/img/twenty-years.png" alt="" width={1086} height={664} sizes="(min-width: 60rem) 30vw, 70vw" />
        </div>
      );
    case "burl-concepts":
      return (
        <div className="v v-photo">
          <Image src="/img/burl-new-portfolio.jpg" alt="" width={1440} height={1100} sizes="(min-width: 60rem) 40vw, 90vw" />
        </div>
      );
    default:
      return (
        <div className="v v-number" aria-hidden="true">
          10<span>+</span>
        </div>
      );
  }
}

export function ProjectCard({ p, index }: { p: Project; index: number }) {
  return (
    <Link href={`/work/${p.slug}`} className={`card card-${p.tone} card-${index}`} data-reveal data-track={`work_${p.slug}`}>
      <Visual p={p} />
      <div className="card-body">
        <p className="card-kind">{p.caps.join(" · ")}</p>
        <h3>{p.problem}</h3>
        <dl className="card-facts">
          <div>
            <dt>What I did</dt>
            <dd>{p.approach}</dd>
          </div>
          <div>
            <dt>What changed</dt>
            <dd>{p.changed}</dd>
          </div>
        </dl>
        <p className="card-ctx">{p.title}</p>
        <span className="card-go">
          Read how I approached it <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
