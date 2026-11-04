import { SiteNav } from '../components/SiteNav';

export default function SettingsPage() { return <div className="page"><SiteNav /><main className="page-main container"><div className="eyebrow">Compte et sécurité</div><h1>Mes <span>paramètres</span>.</h1><div className="panel"><h3>Préférences personnelles</h3><p>Tes préférences et tes sessions sont enregistrées de façon sécurisée. Aucune clé secrète n’est stockée dans le navigateur.</p><div className="notice">La gestion des sessions, la suppression du compte et les organisations arrivent bientôt.</div></div></main></div>; }
