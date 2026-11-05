import { SiteNav } from '../components/SiteNav';

// Présente uniquement les paramètres réellement disponibles dans cette version.
export default function SettingsPage() {
  return (
    <div className="page">
      <SiteNav />
      <main className="page-main container">
        <div className="eyebrow">Compte et sécurité</div>
        <h1>Mes <span>paramètres</span>.</h1>
        <section className="panel">
          <h2>Préférences personnelles</h2>
          <p>La gestion des préférences de compte n’est pas encore disponible dans cette version. Les clés d’API configurées pour l’application doivent rester côté serveur et ne sont pas exposées dans le navigateur.</p>
          <div className="notice">La gestion des sessions, la suppression du compte et les organisations ne sont pas activées dans cette interface.</div>
        </section>
      </main>
    </div>
  );
}
