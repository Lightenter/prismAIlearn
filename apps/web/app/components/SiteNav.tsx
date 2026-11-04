// Importe le composant Link pour des navigations Next.js sans rechargement complet.
import Link from 'next/link';
// Importe la bascule clair/sombre.
import { ThemeToggle } from './ThemeToggle';

// Rend la navigation publique inspirée de la référence PrismAI.
export function SiteNav() {
  return (
    <nav className="nav container" aria-label="Navigation principale">
      {/* Wordmark et prisme lumineux de la marque. */}
      <Link className="wordmark" href="/"><span className="prism" aria-hidden="true" />PrismAI</Link>
      {/* Liens éditoriaux principaux visibles sur desktop. */}
      <div className="nav-links">
        <Link href="/">Accueil</Link>
        <Link href="/#fonctionnalites">Fonctionnalités</Link>
        <Link href="/pricing">Tarifs</Link>
        <Link href="/#fonctionnement">Comment ça marche</Link>
        <Link className="nav-login" href="/login">Se connecter</Link>
        <Link className="btn btn-primary" href="/signup">Créer mon espace</Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
