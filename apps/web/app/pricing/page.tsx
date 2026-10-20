// Importe les composants de navigation et de pied de page.
import { SiteNav } from '../components/SiteNav';
import { Footer } from '../components/Footer';
// Rend l’offre commerciale MVP.
export default function PricingPage() { return <div className="page"><SiteNav /><main className="page-main container"><div className="panel"><div className="eyebrow">Une offre simple</div><h1>10 000 crédits pour <span>4 900 FCFA</span>.</h1><p>Recharge via Mobile Money lorsque Campay staging est activé.</p></div></main><Footer /></div>; }
