// Page Tarifs PrismAI : plans, capacités par niveau et boosters de crédits permanents.
import Link from 'next/link';
import { SiteNav } from '../components/SiteNav';
import { Footer } from '../components/Footer';
import './pricing.css';

// Métadonnées publiques de la page Tarifs.
export const metadata = {
  title: 'Tarifs — PrismAI',
  description:
    'Free, Starter à 4 900 FCFA et Business à 9 900 FCFA. 100 crédits par jour offerts, ou des crédits valables 30 jours. Boosters de crédits permanents à la demande.',
};

// Décrit un plan commercial. Aucune référence à un fournisseur ni à un coût par action.
type Plan = {
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  credits: string;
  creditKind: 'daily' | 'temporary' | 'permanent';
  detail: string;
  benefits: string[];
  cta: string;
  href: string;
  featured?: boolean;
  badge?: string;
};

// Trois plans : le gratuit reste lisible sans compte payant, Starter porte l'usage individuel.
const plans: Plan[] = [
  {
    name: 'Free',
    tagline: 'Pour découvrir PrismAI au quotidien',
    price: 'Gratuit',
    priceNote: 'pour toujours',
    credits: '100 crédits / jour',
    creditKind: 'daily',
    detail: 'Renouvelés chaque jour, non cumulables',
    benefits: [
      'Niveaux Rapide et Équilibré',
      'Image Standard',
      '1 utilisateur',
      'Idéal pour un usage quotidien',
    ],
    cta: 'Commencer gratuitement',
    href: '/signup',
  },
  {
    name: 'Starter',
    tagline: 'Pour travailler sans compter chaque jour',
    price: '4 900',
    priceNote: 'FCFA',
    credits: '2 500 crédits',
    creditKind: 'temporary',
    detail: 'Valables 30 jours',
    benefits: [
      'Accès à tous les niveaux : Rapide, Équilibré, Analyse approfondie',
      '1 utilisateur',
      'Pour un usage régulier et soutenu',
    ],
    cta: 'Choisir Starter',
    href: '/signup?plan=starter',
    featured: true,
    badge: 'Le plus choisi',
  },
  {
    name: 'Business',
    tagline: 'Pour les équipes et les usages intensifs',
    price: '9 900',
    priceNote: 'FCFA',
    credits: '6 000 crédits',
    creditKind: 'temporary',
    detail: 'Valables 30 jours',
    benefits: [
      'Accès à tous les niveaux : Rapide, Équilibré, Analyse approfondie',
      '2 à 10 membres d’équipe',
      'Pour les équipes et usages intensifs',
    ],
    cta: 'Choisir Business',
    href: '/signup?plan=business',
  },
];

// Capacités par famille d'usage. Les libellés décrivent le bénéfice, jamais le modèle.
type Capability = {
  title: string;
  icon: string;
  benefit: string;
  levels: { label: string; description: string }[];
};

const capabilities: Capability[] = [
  {
    title: 'Texte',
    icon: '✎',
    benefit: 'Écrire, résumer, traduire, coder',
    levels: [
      { label: 'Rapide', description: 'Réponses très rapides' },
      { label: 'Équilibré', description: 'Bon équilibre vitesse et qualité' },
      { label: 'Analyse approfondie', description: 'Raisonnement complexe + lecture de documents PDF' },
    ],
  },
  {
    title: 'Image',
    icon: '◈',
    benefit: 'Créer une illustration ou un visuel',
    levels: [
      { label: 'Standard', description: 'Visuels nets pour un usage courant' },
      { label: 'Haute qualité', description: 'Plus de détails et de finition' },
    ],
  },
  {
    title: 'Vidéo',
    icon: '▶',
    benefit: 'Animer une idée en images',
    levels: [
      { label: 'Courte', description: 'Un plan bref pour présenter une idée' },
      { label: 'Standard', description: 'Une séquence complète et cohérente' },
      { label: 'Haute qualité', description: 'Rendu plus soigné pour une diffusion large' },
    ],
  },
  {
    title: 'Voix',
    icon: '◉',
    benefit: 'Donner une voix à un texte',
    levels: [{ label: 'Standard', description: 'Une lecture naturelle et claire' }],
  },
];

// Boosters : crédits permanents, achat limité, prix au crédit plus avantageux.
type Booster = {
  // Nombre déjà formaté (espace insécable fine pour les milliers), jamais découpé à l'affichage.
  amount: string;
  detail: string;
  cta: string;
};

const boosters: Booster[] = [
  {
    amount: '500',
    detail: 'Un complément ponctuel, sans changer de plan.',
    cta: 'Ajouter 500 crédits',
  },
  {
    amount: '1 000',
    detail: 'De la marge pour une semaine chargée.',
    cta: 'Ajouter 1 000 crédits',
  },
  {
    amount: '2 000',
    detail: 'Le meilleur rapport au crédit pour un besoin intensif.',
    cta: 'Ajouter 2 000 crédits',
  },
];

