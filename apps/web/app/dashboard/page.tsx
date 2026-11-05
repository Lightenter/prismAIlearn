import Link from 'next/link';
import { ThemeToggle } from '../components/ThemeToggle';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabaseServer';

// Décrit uniquement les champs de profil réellement affichés.
type ProfileRow = { display_name: string | null; email: string | null; role: string | null };
// Décrit les montants renvoyés par la RPC de crédits liée à l’utilisateur courant.
type CreditSummaryRow = { wallet_available: number | string; daily_available: number | string; total_available: number | string; quota_date: string };
// Décrit les colonnes réellement lues dans l’historique des crédits.
type TransactionRow = { id: string; amount: number | string; type: string; created_at: string };

// Traduit les rôles connus en libellés visibles.
function planLabel(role: string | null | undefined) {
  if (role === 'premium') return 'Premium';
  if (role === 'admin') return 'Admin';
  if (role === 'user') return 'Free';
  return 'Non disponible';
}

// Traduit les types techniques de transactions en libellés compréhensibles.
const transactionLabels: Record<string, string> = {
  signup_bonus: 'Bonus de bienvenue',
  payment: 'Recharge de crédits',
  chat_usage: 'Conversation',
  image_usage: 'Création d’image',
  adjustment: 'Ajustement de crédits',
  daily_refill: 'Crédits du jour',
};

// Fournit un libellé neutre pour les types futurs ou inconnus.
function transactionLabel(type: string) {
  return transactionLabels[type] || 'Mouvement de crédits';
}

// Formate une date de transaction réelle dans la locale française.
function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(value));
}

