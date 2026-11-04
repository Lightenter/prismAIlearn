// Importe la navigation partagée (avec la bascule clair/sombre).
import { SiteNav } from '../../components/SiteNav';
// Rend le studio vidéo avec une indisponibilité explicite.
export default function VideoStudioPage() { return <div className="page"><SiteNav /><main className="page-main container"><div className="panel"><div className="eyebrow">Video Studio</div><h1>Des tâches longues, un <span>statut clair</span>.</h1><div className="notice">La génération vidéo arrive bientôt dans PrismAI.</div></div></main></div>; }