// Rend la page Tarifs complète, dans l'ordre imposé : plans, capacités, boosters.
export default function PricingPage() {
  return (
    <div className="page">
      <SiteNav />
      <main className="container">
        {/* Introduction : promesse simple, sans jargon technique. */}
        <header className="pricing-hero">
          <p className="eyebrow">Tarifs PrismAI</p>
          <h1>Choisis ton <span>prisme</span>.</h1>
          <p>
            Une IA pour écrire, créer et analyser. Commence gratuitement, puis choisis le plan qui
            suit ton rythme. Les crédits servent à toutes les générations, sans surprise.
          </p>
          <p className="pricing-hero-note">
            <span aria-hidden="true">◈</span>
            Aucune carte bancaire requise pour le plan Free
          </p>
        </header>

        {/* 1. Plans principaux */}
        <section className="pricing-plans" aria-label="Plans PrismAI">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`plan${plan.featured ? ' plan-featured' : ''}`}
              aria-labelledby={`plan-${plan.name.toLowerCase()}`}
            >
              {plan.badge ? <span className="plan-badge">{plan.badge}</span> : null}
              <h2 className="plan-name" id={`plan-${plan.name.toLowerCase()}`}>
                {plan.name}
              </h2>
              <p className="plan-tagline">{plan.tagline}</p>

              {/* Prix en évidence, unité toujours explicite. */}
              <p className="plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.priceNote}</span>
              </p>

              {/* Le type de crédit est lisible d'un coup d'œil. */}
              <span className={`credit-chip credit-${plan.creditKind}`}>
                {plan.creditKind === 'daily'
                  ? 'Crédits quotidiens'
                  : plan.creditKind === 'temporary'
                    ? 'Crédits 30 jours'
                    : 'Crédits permanents'}
              </span>

              <p className="plan-amount">
                <strong>{plan.credits}</strong> · {plan.detail}
              </p>

              <ul className="plan-list">
                {plan.benefits.map((benefit) => (
                  <li key={benefit}>{benefit}</li>
                ))}
              </ul>

              <Link
                className={`btn plan-cta${plan.featured ? ' btn-primary' : ' plan-cta-secondary'}`}
                href={plan.href}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </section>

        {/* 2. Capacités disponibles selon les niveaux */}
        <section className="pricing-capabilities" aria-labelledby="capacites-title">
          <div className="section-head">
            <h2 id="capacites-title">Ce que vous pouvez faire avec PrismAI</h2>
            <p>
              Chaque niveau correspond à un besoin, du plus rapide au plus approfondi. Choisis le
              niveau adapté à ta demande, sans rien configurer.
            </p>
          </div>

          <div className="capability-grid">
            {capabilities.map((capability) => (
              <article className="capability" key={capability.title}>
                <div className="capability-head">
                  <span className="capability-icon" aria-hidden="true">
                    {capability.icon}
                  </span>
                  <h3>{capability.title}</h3>
                </div>
                <p className="capability-benefit">{capability.benefit}</p>
                <ul className="capability-levels">
                  {capability.levels.map((level) => (
                    <li key={level.label}>
                      <strong>{level.label}</strong>
                      <span>{level.description}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          {/* Accès par plan, jamais de coût par action. */}
          <div className="capability-footnote">
            <span>
              <strong>Free</strong> : niveaux Rapide et Équilibré, Image Standard.
            </span>
            <span>
              <strong>Starter et Business</strong> : tous les niveaux, dont Analyse approfondie.
            </span>
          </div>
        </section>

        {/* 3. Boosters de crédits permanents */}
        <section className="pricing-boosters" aria-labelledby="boosters-title">
          <h2 id="boosters-title">Besoin de plus de crédits rapidement ?</h2>
          <p>
            Les boosters ajoutent des crédits permanents à ton compte. Ils s’ajoutent à ton plan et
            restent disponibles même après l’expiration de crédits temporaires.
          </p>

          <div className="booster-grid">
            {boosters.map((booster) => (
              <article className="booster" key={booster.amount}>
                <p className="booster-amount">
                  <strong>{booster.amount}</strong>
                  <span>crédits</span>
                </p>
                <p className="booster-detail">{booster.detail}</p>
                <Link className="btn plan-cta plan-cta-secondary" href="/signup?booster=1">
                  {booster.cta}
                </Link>
              </article>
            ))}
          </div>

          {/* Règles obligatoires, affichées explicitement. */}
          <ul className="booster-rules">
            <li>
              <strong>Crédits permanents</strong> : ils n’expirent pas et restent sur ton compte.
            </li>
            <li>
              <strong>Limité à 3 achats de boosters maximum par compte.</strong>
            </li>
            <li>
              <strong>Prix plus avantageux au crédit</strong> que les plans Starter et Business.
            </li>
          </ul>

          <p className="booster-fineprint">
            Les crédits d’un plan sont valables 30 jours. Les crédits du plan Free se renouvellent
            chaque jour et ne se cumulent pas. Paiement par Mobile Money, bientôt disponible.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
