import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BurlChat } from "@/components/burl-chat";
import { CaseShell } from "@/components/case-shell";
import { MiniQuiz } from "@/components/mini-quiz";
import { PageMotion } from "@/components/page-motion";
import { SeatDial } from "@/components/seat-dial";
import { getProject, projects, type Block, type Fact, type Project } from "@/content/projects";
import s from "./case.module.css";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return {};
  return { title: `${p.problem} | Abhishek Jayakumar`, description: p.intro };
}

const slugify = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Every visible word, for an honest reading time. */
function readingMinutes(p: Project) {
  const parts = [p.intro, p.approach, p.changed, p.learned];
  p.blocks.forEach((b) => {
    parts.push(b.title, ...b.body, ...(b.list ?? []));
    b.steps?.forEach((st) => parts.push(st.title, st.text));
    b.table?.rows.forEach((r) => parts.push(...r));
  });
  const words = parts.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** A figure such as "1,000+" or "₹1.2Cr+" counts up; anything else ("60s → 30s") is shown as written. */
function Figure({ value }: { value: string }) {
  const m = value.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(\D*)$/);
  if (!m) return <>{value}</>;
  const [, pre, raw, post] = m;
  const n = Number(raw.replace(/,/g, ""));
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  const locale = /\d,\d\d,\d{3}/.test(raw) ? "en-IN" : "en-US";
  return (
    <>
      {pre}
      <span data-count={n} data-decimals={decimals} data-locale={locale} data-group={raw.includes(",")}>
        {raw}
      </span>
      {post}
    </>
  );
}

function FactItem({ f, big }: { f: Fact; big?: boolean }) {
  return (
    <>
      <strong className={big ? s.statValue : s.factValue}>
        <Figure value={f.value} />
      </strong>
      <span className={s.factLabel}>{f.label}</span>
      {f.note && <small className={s.factNote}>{f.note}</small>}
    </>
  );
}

