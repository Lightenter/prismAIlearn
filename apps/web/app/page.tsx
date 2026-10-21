// Importe le composant de navigation partagé.
import Link from 'next/link';
// Importe le footer public partagé.
import { Footer } from './components/Footer';
// Importe la navigation alignée sur la référence.
import { SiteNav } from './components/SiteNav';

// Décrit les trois usages mis en avant dans la section centrale.
const ideaCards = [
  { icon: '▤', title: 'Écrire', text: 'Génère tes textes.' },
  { icon: '✦', title: 'Créer', text: 'Imagine et conçois.' },
  { icon: '◈', title: 'Construire', text: 'Développe tes projets.' },
];

// Décrit les bénéfices courts affichés dans la bande de réassurance.
const benefits = ['Plusieurs IA, un espace', 'Un flux de travail simplifié', 'Une expérience unifiée', 'Un espace personnel'];

// Décrit les étapes d’entrée dans PrismAI.
const steps = [
  { number: '01', title: 'Crée ton espace' },
  { number: '02', title: 'Choisis ton usage' },
  { number: '03', title: "Passe à l’action" },
];

// Rend la landing publique inspirée de la référence dark neon fournie.
export default function HomePage() {
  return (
    <div className="page landing-page">
      <SiteNav />
      <main>
        {/* Hero : slogan, CTA et prisme lumineux comme point focal. */}
        <section className="landing-hero container">
          <div className="hero-copy-block">
            <div className="eyebrow neon-eyebrow">Une nouvelle façon d’utiliser l’IA</div>
            <h1>Toutes les <span>IA.</span><br />Un seul Prisme.</h1>
            <p className="hero-copy">Réunis tes outils d’intelligence artificielle dans un espace unique. Crée, explore et travaille plus intelligemment avec PrismAI.</p>
            <div className="actions">
              <Link className="btn btn-primary" href="/signup">Commencer gratuitement</Link>
              <Link className="btn btn-quiet" href="/chat">Découvrir PrismAI <span aria-hidden="true">→</span></Link>
            </div>
            <p className="hero-note"><span className="note-dot" aria-hidden="true" />Un compte. Un espace. De nouvelles possibilités.</p>
          </div>
          <div className="hero-art" aria-label="Prisme lumineux PrismAI" role="img">
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <div className="floating-card float-chat"><span>●●●</span><b>Converse</b><small>Une idée prend forme</small></div>
            <div className="floating-card float-code"><span>{'{ }'}</span><b>Construis</b><small>Ton prochain projet</small></div>
            <div className="floating-card float-search"><span>⌕</span><b>Explore</b><small>Plus loin, plus vite</small></div>
            <div className="prism-scene"><div className="prism-core" /><div className="prism-glow" /></div>
          </div>
        </section>

        {/* Bande de bénéfices immédiatement sous le hero. */}
        <section className="benefit-strip" aria-label="Bénéfices PrismAI">
          <div className="container benefit-grid">
            {benefits.map((benefit, index) => <div className="benefit-item" key={benefit}><span className="benefit-icon" aria-hidden="true">{['◕', '✣', '♥', '♧'][index]}</span><strong>{benefit}</strong></div>)}
          </div>
        </section>

        {/* Section usages : une idée peut devenir texte, création ou produit. */}
        <section className="section container idea-section" id="fonctionnalites">
          <div className="section-title-center"><div className="eyebrow neon-eyebrow">Un espace pour avancer</div><h2>Tout commence avec une idée.</h2><p>PrismAI t’aide à explorer différentes façons de la concrétiser.</p></div>
          <div className="idea-grid">
            {ideaCards.map((card) => <article className="idea-card" key={card.title}><div className="idea-icon" aria-hidden="true">{card.icon}</div><div><h3>{card.title}</h3><p>{card.text}</p></div><span className="card-arrow" aria-hidden="true">↗</span></article>)}
          </div>
        </section>

        {/* Section preuve : le workspace visuel remplace la dispersion des outils. */}
        <section className="section container focus-section">
          <div className="focus-copy"><div className="eyebrow neon-eyebrow">Le travail, sans la dispersion</div><h2>Moins de dispersion.<br /><span>Plus de possibilités.</span></h2><p>Un seul point de départ pour transformer une question en texte, une intuition en image ou une ambition en projet.</p><ul className="check-list"><li>Un point de départ unique</li><li>Un espace conçu pour avancer</li><li>Une expérience pour créer sans détour</li><li>Un copilote qui peut évoluer</li></ul></div>
          <div className="workspace-art" aria-hidden="true"><div className="workspace-window window-back" /><div className="workspace-window window-main"><div className="window-bar"><i /><i /><i /></div><div className="window-lines"><b /><b /><b /><b /><b /></div><div className="window-panel"><span>PrismAI</span><strong>Ton espace de création</strong><small>Tout ce qu’il te faut, au même endroit.</small></div></div><div className="workspace-badge">✦<span>un seul<br />prisme</span></div></div>
        </section>

        {/* Trois étapes simples, reprises de la structure verticale de la référence. */}
        <section className="steps-section" id="etapes">
          <div className="container"><div className="section-title-center"><div className="eyebrow neon-eyebrow">Simple par design</div><h2>Trois étapes pour commencer.</h2></div><div className="steps-grid">{steps.map((step) => <div className="step-card" key={step.number}><span>{step.number}</span><strong>{step.title}</strong><b aria-hidden="true">→</b></div>)}</div></div>
        </section>

        {/* FAQ courte sous forme d’accordéons natifs et accessibles. */}
        <section className="section container faq-section">
          <div className="section-title-center"><div className="eyebrow neon-eyebrow">Questions fréquentes</div><h2>Choisis la formule qui te correspond.</h2></div>
          <div className="faq-list"><details><summary>Qu’est-ce que PrismAI ? <span>+</span></summary><p>Un espace unique qui réunit plusieurs capacités IA pour créer, apprendre et travailler.</p></details><details><summary>Comment commencer à utiliser PrismAI ? <span>+</span></summary><p>Crée ton compte, reçois tes crédits de bienvenue et ouvre ton premier espace de chat.</p></details><details><summary>Quelles fonctionnalités sont disponibles ? <span>+</span></summary><p>Le chat, le code, la création documentaire et les studios évoluent progressivement selon les providers configurés.</p></details><details><summary>Comment fonctionnent les formules et les crédits ? <span>+</span></summary><p>Les crédits rendent chaque usage lisible ; le solde et les opérations restent contrôlés côté serveur.</p></details></div>
        </section>

        {/* CTA final avec le même halo violet que le hero. */}
        <section className="final-cta container"><div className="eyebrow neon-eyebrow">Ton prochain projet commence ici</div><h2>Une idée mérite<br /><span>un espace pour grandir.</span></h2><p>Découvre une nouvelle manière de travailler avec l’intelligence artificielle.</p><Link className="btn btn-primary" href="/signup">Créer mon espace <span aria-hidden="true">→</span></Link></section>
      </main>
      <Footer />
    </div>
  );
}
