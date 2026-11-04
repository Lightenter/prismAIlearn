import Link from 'next/link';
import { Footer } from '../components/Footer';
import { SiteNav } from '../components/SiteNav';

const studios = [
  ['Texte Arena', 'Chat, rédaction et résumés, réponse affichée en direct.', '/chat', 'Disponible'],
  ['Image Studio', 'Décris une idée, PrismAI la met en image.', '/studio/image', 'Bientôt disponible'],
  ['Video Studio', 'Des vidéos courtes générées à partir de ta description.', '/studio/video', 'Bientôt disponible'],
  ['Code Studio', 'Génération, explication et correction de code.', '/studio/code', 'Disponible'],
  ['Document AI', 'Importe un document et pose tes questions dessus.', '/studio/document', 'Bientôt disponible'],
];

export default function StudioPage() { return <div className="page"><SiteNav /><main className="page-main container"><div className="eyebrow">Les cinq studios PrismAI</div><h1>Choisis ton <span>prisme</span>.</h1><div className="cards">{studios.map(([name, description, href, status]) => <article className="card" key={name}><div className="icon">✦</div><h3>{name}</h3><p>{description}</p><div className="signal"><span className="signal-status">{status}</span><Link className="btn btn-ghost" href={href}>Ouvrir →</Link></div></article>)}</div></main><Footer /></div>; }
