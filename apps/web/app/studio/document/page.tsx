import { SiteNav } from '../../components/SiteNav';

// Rend le statut actuel de Document AI sans simuler une analyse.
export default function DocumentStudioPage() {
  return (
    <div className="page">
      <SiteNav />
      <main className="page-main container">
        <section className="panel">
          <div className="eyebrow">Document AI</div>
          <h1>Comprendre tes <span>documents</span>.</h1>
          <div className="notice">L’import et l’analyse de documents ne sont pas activés dans cette version de PrismAI.</div>
        </section>
      </main>
    </div>
  );
}
