// Importe la navigation partagée (avec la bascule clair/sombre).
import { SiteNav } from '../../components/SiteNav';
// Rend le studio image avec une indisponibilité explicite.
export default function ImageStudioPage() { return <div className="page"><SiteNav /><main className="page-main container"><div className="panel"><div className="eyebrow">Image Studio</div><h1>Une image commence par une <span>intention</span>.</h1><div className="notice">La génération d’images arrive bientôt dans PrismAI.</div></div></main></div>; }
