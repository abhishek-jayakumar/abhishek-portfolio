import { gsap } from "@/lib/gsap-plugins";

/**
 * A small shower of sun-coloured dots from where a main call to action was pressed.
 * Physics2D throws them, PhysicsProps spins them, an expoScale ease shrinks them so the
 * fade reads as even. Feedback for a press, over in about a second and a half.
 */
export function burst(x: number, y: number) {
  const colours = ["var(--sun)", "var(--clay)", "var(--sage)"];
  const dots = Array.from({ length: 18 }, (_, i) => {
    const d = document.createElement("span");
    const size = 8 + (i % 4) * 3;
    Object.assign(d.style, {
      position: "fixed",
      left: `${x}px`,
      top: `${y}px`,
      width: `${size}px`,
      height: `${size}px`,
      marginLeft: `${-size / 2}px`,
      marginTop: `${-size / 2}px`,
      borderRadius: i % 3 === 0 ? "2px" : "50%",
      background: colours[i % colours.length],
      pointerEvents: "none",
      zIndex: "70",
    });
    d.setAttribute("aria-hidden", "true");
    document.body.appendChild(d);
    return d;
  });

  gsap.to(dots, {
    duration: 1.5,
    ease: "none",
    physics2D: { velocity: "random(220, 560)", angle: "random(-160, -20)", gravity: 1100 },
  });
  gsap.to(dots, {
    duration: 1.5,
    ease: "none",
    physicsProps: { rotation: { velocity: "random(-700, 700)", friction: 0.15 } },
  });
  gsap.to(dots, {
    scale: 0,
    opacity: 0,
    duration: 1.1,
    delay: 0.4,
    ease: "expoScale(1, 0.01, power2.in)",
    onComplete: () => dots.forEach((d) => d.remove()),
  });
}
