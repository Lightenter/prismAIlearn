import Link from 'next/link';
import { Footer } from './components/Footer';
import { SiteNav } from './components/SiteNav';

export default function HomePage() {
  return <div className="page"><SiteNav /><main>
    <section className="hero container"><div>
      <div className="eyebrow">Le copilote qui reste en mouvement</div>
      <h1>Une IA. Plusieurs chemins. Une réponse utile.</h1>
      <p className="hero-copy">prismai route ta demande vers les meilleurs modèles disponibles, sans te demander de comprendre la tuyauterie. Pour créer, apprendre et travailler avec plus de sérénité.</p>
      <div className="actions"><Link className="btn btn-primary" href="/signup">Essayer maintenant</Link><Link className="btn btn-quiet" href="/pricing">Voir l’offre à 4 900 FCFA</Link></div>
    </div><div className="halo-card"><div className="eyebrow">Réseau actif</div><div className="stat-number">4<span style={{ color: 'var(--coral)' }}>×</span></div><p>fournisseurs IA orchestrés dans un seul espace.</p><div className="status-row"><span>Groq</span><span className="status">● prêt</span></div><div className="status-row"><span>Gemini</span><span className="status">● prêt</span></div><div className="status-row"><span>OpenRouter</span><span className="status">● secours</span></div><div className="status-row"><span>Mistral</span><span className="status">● secours</span></div></div></section>
    <section className="section container"><div className="section-head"><div><div className="eyebrow">Pensé pour le quotidien</div><h2>Moins de friction.<br />Plus de travail accompli.</h2></div><p style={{ maxWidth: 320 }}>Une interface claire, des crédits lisibles et une infrastructure qui préfère résoudre plutôt que t’expliquer pourquoi elle ne peut pas.</p></div><div className="cards"><article className="card"><div className="icon-box">01</div><h3>Un seul espace</h3><p>Discute, analyse et organise tes idées sans jongler entre quatre outils.</p></article><article className="card"><div className="icon-box">02</div><h3>Un fallback réel</h3><p>Si un fournisseur ralentit, un autre prend le relais. Ton travail ne s’arrête pas.</p></article><article className="card"><div className="icon-box">03</div><h3>Un prix honnête</h3><p>10 000 crédits inclus, un solde visible et une recharge simple par Mobile Money.</p></article></div></section>
  </main><Footer /></div>;
}
