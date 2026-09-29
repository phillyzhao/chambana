import { PageIntro } from "@/components/ui";

export const metadata = { title: "About" };
export default function About() {
  return (
    <div className="narrow">
      <PageIntro
        eyebrow="ABOUT CHAMBANA"
        title="A little more campus, together."
      />
      <section id="team" className="panel about-section">
        <h2>Team</h2>
        <p>Marcos Monroe — Co-Founder</p>
        <p>Phillip Zhao — Co-Founder</p>
      </section>
      <section id="origin" className="panel about-section">
        <h2>Origin</h2>
        <p>The story behind Chambana is coming soon.</p>
      </section>
      <section id="mission" className="panel about-section">
        <h2>Mission</h2>
        <p>
          Small adventures. Shared missions. A little more campus, together.
        </p>
      </section>
    </div>
  );
}
