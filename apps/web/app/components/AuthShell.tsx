// Importe Link pour la flèche retour et les liens secondaires sans rechargement.
import Link from 'next/link';
// Importe le type ReactNode sans embarquer de code runtime inutile.
import type { ReactNode } from 'react';
// Importe la bascule clair/sombre.
import { ThemeToggle } from './ThemeToggle';

// Décrit les propriétés du shell partagé des pages Auth.
type AuthShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  variant?: 'login' | 'signup';
  // Page d’origine autorisée pour la flèche retour (ex. /pricing).
  backHref?: string;
  // Libellé accessible décrivant la destination réelle du retour.
  backLabel?: string;
};

// Message d’accueil du panneau de marque, adapté à la connexion ou à l’inscription.
const welcome = {
  login: { title: <>Content de te <span>revoir</span></>, copy: <>Connecte-toi pour retrouver<br />tes conversations et tes crédits.</> },
  signup: { title: <>Bienvenue sur <span>PrismAI</span></>, copy: <>Crée ton compte en une minute.<br />300 crédits t’attendent pour commencer.</> },
};

// Rend la structure commune aux écrans de connexion et d’inscription.
export function AuthShell({ children, eyebrow, title, description, variant = 'login', backHref = '/', backLabel = 'Retour à la landing' }: AuthShellProps) {
  return (
    <div className="auth-page">
      {/* Retour discret vers la page d’origine (tarifs, landing…), sans barre de navigation marketing. */}
      <div className="auth-top container"><Link className="auth-back" href={backHref} aria-label={backLabel}>←</Link><ThemeToggle /></div>
      {/* Carte principale en deux colonnes sur desktop et une colonne sur mobile. */}
      <main className="auth-main container">
        {/* Bloc de marque et d’accueil inspiré de la maquette fournie. */}
        <section className="auth-visual" aria-label="Présentation PrismAI">
          <Link className="auth-brand" href="/"><span className="prism" aria-hidden="true" />PrismAI</Link>
          <p className="auth-visual-slogan">Une IA pour tout ton travail.</p>
          <div className="auth-prism-art" aria-hidden="true"><div className="auth-prism-glow" /><div className="auth-prism-shape" /><span className="auth-spark spark-one" /><span className="auth-spark spark-two" /><span className="auth-spark spark-three" /></div>
          <h1>{welcome[variant].title}</h1>
          <p className="auth-visual-copy">{welcome[variant].copy}</p>
        </section>
        {/* Panneau de formulaire dont la largeur reste identique entre login et signup. */}
        <section className="auth-form-panel">
          <div className="auth-heading"><div className="eyebrow neon-eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div>
          {children}
        </section>
      </main>
      {/* Footer volontairement réduit aux mentions légales demandées. */}
      <footer className="auth-footer"><Link href="/">PrismAI</Link><span>Mentions légales à publier</span><span>© 2026 PrismAI</span></footer>
    </div>
  );
}
