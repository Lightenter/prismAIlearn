import Link from 'next/link';
import { SiteNav } from '../components/SiteNav';

export default function SignupPage() { return <div className="page"><SiteNav /><main className="page-main container"><div className="panel"><div className="eyebrow">Commencer simplement</div><h2>10 000 crédits pour démarrer.</h2><p>Crée ton espace, puis garde le contrôle de ton solde à chaque réponse.</p><form className="form"><label>Email<input type="email" placeholder="toi@exemple.com" /></label><label>Mot de passe<input type="password" placeholder="8 caractères minimum" /></label><button className="btn btn-primary" type="button">Créer mon espace</button></form><p>Déjà inscrit ? <Link href="/login" style={{ color: 'var(--coral-dark)', fontWeight: 700 }}>Se connecter</Link></p></div></main></div>; }
