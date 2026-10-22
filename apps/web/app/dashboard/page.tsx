// Importe Link pour les accès internes sans rechargement complet.
import Link from 'next/link';
// Importe redirect pour bloquer le rendu privé sans session vérifiée.
import { redirect } from 'next/navigation';
// Importe le client SSR qui applique les cookies et les politiques RLS.
import { createSupabaseServerClient } from '../../lib/supabaseServer';

// Décrit les champs réellement lus dans la table profiles.
type ProfileRow = { display_name: string | null; email: string | null; role: string | null };
// Décrit les champs réellement lus dans la table credits.
type CreditsRow = { balance: number | string | null };
// Décrit les champs réellement lus dans l’historique de crédits.
type TransactionRow = { id: string; amount: number | string; type: string; model_used: string | null; created_at: string };

// Traduit le rôle Supabase en libellé visible sans inventer de forfait.
function planLabel(role: string | null | undefined) {
  if (role === 'premium') return 'Premium';
  if (role === 'admin') return 'Admin';
  if (role === 'user') return 'Free';
  return 'Non disponible';
}

// Formate une date réelle sans créer d’activité artificielle.
function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(value));
}

// Rend le Dashboard privé après vérification de l’utilisateur Supabase côté serveur.
export default async function DashboardPage() {
  // Construit le client SSR sans jamais accepter une identité envoyée par le navigateur.
  const supabase = createSupabaseServerClient();
  // Redirige vers la connexion si l’authentification n’est pas configurée.
  if (!supabase) redirect('/login?next=/dashboard');
  // Vérifie la session auprès de Supabase avant toute requête de données privées.
  let user;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    redirect('/login?next=/dashboard');
  }
  // Redirige toute requête sans identité authentifiée.
  if (!user) redirect('/login?next=/dashboard');
  // Charge uniquement les lignes appartenant à l’utilisateur courant grâce à RLS.
  const [profileResult, creditsResult, transactionResult] = await Promise.all([
    supabase.from('profiles').select('display_name,email,role').eq('id', user.id).maybeSingle<ProfileRow>(),
    supabase.from('credits').select('balance').eq('user_id', user.id).maybeSingle<CreditsRow>(),
    supabase.from('credit_transactions').select('id,amount,type,model_used,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
  ]);
  // Utilise le profil réel lorsqu’il existe, sinon les métadonnées Auth connues côté serveur.
  const profile = profileResult.data;
  // Affiche un prénom personnalisé seulement s’il vient des données Auth réelles.
  const fullName = profile?.display_name || String(user.user_metadata?.display_name || user.user_metadata?.full_name || '').trim();
  // Prépare un nom lisible sans exposer l’adresse comme nom par défaut.
  const firstName = fullName ? fullName.split(' ')[0] : 'PrismAI';
  // Convertit le solde réel sans afficher zéro comme une valeur inventée en cas d’erreur.
  const balance = creditsResult.data?.balance === null || creditsResult.data?.balance === undefined ? null : Number(creditsResult.data.balance);
  // Conserve uniquement les transactions réellement renvoyées par Supabase.
  const transactions = (transactionResult.data || []) as TransactionRow[];
  // Déclare explicitement l’absence de table projects dans le schéma courant.
  const projectsAvailable = false;

  return (
    <div className="dashboard-page">
      {/* Barre supérieure inspirée de la référence fournie. */}
      <header className="dashboard-header"><Link className="dashboard-wordmark" href="/"><span className="prism" aria-hidden="true" />PrismAI</Link><p>Toutes les IA. Un seul Prisme.</p><div className="dashboard-header-actions"><span className="dashboard-bell" aria-label="Notifications">⌁</span><span className="dashboard-top-credit">{balance === null ? 'Crédits indisponibles' : `${balance.toLocaleString('fr-FR')} crédits`}</span><span className="dashboard-user-chip">{firstName}<small>{profile?.role ? planLabel(profile.role) : 'Profil'}</small></span></div></header>
      {/* Structure principale avec rail latéral, contenu et colonne d’informations. */}
      <div className="dashboard-layout">
        {/* Rail latéral aligné sur les studios de PrismAI. */}
        <aside className="dashboard-sidebar"><nav aria-label="Navigation du Dashboard"><Link className="dashboard-nav-active" href="/dashboard">⌂ <span>Accueil</span></Link><Link href="/chat">▣ <span>Chat PrismAI</span></Link><Link href="/studio/image">▧ <span>Image Studio</span></Link><Link href="/studio/video">◫ <span>Vidéo Studio</span></Link><Link href="/studio/code">&lt;/&gt; <span>Code Studio</span></Link><Link href="/studio/document">▤ <span>Document Studio</span></Link><Link href="/chat">⌕ <span>Recherche</span></Link><Link href="/chat">♧ <span>Agents &amp; Mémoire</span></Link><Link href="/dashboard">□ <span>Projets</span></Link><Link href="/dashboard">▧ <span>Fichiers</span></Link><Link href="/dashboard">◷ <span>Historique</span></Link></nav><div className="dashboard-sidebar-divider" /><div className="dashboard-sidebar-label">Outils et plus</div><Link href="/dashboard">ϟ <span>Automatisations</span></Link><Link href="/pricing">♕ <span>Version Pro</span></Link><div className="dashboard-upgrade"><span className="prism" aria-hidden="true" /><strong>Passez à la version Pro</strong><p>Plus de crédits et plus de puissance.</p><Link className="btn btn-primary" href="/pricing">Découvrir</Link></div></aside>
        {/* Zone principale avec accueil, studios rapides et projets réels ou vides. */}
        <main className="dashboard-content"><p className="dashboard-kicker">TON TABLEAU DE BORD</p><h1>Bienvenue, {firstName} <span aria-hidden="true">✦</span></h1><p className="dashboard-subtitle">Prêt à explorer, créer et avancer avec l’IA ?</p><section className="dashboard-hero"><div><h2>Votre intelligence artificielle,<br /><span>plus puissante que jamais.</span></h2><p>Un seul espace. Toutes les IA. Des outils créatifs, productifs et intelligents pour donner vie à vos idées.</p><div className="dashboard-hero-actions"><Link className="btn btn-primary" href="/chat">▣ Commencer à discuter</Link><Link className="btn btn-quiet" href="/studio">▷ Découvrir les capacités</Link></div></div><div className="dashboard-hero-prism" aria-hidden="true"><div className="dashboard-hero-glow" /><div className="dashboard-hero-shape" /></div></section><section className="dashboard-section"><div className="dashboard-section-heading"><h2>ϟ Accès rapide aux studios</h2><Link href="/studio">Tout voir →</Link></div><div className="dashboard-studio-grid"><Link className="dashboard-studio-card studio-chat" href="/chat"><b>▣</b><strong>Chat PrismAI</strong><span>Assistant IA polyvalent</span><i>→</i></Link><Link className="dashboard-studio-card studio-image" href="/studio/image"><b>▧</b><strong>Image Studio</strong><span>Créez des images uniques.</span><i>→</i></Link><Link className="dashboard-studio-card studio-video" href="/studio/video"><b>◫</b><strong>Vidéo Studio</strong><span>Générez des vidéos avec l’IA</span><i>→</i></Link><Link className="dashboard-studio-card studio-code" href="/studio/code"><b>&lt;/&gt;</b><strong>Code Studio</strong><span>Développez plus vite</span><i>→</i></Link><Link className="dashboard-studio-card studio-document" href="/studio/document"><b>▤</b><strong>Document Studio</strong><span>Analysez vos documents</span><i>→</i></Link><Link className="dashboard-studio-card studio-search" href="/chat"><b>⌕</b><strong>Recherche</strong><span>Trouvez l’information pertinente</span><i>→</i></Link></div></section><section className="dashboard-section"><div className="dashboard-section-heading"><h2>□ Vos projets récents</h2>{projectsAvailable && <Link href="/dashboard">Tout voir →</Link>}</div>{projectsAvailable ? <div /> : <div className="dashboard-empty">Aucun projet n’est encore disponible dans le backend. Crée ton premier espace depuis un studio pour le retrouver ici.</div>}</section></main>
        {/* Colonne latérale alimentée uniquement par les données RLS réellement disponibles. */}
        <aside className="dashboard-right"><section className="dashboard-info-card credit-card"><span className="dashboard-info-icon">◆</span><p>Crédits disponibles</p><strong>{balance === null ? 'Non disponible' : `${balance.toLocaleString('fr-FR')} crédits`}</strong><Link className="btn btn-primary" href="/pricing">Recharger</Link></section><section className="dashboard-info-card"><span className="dashboard-info-icon gold">♕</span><p>Plan actuel</p><strong>{planLabel(profile?.role)}</strong><Link className="dashboard-outline-button" href="/pricing">Voir les détails <span>›</span></Link></section><section className="dashboard-info-card"><h3>Utilisation récente</h3>{transactions.length === 0 ? <p className="dashboard-muted">Aucune utilisation enregistrée.</p> : <ul className="dashboard-activity">{transactions.map((transaction) => <li key={transaction.id}><span>{transaction.type}</span><small>{transaction.amount} crédits · {formatDate(transaction.created_at)}</small></li>)}</ul>}</section><section className="dashboard-info-card dashboard-help"><span className="dashboard-help-icon">?</span><h3>Besoin d’aide ?</h3><p>Consultez notre centre d’aide ou contactez notre équipe.</p><Link href="/">Accéder au centre d’aide →</Link></section></aside>
      </div>
    </div>
  );
}
