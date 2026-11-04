// Importe la navigation partagée (avec la bascule clair/sombre).
import { SiteNav } from '../../components/SiteNav';
// Rend le studio documentaire sans simuler un provider absent.
export default function DocumentStudioPage() { return <div className="page"><SiteNav /><main className="page-main container"><div className="panel"><div className="eyebrow">Document AI</div><h1>Comprendre tes <span>documents</span>.</h1><div className="notice">L’analyse de documents arrive bientôt dans PrismAI.</div></div></main></div>; }
