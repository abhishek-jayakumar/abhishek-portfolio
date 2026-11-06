import { CareerRoute } from "./career-route";
import { FieldOfView } from "./field-of-view";
import { GrowthHero } from "./growth-hero";
import hero from "./career-route.module.css";

export function PortfolioOpening() {
  return (
    <>
      <GrowthHero />
      <CareerRoute />
      <div className={hero.practice}>
        <p>Sales taught me to listen. Retention taught me to look beyond the first conversion. Marketing gave me the tools to connect the journey.</p>
        <div><span>My practice</span><p>Think commercially. <span>Create deliberately.</span> Measure what matters. <span>Build the next idea.</span></p></div>
      </div>
      <FieldOfView />
    </>
  );
}
