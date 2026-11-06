import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { TextPlugin } from "gsap/TextPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Flip } from "gsap/Flip";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { Observer } from "gsap/Observer";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";
import { PhysicsPropsPlugin } from "gsap/PhysicsPropsPlugin";
import { CustomEase } from "gsap/CustomEase";
import { CustomWiggle } from "gsap/CustomWiggle";
import { CustomBounce } from "gsap/CustomBounce";
import { RoughEase, SlowMo, ExpoScaleEase } from "gsap/EasePack";

/**
 * One place that registers every GSAP plugin the site uses, and defines the site's own
 * eases. Import this for its side effect (or for the named exports) from any client
 * component that animates.
 *
 * Where each one earns its place:
 *   ScrollTrigger     pins, scrubs, curtains, reveals
 *   ScrollSmoother    eased, inertial page scroll (fine pointers only)
 *   ScrollToPlugin    anchor links glide instead of jumping
 *   SplitText         headlines rise by line, hero headline
 *   ScrambleText      nav links on hover, career words, the place name in the hero
 *   TextPlugin        the hero margin note is written out
 *   DrawSVG           hand-drawn scribbles that draw themselves
 *   MorphSVG          the stage glyph in the journey changes shape per stage
 *   MotionPath        a sun dot that travels a curve as the hero scrolls away
 *   Flip              the career marker travels between perspectives
 *   Draggable+Inertia the stickers on the About photo can be thrown
 *   Observer          the hero leans toward the pointer
 *   Physics2D         a small burst of dots when a main call to action is pressed
 *   PhysicsProps      spin and fade on those dots
 *   CustomEase        "sunrise", the site's signature ease
 *   CustomBounce      stickers drop in and squash
 *   CustomWiggle      stickers wiggle to say "pick me up"
 *   EasePack          rough (pickup shake), slow (settle), expoScale (burst dots)
 *
 * Not registered: EaselPlugin and PixiPlugin, which only bridge to the EaselJS and PixiJS
 * libraries (not used here). MotionPathHelper and GSDevTools are editing tools, loaded on
 * demand in development only (see loadDevTools).
 */
gsap.registerPlugin(
  useGSAP,
  ScrollTrigger,
  ScrollSmoother,
  ScrollToPlugin,
  SplitText,
  ScrambleTextPlugin,
  TextPlugin,
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  Flip,
  Draggable,
  InertiaPlugin,
  Observer,
  Physics2DPlugin,
  PhysicsPropsPlugin,
  CustomEase,
  CustomWiggle,
  CustomBounce,
  RoughEase,
  SlowMo,
  ExpoScaleEase,
);

if (typeof window !== "undefined" && !CustomEase.get("sunrise")) {
  // A long, soft landing: fast out of the blocks, then a slow settle.
  CustomEase.create("sunrise", "M0,0 C0.16,1 0.3,1 1,1");
  CustomWiggle.create("wiggle", { wiggles: 6, type: "easeOut" });
  CustomBounce.create("drop", { strength: 0.55, squash: 2.2, squashID: "drop-squash" });
}

/** Development-only editors: ?motionpath drags the hero curve, ?gsdev scrubs the hero timeline. */
export async function loadDevTools(opts: { dot?: Element | null; path?: Element | null; timeline?: gsap.core.Timeline }) {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;
  const q = new URLSearchParams(window.location.search);
  if (q.has("motionpath") && opts.dot && opts.path) {
    const { MotionPathHelper } = await import("gsap/MotionPathHelper");
    gsap.registerPlugin(MotionPathHelper);
    MotionPathHelper.create(opts.dot, { path: opts.path as SVGPathElement });
  }
  if (q.has("gsdev") && opts.timeline) {
    const { GSDevTools } = await import("gsap/GSDevTools");
    gsap.registerPlugin(GSDevTools);
    GSDevTools.create({ animation: opts.timeline });
  }
}

export {
  gsap,
  useGSAP,
  ScrollTrigger,
  ScrollSmoother,
  ScrollToPlugin,
  SplitText,
  Flip,
  Draggable,
  Observer,
  MorphSVGPlugin,
};
