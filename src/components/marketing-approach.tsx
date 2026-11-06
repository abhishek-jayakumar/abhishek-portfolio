import { ApproachJourney } from "./approach-journey";
import { ClickInvestigation } from "./click-investigation";
import { Lines } from "./lines";
import s from "./portfolio-direction.module.css";
import notes from "./field-notes.module.css";

export function MarketingApproach() {
  return (
    <section id="pov" className={s.approach} data-section="point-of-view" data-world-enter="section" aria-labelledby="approach-heading">
      <div className={s.approachInner}>
        <div className={s.approachIntro}><p className={s.caption}>How I approach the work</p><Lines as="h2" id="approach-heading">The handoffs<br />are where I look.</Lines><p>An audience becomes a message. A message earns a click. A page turns that interest into a next step. I’m interested in how those pieces connect.</p></div>
      </div>
      <ApproachJourney />
      <div className={s.approachInner}>
        <details className={s.investigationDisclosure}>
          <summary><span>Follow a question after the click</span><span aria-hidden="true">+</span></summary>
          <div className={`${notes.notebook} ${notes.pov}`}><p className={s.investigationIntro}>Six stages, real examples and the limits of the evidence. These examples come from different projects; they are not one attributed funnel.</p><ClickInvestigation /></div>
        </details>
      </div>
    </section>
  );
}