function Chapter({ b, id }: { b: Block; id: string }) {
  return (
    <section id={id} className={`${s.chapter} ${b.wide ? s.wide : ""}`} data-chapter>
      <h2 data-rise>{b.title}</h2>
      {b.body.map((t) => (
        <p key={t}>{t}</p>
      ))}

      {b.list && (
        <ul className={s.points} data-points>
          {b.list.map((li) => (
            <li key={li}>{li}</li>
          ))}
        </ul>
      )}

      {b.steps && (
        <ol className={s.timeline} data-timeline>
          <span className={s.line} data-line aria-hidden="true" />
          {b.steps.map((st) => (
            <li key={st.title}>
              <h3>{st.title}</h3>
              <p>{st.text}</p>
            </li>
          ))}
        </ol>
      )}

      {b.table && (
        <div className={s.table} role="region" aria-label={b.title} tabIndex={0}>
          <table>
            <thead>
              <tr>
                {b.table.head.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.table.rows.map((r) => (
                <tr key={r[0]}>
                  {r.map((c, i) =>
                    i === 0 ? (
                      <th key={c} scope="row">
                        <code>{c}</code>
                      </th>
                    ) : (
                      <td key={c}>{c}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {b.image && (
        <figure className={s.fig}>
          <div className={s.frame} data-unveil>
            <Image src={b.image.src} alt={b.image.alt} width={b.image.w} height={b.image.h} sizes="(min-width: 64rem) 48rem, 92vw" />
          </div>
          {b.image.caption && <figcaption>{b.image.caption}</figcaption>}
        </figure>
      )}
    </section>
  );
}

export default async function WorkPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) notFound();

  const i = projects.findIndex((x) => x.slug === slug);
  const next = projects[(i + 1) % projects.length];

  // With no picture to lead with, the headline figure becomes the cover's exhibit.
  const hasVisual = Boolean(p.screens?.length || p.image);
  const lead = hasVisual ? null : p.facts[0];
  const strip = lead ? p.facts.slice(1) : p.facts;

  const chapters: Block[] = [...p.blocks];
  if (p.watched)
    chapters.push({
      title: "What I watched",
      body: [
        `Through the campaign I tracked ${p.watched.map((w) => w.toLowerCase()).join(", ")}. I’m not putting figures against those here because I don’t have them to hand, and I’d rather leave them out than guess.`,
      ],
    });
  const ids = chapters.map((b) => slugify(b.title));

  return (
    <CaseShell className={s.page} tone={p.tone}>
      <header className={`${s.cover} ${hasVisual ? s.hasVisual : ""}`}>
        <div className={s.coverTop}>
          <Link href="/#work" className={s.back} data-cover-in>
            <span aria-hidden="true">←</span> All work
          </Link>
          <div className={s.coverGrid}>
            <div className={s.coverText}>
              <p className={s.caps} data-cover-in>
                {p.caps.join(" / ")}
              </p>
              <h1 data-cover-title>{p.problem}</h1>
              <p className={s.sub} data-cover-in>
                {p.headline}
              </p>
            </div>
            <dl className={s.meta}>
              <div data-cover-in>
                <dt>Project</dt>
                <dd>{p.title}</dd>
              </div>
              <div data-cover-in>
                <dt>Type</dt>
                <dd>{p.kind}</dd>
              </div>
              <div data-cover-in>
                <dt>Read</dt>
                <dd>{readingMinutes(p)} min</dd>
              </div>
              {p.link && (
                <div data-cover-in>
                  <dt>Live</dt>
                  <dd>
                    <a href={p.link.href} target="_blank" rel="noopener noreferrer" className={s.live}>
                      {new URL(p.link.href).hostname} <span aria-hidden="true">↗</span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {p.screens?.length ? (
          <figure className={s.mockWrap}>
            <div className={`${s.mock} ${p.screens.length > 1 ? s.pair : ""}`} data-mock>
              {p.screens.slice(0, 2).map((sc, n) => (
                <div key={sc.src} className={n === 0 ? s.win : s.winBack} data-win={n}>
                  <div className={s.bar} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <span>{sc.url}</span>
                  </div>
                  <Image
                    src={sc.src}
                    alt={sc.alt}
                    width={sc.w}
                    height={sc.h}
                    sizes={n === 0 ? "(min-width: 64rem) 66vw, 100vw" : "(min-width: 64rem) 40vw, 60vw"}
                    priority={n === 0}
                  />
                </div>
              ))}
            </div>
            {p.screens[0].caption && <figcaption>{p.screens[0].caption}</figcaption>}
          </figure>
        ) : p.image ? (
          <figure className={s.visualWrap}>
            <div className={s.visual} data-cover-visual>
              <Image
                src={p.image.src}
                alt={p.image.alt}
                width={p.image.w}
                height={p.image.h}
                sizes="100vw"
                priority
                data-cover-media
              />
            </div>
            {p.image.caption && <figcaption>{p.image.caption}</figcaption>}
          </figure>
        ) : (
          lead && (
            <div className={s.stat}>
              <FactItem f={lead} big />
            </div>
          )
        )}
      </header>

      <section className={s.thesis} aria-label="The case in brief">
        <p className={s.intro}>{p.intro}</p>
        <div className={s.statement} data-thesis>
          <p>
            <span className={s.runIn}>How I approached it.</span> <span data-fill>{p.approach}</span>
          </p>
          <p>
            <span className={s.runIn}>What changed.</span> <span data-fill>{p.changed}</span>
          </p>
          <p>
            <span className={s.runIn}>What I learned.</span> <span data-fill>{p.learned}</span>
          </p>
        </div>
      </section>

      {strip.length > 0 && (
        <section className={s.figures} aria-label="Key figures">
          <ul>
            {strip.map((f) => (
              <li key={f.label}>
                <FactItem f={f} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.image2 && (
        <figure className={s.exhibit}>
          <div className={s.frame} data-unveil>
            <Image src={p.image2.src} alt={p.image2.alt} width={p.image2.w} height={p.image2.h} sizes="(min-width: 64rem) 66vw, 92vw" />
          </div>
          {p.image2.caption && <figcaption>{p.image2.caption}</figcaption>}
        </figure>
      )}

      <div className={s.chapters} data-chapters>
        <nav className={s.toc} data-toc aria-label="Chapters in this case">
          <p className={s.tocHead}>In this case</p>
          <div className={s.tocBody}>
            <span className={s.track} aria-hidden="true">
              <span data-toc-fill />
            </span>
            <ol>
              {chapters.map((b, n) => (
                <li key={ids[n]}>
                  <a href={`#${ids[n]}`}>{b.title}</a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
        <div className={s.read}>
          {chapters.map((b, n) => (
            <Chapter key={ids[n]} b={b} id={ids[n]} />
          ))}
        </div>
      </div>

      {p.creative && (
        <section className={`creative ${s.creative}`} aria-labelledby="creative-heading">
          <h2 id="creative-heading" data-rise>
            What I made for it
          </h2>
          {p.creative.map((g) => (
            <div key={g.title} className="creative-set">
              <h3>{g.title}</h3>
              <p>{g.body}</p>
              <div className="creative-strip" role="region" aria-label={g.title} tabIndex={0} data-points>
                {g.items.map((c) => (
                  <figure key={c.src} style={{ "--ar": c.w / c.h } as React.CSSProperties}>
                    {c.video ? (
                      <video controls muted playsInline preload="none" poster={c.src} aria-label={c.alt}>
                        <source src={c.video} type="video/mp4" />
                      </video>
                    ) : (
                      <Image src={c.src} alt={c.alt} width={c.w} height={c.h} sizes="(min-width: 60rem) 24rem, 60vw" />
                    )}
                    <figcaption>{c.caption}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {p.slug === "cscp" && (
        <section className="play">
          <h2>Try it: change the seats</h2>
          <p>
            The enquiries stay at 1,000. Drag the seats and watch the problem change shape. Only the first position
            is the real campaign.
          </p>
          <SeatDial />
        </section>
      )}

      {p.slug === "career-discovery" && (
        <section className="play play-quiz">
          <h2>Try it: three questions</h2>
          <p>A taste of the real thing, using three of its actual questions and its actual scoring.</p>
          <MiniQuiz />
        </section>
      )}

      {p.slug === "burl-concepts" && (
        <section className="play play-chat">
          <h2>Try it: the chat that qualifies a lead</h2>
          <p>
            A working recreation of the chat on the Burl Concepts site. Go through the seven steps and see the
            record the studio receives and the events it fires.
          </p>
          <BurlChat />
        </section>
      )}

      <Link href={`/work/${next.slug}`} className={s.next} data-tone={next.tone} data-track={`case_next_${next.slug}`}>
        <span className={s.nextLabel}>Next case</span>
        <span className={s.nextTitle} data-rise>
          {next.problem}
        </span>
        <span className={s.nextFoot}>
          {next.title}
          <span className={s.arrow} aria-hidden="true">
            →
          </span>
        </span>
      </Link>
      <PageMotion />
    </CaseShell>
  );
}
