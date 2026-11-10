import Link from "next/link";
import { CV } from "@/content/site";

/** Any address that isn't a page: say so plainly, and offer the useful ways back. */
export default function NotFound() {
  return (
    <section className="lost" aria-labelledby="lost-heading">
      <p className="hand lost-note">a wrong turn</p>
      <h1 id="lost-heading">This page isn&rsquo;t here.</h1>
      <p className="lost-lede">
        The link may be old, or the address may have a typo. Everything I&rsquo;ve made is one click away.
      </p>
      <div className="lost-actions">
        <Link href="/#work" className="lost-cta">
          See the work <span aria-hidden="true">→</span>
        </Link>
        <Link href="/" className="lost-link">
          Back to the start
        </Link>
        <a href={CV.href} download={CV.file} className="lost-link">
          Download my CV
        </a>
      </div>
    </section>
  );
}
