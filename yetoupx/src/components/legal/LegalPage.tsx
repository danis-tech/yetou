import Link from "next/link";
import type { ReactNode } from "react";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

interface LegalPageProps {
  title: string;
  intro: ReactNode;
  updatedAt: string;
  sections: LegalSection[];
}

/** Mise en page commune des textes juridiques (conditions, confidentialité, charte). */
export default function LegalPage({ title, intro, updatedAt, sections }: LegalPageProps) {
  return (
    <div className="legal-page">
      <header className="ctb-topbar">
        <Link href="/" className="logo">Pixia</Link>
        <nav>
          <Link href="/conditions">Conditions</Link>
          <Link href="/confidentialite">Confidentialité</Link>
          <Link href="/charte-contributeurs">Charte contributeurs</Link>
        </nav>
      </header>

      <main className="legal-main">
        <p className="legal-draft" role="note">
          Projet de texte à faire valider par un juriste avant la mise en ligne. Les éléments entre crochets
          sont à compléter.
        </p>
        <h1>{title}</h1>
        <p className="legal-updated">Dernière mise à jour : {updatedAt}</p>
        <div className="legal-intro">{intro}</div>

        <div className="legal-layout">
          <nav className="legal-toc" aria-label="Sommaire">
            <ol>
              {sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}
            </ol>
          </nav>
          <div className="legal-body">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id}>
                <h2>{i + 1}. {s.title}</h2>
                {s.body}
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
