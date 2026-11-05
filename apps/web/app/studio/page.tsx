import Link from 'next/link';
import { Footer } from '../components/Footer';
import { SiteNav } from '../components/SiteNav';

// Décrit le statut réel des studios sans promettre une capacité inactive.
const studios = [
  ['Texte Arena', 'Chat textuel privé après connexion, selon la disponibilité du service.', '/chat', 'Connexion requise'],
  ['Image Studio', 'La génération d’images n’est pas activée dans cette version.', '/studio/image', 'Indisponible'],
  ['Video Studio', 'La génération vidéo n’est pas activée dans cette version.', '/studio/video', 'Indisponible'],
  ['Code Studio', 'Aucune interface Code dédiée n’est activée dans cette version.', '/studio/code', 'Indisponible'],
  ['Document AI', 'L’import et l’analyse de documents ne sont pas activés dans cette version.', '/studio/document', 'Indisponible'],
];

// Rend le catalogue des studios avec leurs états explicites.
export default function StudioPage() {
  return (
    <div className="page">
      <SiteNav />
      <main className="page-main container">
        <div className="eyebrow">Les espaces PrismAI</div>
        <h1>Choisis ton <span>prisme</span>.</h1>
        <div className="cards">
          {studios.map(([name, description, href, status]) => (
            <article className="card" key={name}>
              <div className="icon" aria-hidden="true">✦</div>
              <h2>{name}</h2>
              <p>{description}</p>
              <div className="signal">
                <span className="signal-status">{status}</span>
                <Link className="btn btn-ghost" href={href}>Ouvrir →</Link>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
