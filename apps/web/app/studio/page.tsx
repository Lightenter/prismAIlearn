import Link from 'next/link';
import { Footer } from '../components/Footer';
import { SiteNav } from '../components/SiteNav';

const studios = [
  ['Texte Arena', 'Chat, rédaction et résumés avec streaming SSE.', '/chat', 'Disponible'],
  ['Image Studio', 'Prompts et résultats visuels via un provider configuré.', '/studio/image', 'Provider requis'],
  ['Video Studio', 'Tâches longues et progression lorsque disponible.', '/studio/video', 'Provider requis'],
  ['Code Studio', 'Génération, explication et correction de code.', '/studio/code', 'Disponible'],
  ['Document AI', 'Import, extraction et questions sur documents autorisés.', '/studio/document', 'R2 + worker requis'],
];

export default function StudioPage() { return <div className="page"><SiteNav /><main className="page-main container"><div className="eyebrow">Les cinq studios du MVP</div><h1>Choisis ton <span>prisme</span>.</h1><div className="cards">{studios.map(([name, description, href, status]) => <article className="card" key={name}><div className="icon">✦</div><h3>{name}</h3><p>{description}</p><div className="signal"><span className="signal-status">{status}</span><Link className="btn btn-ghost" href={href}>Ouvrir →</Link></div></article>)}</div></main><Footer /></div>; }
