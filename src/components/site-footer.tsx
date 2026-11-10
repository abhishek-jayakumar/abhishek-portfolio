import { SocialLinks } from "@/components/social-links";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>Abhishek Jayakumar. Growth marketing, experimentation and things I build, from Bengaluru.</p>
      <SocialLinks />
      <p className="hand">thanks for scrolling all the way down</p>
    </footer>
  );
}
