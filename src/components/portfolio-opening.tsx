import { CareerRoute } from "./career-route";
import { FieldOfView } from "./field-of-view";
import { GrowthHero } from "./growth-hero";
import hero from "./career-route.module.css";

/** The first screen: name, one line, and the way to the work. */
export function PortfolioOpening() {
  return <GrowthHero />;
}

/** The career story, after the work: the route map, the practice in a line, then each seat. */
export function CareerStory() {
  return (
    <>
      <CareerRoute />
      <div className={hero.practice}>
        <p>Sales taught me to listen. Retention taught me to look beyond the first conversion. Marketing gave me the tools to connect the journey.</p>
        <div><span>My practice</span><p>Think commercially. <span>Create deliberately.</span> Measure what matters. <span>Build the next idea.</span></p></div>
      </div>
      <FieldOfView />
    </>
  );
}
