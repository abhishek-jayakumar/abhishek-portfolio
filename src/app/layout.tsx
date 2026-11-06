import type { Metadata } from "next";
import { Caveat, Figtree, Fraunces } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SiteHeader } from "@/components/site-header";
import { Tracker } from "@/components/tracker";
import "./globals.css";

const head = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  axes: ["SOFT", "opsz"],
  display: "swap",
});

// latin-ext is included because ₹ (U+20B9) lives there.
const body = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// A handwritten accent, used in small doses, so it doesn't block the first paint.
const hand = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Abhishek Jayakumar — Growth, demand generation & product marketing",
  description:
    "Growth and performance marketing, demand generation, product GTM and digital experiences. Abhishek Jayakumar connects commercial thinking, creative, measurement and AI-assisted building. Based in Bengaluru.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${head.variable} ${body.variable} ${hand.variable}`}>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <SmoothScroll />
        <div id="smooth-wrapper">
          <div id="smooth-content">
            <main id="main">{children}</main>
            <SiteFooter />
          </div>
        </div>
        <Tracker />
      </body>
    </html>
  );
}
