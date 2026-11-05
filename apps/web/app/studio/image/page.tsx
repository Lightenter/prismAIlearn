import { SiteNav } from '../../components/SiteNav';

// Rend le statut actuel d’Image Studio sans simuler de résultat.
export default function ImageStudioPage() {
  return (
    <div className="page">
      <SiteNav />
      <main className="page-main container">
        <section className="panel">
          <div className="eyebrow">Image Studio</div>
          <h1>Une image commence par une <span>intention</span>.</h1>
          <div className="notice">La génération d’images n’est pas activée dans cette version de PrismAI.</div>
        </section>
      </main>
    </div>
  );
}
