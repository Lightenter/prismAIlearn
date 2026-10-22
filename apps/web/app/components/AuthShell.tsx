// Importe Link pour la flèche retour et les liens secondaires sans rechargement.
import Link from 'next/link';
// Importe le type ReactNode sans embarquer de code runtime inutile.
import type { ReactNode } from 'react';

// Décrit les propriétés du shell partagé des pages Auth.
type AuthShellProps = { children: ReactNode; eyebrow: string; title: string; description: string };

// Rend la structure commune aux écrans de connexion et d’inscription.
export function AuthShell({ children, eyebrow, title, description }: AuthShellProps) {
  return (
    <div className="auth-page">
      {/* Retour discret vers la landing, sans barre de navigation marketing. */}
      <div className="auth-top container"><Link className="auth-back" href="/" aria-label="Retour à la landing">←</Link></div>
      {/* Carte principale en deux colonnes sur desktop et une colonne sur mobile. */}
      <main className="auth-main container">
        {/* Bloc de marque et d’accueil inspiré de la maquette fournie. */}
        <section className="auth-visual" aria-label="Présentation PrismAI">
          <Link className="auth-brand" href="/"><span className="prism" aria-hidden="true" />PrismAI</Link>
          <p className="auth-visual-slogan">Toutes les IA. Un seul Prisme.</p>
          <div className="auth-prism-art" aria-hidden="true"><div className="auth-prism-glow" /><div className="auth-prism-shape" /><span className="auth-spark spark-one" /><span className="auth-spark spark-two" /><span className="auth-spark spark-three" /></div>
          <h1>Bienvenue sur <span>PrismAI</span></h1>
          <p className="auth-visual-copy">Content de te revoir.<br />Connecte-toi pour retrouver ton espace IA.</p>
        </section>
        {/* Panneau de formulaire dont la largeur reste identique entre login et signup. */}
        <section className="auth-form-panel">
          <div className="auth-heading"><div className="eyebrow neon-eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div>
          {children}
        </section>
      </main>
      {/* Footer volontairement réduit aux mentions légales demandées. */}
      <footer className="auth-footer"><Link href="/">PrismAI</Link><Link href="/">Mentions légales</Link><span>© 2026 PrismAI</span></footer>
    </div>
  );
}
