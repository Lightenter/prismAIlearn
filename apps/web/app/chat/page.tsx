// Importe le composant de navigation partagé.
import { SiteNav } from '../components/SiteNav';
// Rend l’espace chat en indiquant son état d’intégration.
export default function ChatPage() { return <div className="page"><SiteNav /><main className="page-main container"><div className="panel"><div className="eyebrow">Texte Arena</div><h1>Une conversation qui <span>avance</span>.</h1><p>Le flux SSE, les crédits réservables et le fallback provider sont prêts côté serveur.</p><div className="notice">Connecte Supabase et au moins un provider IA pour lancer un run réel.</div></div></main></div>; }
