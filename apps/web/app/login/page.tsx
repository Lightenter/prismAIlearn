import Link from 'next/link';
import { SiteNav } from '../components/SiteNav';

export default function LoginPage() { return <div className="page"><SiteNav /><main className="page-main container"><div className="panel"><div className="eyebrow">Bon retour</div><h2>Retrouve ton espace.</h2><form className="form"><label>Email<input type="email" placeholder="toi@exemple.com" /></label><label>Mot de passe<input type="password" placeholder="••••••••" /></label><button className="btn btn-primary" type="button">Se connecter</button></form><p>Pas encore de compte ? <Link href="/signup" style={{ color: 'var(--coral-dark)', fontWeight: 700 }}>Créer un compte</Link></p></div></main></div>; }
