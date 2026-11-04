// Importe la navigation partagée (avec la bascule clair/sombre).
import { SiteNav } from '../../components/SiteNav';
// Rend le Code Studio avec un statut explicite.
export default function CodeStudioPage() { return <div className="page"><SiteNav /><main className="page-main container"><div className="panel"><div className="eyebrow">Code Studio</div><h1>Du code <span>lisible</span>.</h1><p>Génère, explique et corrige ton code, ligne par ligne.</p></div></main></div>; }
