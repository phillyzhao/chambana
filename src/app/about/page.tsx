import { PageIntro } from "@/components/ui";

export const metadata = { title: "About" };
export default function About() {
  return (
    <div className="narrow">
      <PageIntro eyebrow="ABOUT CHAMBANA" title="Connected, together" />
      <section id="team" className="panel about-section">
        <h2>Team</h2>
        <p>Phillip Zhao — Co-Founder</p>
        <p>Marcos Monroe — Co-Founder</p>
      </section>
      <section id="origin" className="panel about-section">
        <h2>Origin</h2>
        <p>
          Chambana aims to connect classes, RSOs, and other groups through fun
          activities when meetings aren't happening. Stay connected with the
          people you care about.
        </p>
      </section>
      <section id="faq" className="panel about-section">
        <h2>FAQ</h2>
      </section>
    </div>
  );
}
