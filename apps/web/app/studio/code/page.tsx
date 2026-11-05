import { SiteNav } from '../../components/SiteNav';

// Rend le statut actuel de l’interface Code sans simuler une génération.
export default function CodeStudioPage() {
  return (
    <div className="page">
      <SiteNav />
      <main className="page-main container">
        <section className="panel">
          <div className="eyebrow">Code Studio</div>
          <h1>Du code <span>lisible</span>.</h1>
          <div className="notice">Le studio Code dédié n’est pas activé dans cette version. Certaines questions de code peuvent être posées dans le Chat, selon la disponibilité du service.</div>
        </section>
      </main>
    </div>
  );
}