// Rend la page privée après vérification de l’utilisateur par Supabase.
export default async function DashboardPage() {
  // Construit le client SSR qui applique les cookies de session.
  const supabase = createSupabaseServerClient();
  // Refuse le rendu privé si l’authentification n’est pas configurée.
  if (!supabase) redirect('/login?next=/dashboard');

  // Vérifie la session côté serveur avant toute lecture de données privées.
  let user;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    redirect('/login?next=/dashboard');
  }
  // Redirige les visiteurs sans identité authentifiée.
  if (!user) redirect('/login?next=/dashboard');

  // Charge les données limitées à l’utilisateur par RLS et par auth.uid().
  const [profileResult, creditSummaryResult, transactionResult] = await Promise.all([
    supabase.from('profiles').select('display_name,email,role').eq('id', user.id).maybeSingle<ProfileRow>(),
    supabase.rpc('get_my_credit_summary'),
    supabase.from('credit_transactions').select('id,amount,type,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
  ]);

  // Utilise le profil réel ou les métadonnées Auth disponibles côté serveur.
  const profile = profileResult.data;
  const fullName = profile?.display_name || String(user.user_metadata?.display_name || user.user_metadata?.full_name || '').trim();
  const firstName = fullName ? fullName.split(' ')[0] : 'PrismAI';
  // Récupère la ligne renvoyée pour l’utilisateur authentifié.
  const creditSummary = ((creditSummaryResult.data || []) as CreditSummaryRow[])[0] || null;
  const balance = creditSummary ? Number(creditSummary.total_available) : null;
  const walletAvailable = creditSummary ? Number(creditSummary.wallet_available) : null;
  const dailyAvailable = creditSummary ? Number(creditSummary.daily_available) : null;
  // N’affiche que les transactions réellement renvoyées par Supabase.
  const transactions = (transactionResult.data || []) as TransactionRow[];
  // Le schéma courant ne fournit pas de stockage de projets.
  const projectsAvailable = false;

  return (
    <div className="dashboard-page">
      {/* En-tête avec la bascule du thème et les données de compte disponibles. */}
      <header className="dashboard-header">
        <Link className="dashboard-wordmark" href="/"><span className="prism" aria-hidden="true" />PrismAI</Link>
        <p>Une IA pour tout ton travail.</p>
        <div className="dashboard-header-actions">
          <ThemeToggle />
          <span className="dashboard-top-credit">{balance === null ? 'Crédits indisponibles' : `${balance.toLocaleString('fr-FR')} crédits`}</span>
          <span className="dashboard-user-chip">{firstName}<small>{profile?.role ? planLabel(profile.role) : 'Profil'}</small></span>
        </div>
      </header>

      {/* Présente seulement les destinations réellement disponibles. */}
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <nav aria-label="Navigation du Dashboard">
            <Link className="dashboard-nav-active" href="/dashboard">⌂ <span>Accueil</span></Link>
            <Link href="/chat">▣ <span>Chat PrismAI</span></Link>
            <Link href="/studio">✦ <span>Espaces PrismAI</span></Link>
            <Link href="/how-it-works">⌕ <span>Guide de démarrage</span></Link>
            <Link href="/pricing">♕ <span>Tarifs</span></Link>
          </nav>
          <div className="dashboard-sidebar-divider" />
          <div className="dashboard-sidebar-label">Informations</div>
          <nav className="dashboard-nav-secondary" aria-label="Informations">
            <Link href="/how-it-works">Comment ça marche</Link>
            <Link href="/pricing">Offre PrismAI</Link>
          </nav>
          <div className="dashboard-upgrade">
            <span className="prism" aria-hidden="true" />
            <strong>Offre PrismAI</strong>
            <p>Consultez les tarifs. La recharge en ligne n’est pas encore disponible.</p>
            <Link className="btn btn-primary" href="/pricing">Voir les tarifs</Link>
          </div>
        </aside>

        {/* Zone principale : accès Chat, états de studios et projets. */}
        <main className="dashboard-content">
          <p className="dashboard-kicker">VOTRE TABLEAU DE BORD</p>
          <h1>Bienvenue, {firstName} <span aria-hidden="true">✦</span></h1>
          <p className="dashboard-subtitle">Prêt à explorer et avancer avec l’IA ?</p>
          <section className="dashboard-hero">
            <div>
              <h2>Votre intelligence artificielle,<br /><span>dans un espace unique.</span></h2>
              <p>Un seul espace pour rédiger, coder, résumer et traduire, selon les capacités activées.</p>
              <div className="dashboard-hero-actions">
                <Link className="btn btn-primary" href="/chat">▣ Ouvrir le Chat</Link>
                <Link className="btn btn-quiet" href="/studio">▷ Voir les espaces</Link>
              </div>
            </div>
            <div className="dashboard-hero-prism" aria-hidden="true"><div className="dashboard-hero-glow" /><div className="dashboard-hero-shape" /></div>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-heading"><h2>ϟ Accès rapide</h2><Link href="/studio">Tous les espaces →</Link></div>
            <div className="dashboard-studio-grid">
              <Link className="dashboard-studio-card studio-chat" href="/chat"><b>▣</b><strong>Chat PrismAI</strong><span>Selon la disponibilité du service</span><i>→</i></Link>
              <Link className="dashboard-studio-card studio-image" href="/studio/image"><b>▧</b><strong>Image Studio</strong><span>Indisponible dans cette version</span><i>→</i></Link>
              <Link className="dashboard-studio-card studio-video" href="/studio/video"><b>◫</b><strong>Vidéo Studio</strong><span>Indisponible dans cette version</span><i>→</i></Link>
              <Link className="dashboard-studio-card studio-code" href="/studio/code"><b>&lt;/&gt;</b><strong>Code Studio</strong><span>Interface dédiée indisponible</span><i>→</i></Link>
              <Link className="dashboard-studio-card studio-document" href="/studio/document"><b>▤</b><strong>Document AI</strong><span>Indisponible dans cette version</span><i>→</i></Link>
              <Link className="dashboard-studio-card studio-search" href="/how-it-works"><b>⌕</b><strong>Guide</strong><span>Découvrir le fonctionnement</span><i>→</i></Link>
            </div>
          </section>

          <section className="dashboard-section" id="projets">
            <div className="dashboard-section-heading"><h2>□ Vos projets</h2>{projectsAvailable && <Link href="/dashboard">Tout voir →</Link>}</div>
            {projectsAvailable ? <div /> : <div className="dashboard-empty">La création et la sauvegarde de projets ne sont pas activées dans cette version. Vos conversations restent accessibles depuis le Chat.</div>}
          </section>
        </main>

        {/* Colonne latérale alimentée par les données réelles du compte. */}
        <aside className="dashboard-right">
          <section className="dashboard-info-card credit-card">
            <span className="dashboard-info-icon">◆</span>
            <p>Crédits disponibles</p>
            <strong>{balance === null ? 'Non disponible' : `${balance.toLocaleString('fr-FR')} crédits`}</strong>
            {balance !== null && <small className="dashboard-credit-breakdown">Portefeuille permanent : {walletAvailable?.toLocaleString('fr-FR')} · Quota du jour : {dailyAvailable?.toLocaleString('fr-FR')}</small>}
            <Link className="btn btn-primary" href="/pricing">Voir les tarifs</Link>
          </section>
          <section className="dashboard-info-card">
            <span className="dashboard-info-icon gold">♕</span>
            <p>Plan actuel</p>
            <strong>{planLabel(profile?.role)}</strong>
            <Link className="dashboard-outline-button" href="/pricing">Voir les détails <span>›</span></Link>
          </section>
          <section className="dashboard-info-card">
            <h3>Utilisation récente</h3>
            {transactions.length === 0 ? <p className="dashboard-muted">Aucune utilisation enregistrée.</p> : <ul className="dashboard-activity">{transactions.map((transaction) => <li key={transaction.id}><span>{transactionLabel(transaction.type)}</span><small>{transaction.amount} crédits · {formatDate(transaction.created_at)}</small></li>)}</ul>}
          </section>
          <section className="dashboard-info-card dashboard-help">
            <span className="dashboard-help-icon" aria-hidden="true">?</span>
            <h3>Besoin d’aide ?</h3>
            <p>Consultez le guide de démarrage de PrismAI.</p>
            <Link href="/how-it-works">Voir le guide →</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
