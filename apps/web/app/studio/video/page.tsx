import { SiteNav } from '../../components/SiteNav';

// Rend le statut actuel de Video Studio sans simuler une génération.
export default function VideoStudioPage() {
  return (
    <div className="page">
      <SiteNav />
      <main className="page-main container">
        <section className="panel">
          <div className="eyebrow">Video Studio</div>
          <h1>Des tâches longues, un <span>statut clair</span>.</h1>
          <div className="notice">La génération vidéo n’est pas activée dans cette version de PrismAI.</div>
        </section>
      </main>
    </div>
  );
}
