// Landing publique PrismAI : sombre, sobre, inspirée de Linear, construite en Tailwind.
import Link from 'next/link';
import { ThemeToggle } from './components/ThemeToggle';
import { Inter } from 'next/font/google';
import { CtaForm } from './components/landing/CtaForm';
import { LandingEffects } from './components/landing/LandingEffects';
import { TaskDemo } from './components/landing/TaskDemo';
import './landing.css';

// Charge Inter (police de la marque) avec les trois graisses utilisées.
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter', display: 'swap' });

// Métadonnées publiques de la landing.
export const metadata = {
  title: 'PrismAI — Une IA pour tout ton travail.',
  description: 'PrismAI t’aide à rédiger, coder, résumer et traduire dans un seul espace. 300 crédits offerts à l’inscription.',
};

// Rend la landing : hero et démonstration, fonctionnalités, chiffres, fonctionnement, Cameroun, FAQ, appel final.
export default function HomePage() {
  return (
    <div className={`landing ${inter.variable} min-h-screen overflow-x-clip bg-ground font-sans text-ink antialiased`}>
      <LandingEffects />
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-ground">Aller au contenu</a>
      {/* Navigation : wordmark, quatre liens, une action. */}
      <header className="sticky top-0 z-40 bg-ground">
        <nav className="mx-auto flex h-16 max-w-page items-center justify-between px-5 md:px-8" aria-label="Navigation principale">
          <a href="/" className="group flex items-center gap-2.5 text-[17px] font-semibold tracking-tight" aria-label="PrismAI, accueil">
            <span className="block h-[18px] w-[18px] bg-accent transition-transform duration-300 group-hover:rotate-[72deg] [clip-path:polygon(50%_0,100%_27%,82%_100%,18%_100%,0_27%)]" aria-hidden="true"></span>
            PrismAI
          </a>
          <div className="hidden items-center gap-8 text-[15px] text-soft md:flex">
            <a className="nav-link text-ink" href="#contenu" aria-current="page">Accueil</a>
            <a className="nav-link" href="#fonctionnalites">Fonctionnalités</a>
            <Link className="nav-link" href="/pricing">Tarifs</Link>
            <a className="nav-link" href="#fonctionnement">Comment ça marche</a>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link className="hidden text-[15px] text-soft transition-colors hover:text-ink lg:inline" href="/login">Se connecter</Link>
            <ThemeToggle />
            <Link className="lp-btn h-10 px-4 text-[15px]" href="/signup">Commencer</Link>
          </div>
        </nav>
        {/* Sur mobile, les quatre liens passent sur une seconde ligne défilante. */}
        <nav className="flex justify-between gap-4 overflow-x-auto border-t border-ink/10 px-5 py-3 text-[13px] text-soft md:hidden" aria-label="Navigation principale mobile">
          <a className="nav-link text-ink" href="#contenu">Accueil</a>
          <a className="nav-link" href="#fonctionnalites">Fonctionnalités</a>
          <Link className="nav-link" href="/pricing">Tarifs</Link>
          <a className="nav-link" href="#fonctionnement">Comment ça marche</a>
        </nav>
      </header>

      <main id="contenu">
        {/* Hero : promesse, action unique et démonstrateur sur le prisme géant. */}
        <section className="relative overflow-hidden" aria-labelledby="hero-title">
          <div className="mx-auto grid max-w-page items-center gap-14 px-5 pb-24 pt-14 md:px-8 lg:min-h-[calc(100svh-64px)] lg:grid-cols-12 lg:gap-8 lg:pb-28 lg:pt-10">
            <div className="relative z-10 lg:col-span-6">
              <h1 id="hero-title" className="reveal text-[clamp(44px,5vw,72px)] font-semibold leading-[0.98] tracking-[-0.045em]">Une IA pour<br />tout ton travail.</h1>
              <p className="reveal mt-8 max-w-[40ch] text-[17px] leading-[1.55] text-ink/90 [transition-delay:80ms]">Rédige, code, résume et traduis avec PrismAI. Chaque réponse s’adapte à ta demande et affiche son coût en crédits.</p>
              <div className="reveal mt-10 flex flex-wrap items-center gap-x-6 gap-y-4 [transition-delay:160ms]">
                <Link className="lp-btn h-12 px-6 text-[17px]" href="/signup">Commencer gratuitement</Link>
                <a className="link-arrow text-[17px]" href="#demo">Voir une démo <span aria-hidden="true">→</span></a>
              </div>
              <p className="reveal mt-8 text-[15px] text-soft [transition-delay:220ms]">300 crédits offerts à l’inscription. Aucune carte bancaire demandée.</p>
            </div>

            {/* Scène : le pentagone du logo, agrandi et rogné, porte l'interface. */}
            <div className="relative lg:col-span-6" id="demo">
              <div className="prism-stage pointer-events-none absolute -right-[38%] top-[6%] aspect-square w-[118%] bg-accent sm:-right-[22%] lg:-right-[30%] lg:top-auto lg:-translate-y-[22%] lg:w-[128%]" aria-hidden="true"></div>
              <TaskDemo />
            </div>
          </div>
        </section>

        {/* Fonctionnalités : grille à trois colonnes, chaque colonne montre un fragment du produit. */}
        <section id="fonctionnalites" className="mx-auto max-w-page scroll-mt-20 px-5 py-28 md:px-8 lg:py-40" aria-labelledby="features-title">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <h2 id="features-title" className="reveal text-[clamp(34px,4vw,56px)] font-semibold leading-[1.02] tracking-[-0.035em] lg:col-span-7">Un espace, trois usages<br className="hidden sm:block" /> pour avancer.</h2>
            <p className="reveal max-w-[44ch] text-[17px] leading-[1.6] text-ink [transition-delay:80ms] lg:col-span-5">Une seule conversation pour écrire, comprendre du code et suivre ce que tu dépenses, sans changer d’outil ni d’abonnement.</p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <article className="feature reveal">
              <div className="feature-ui" data-ui aria-hidden="true">
                <p className="ml-auto max-w-[85%] rounded-lg bg-accent px-3.5 py-2.5 text-[14px] leading-[1.45] text-white">Réponds poliment à ce client qui demande un délai.</p>
                <p className="mt-3 max-w-[92%] rounded-lg bg-ground px-3.5 py-2.5 text-[14px] leading-[1.5] text-ink/90">Bonjour Madame Ngo, merci pour votre message. Votre commande sera prête jeudi ; nous vous appelons dès son départ.</p>
              </div>
              <h3 className="mt-7 text-[22px] font-semibold tracking-[-0.02em]">Rédiger pour ton activité</h3>
              <p className="mt-3 text-[17px] leading-[1.6] text-ink">Descriptions de produits, réponses clients, lettres et CV, en français comme en anglais.</p>
              <ul className="mt-5 space-y-2 text-[15px] text-soft">
                <li className="facet">Ton adapté à chaque message</li>
                <li className="facet">Traduction français et anglais</li>
              </ul>
            </article>

            <article className="feature reveal [transition-delay:80ms]">
              <div className="feature-ui" data-ui aria-hidden="true">
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-ground p-3.5 text-[13px] leading-[1.6] text-ink/90"><code><span className="text-soft">{'// Erreur : total is undefined'}</span>{'\nconst total = items\n  .reduce((sum, i) => sum + i.prix, '}<span className="text-cyan">0</span>{');'}</code></pre>
                <p className="mt-3 rounded-lg bg-ground px-3.5 py-2.5 text-[14px] leading-[1.5] text-ink/90">La valeur initiale manquait : <span className="text-cyan">reduce</span> démarre maintenant à 0.</p>
              </div>
              <h3 className="mt-7 text-[22px] font-semibold tracking-[-0.02em]">Développer et comprendre</h3>
              <p className="mt-3 text-[17px] leading-[1.6] text-ink">Explique une erreur, propose un correctif et documente une fonction, ligne par ligne.</p>
              <ul className="mt-5 space-y-2 text-[15px] text-soft">
                <li className="facet">Explications pas à pas</li>
                <li className="facet">Correctifs commentés</li>
              </ul>
            </article>

            <article className="feature reveal [transition-delay:160ms]">
              <div className="feature-ui" data-ui aria-hidden="true">
                <table className="w-full text-left text-[14px] tabular-nums">
                  <tbody>
                    <tr><td className="py-1.5 text-ink/90">Bonus d’inscription</td><td className="py-1.5 text-right text-cyan">+300</td></tr>
                    <tr><td className="py-1.5 text-ink/90">Quota du jour</td><td className="py-1.5 text-right text-cyan">+100</td></tr>
                    <tr><td className="py-1.5 text-ink/90">Réponse · Rédaction</td><td className="py-1.5 text-right text-soft">−3</td></tr>
                    <tr><td className="py-1.5 text-ink/90">Réponse · Code</td><td className="py-1.5 text-right text-soft">−6</td></tr>
                    <tr><td className="pt-3 font-semibold">Solde disponible</td><td className="pt-3 text-right font-semibold">391</td></tr>
                  </tbody>
                </table>
              </div>
              <h3 className="mt-7 text-[22px] font-semibold tracking-[-0.02em]">Payer ce que tu utilises</h3>
              <p className="mt-3 text-[17px] leading-[1.6] text-ink">Chaque réponse affiche son coût en crédits. Le solde est calculé et contrôlé côté serveur.</p>
              <ul className="mt-5 space-y-2 text-[15px] text-soft">
                <li className="facet">Historique de chaque opération</li>
                <li className="facet">Aucun débit silencieux</li>
              </ul>
            </article>
          </div>
        </section>

        {/* Métriques : trois tuiles décalées, coins taillés comme le prisme. */}
        <section id="chiffres" className="mx-auto max-w-page scroll-mt-20 px-5 pb-28 md:px-8 lg:pb-40" aria-labelledby="metrics-title">
          <div className="grid gap-2 md:grid-cols-12">
            <div className="metric reveal flex min-h-[340px] flex-col justify-between bg-accent p-7 text-white md:col-span-6 md:min-h-[560px] md:p-8">
              <p className="metric-figure" data-count="300">300</p>
              <p className="max-w-[30ch] text-[17px] leading-[1.5]">crédits offerts à l’inscription. Ce bonus reste acquis, séparé des quotas quotidiens.</p>
            </div>
            <div className="md:col-span-6 md:grid md:grid-cols-6 md:gap-2">
              <h2 id="metrics-title" className="reveal order-first py-8 text-[clamp(28px,2.6vw,36px)] font-semibold leading-[1.1] tracking-[-0.03em] md:col-span-6 md:py-0 md:pb-6 md:pt-2">Ce que tu reçois,<br /> en chiffres.</h2>
              <div className="grid grid-cols-2 gap-2 md:col-span-6 md:grid-cols-6">
                <div className="metric reveal flex min-h-[230px] flex-col justify-between bg-ink p-5 md:p-6 text-ground [transition-delay:80ms] md:col-span-3 md:mt-[6vh] md:min-h-[360px]">
                  <p className="metric-figure" data-count="100">100</p>
                  <p className="text-[17px] leading-[1.45]">crédits ajoutés chaque jour, dès le lendemain de l’inscription.</p>
                </div>
                <div className="metric reveal mt-8 flex min-h-[230px] flex-col justify-between bg-raise p-5 md:p-6 [transition-delay:160ms] md:col-span-3 md:mt-[14vh] md:min-h-[300px]">
                  <p className="metric-figure" data-count="2">2</p>
                  <p className="text-[17px] leading-[1.45]">langues de travail : français et anglais.</p>
                </div>
              </div>
              <p className="reveal mt-8 text-[15px] leading-[1.55] text-soft md:col-span-6">Le coût de chaque réponse s’affiche avec la réponse, de 1 à 2 crédits par tranche de 1 000 tokens selon la tâche.</p>
            </div>
          </div>
        </section>

        {/* Fonctionnement : la même requête traverse trois champs de couleur. */}
        <section id="fonctionnement" className="mx-auto max-w-page scroll-mt-20 px-5 md:px-8" aria-labelledby="how-title">
          <ol className="grid overflow-hidden rounded-lg lg:grid-cols-3">
            <li className="step bg-surface">
              <h2 id="how-title" className="reveal text-[clamp(28px,2.6vw,36px)] font-semibold tracking-[-0.03em]">Comment ça marche</h2>
              <div className="step-card reveal" data-ui aria-hidden="true">
                <p className="text-[13px] text-soft">Requête · reçue</p>
                <p className="mt-2 text-[15px] leading-[1.5]">Pourquoi ma requête fetch renvoie une erreur CORS ?</p>
              </div>
              <p className="step-clause reveal">D’abord, tu poses<br /> ta question.</p>
            </li>
            <li className="step bg-raise">
              <span className="hidden text-[clamp(28px,2.6vw,36px)] lg:block" aria-hidden="true"> </span>
              <div className="step-card reveal [transition-delay:80ms]" data-ui aria-hidden="true">
                <p className="text-[13px] text-soft">Requête · en cours</p>
                <p className="mt-2 text-[15px] leading-[1.5]">Pourquoi ma requête fetch renvoie une erreur CORS ?</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]"><div><dt className="text-soft">Tâche</dt><dd className="text-ink">Code</dd></div><div><dt className="text-soft">Statut</dt><dd className="text-ink">Rédaction de la réponse</dd></div></dl>
              </div>
              <p className="step-clause reveal">Puis PrismAI<br /> prépare la réponse.</p>
            </li>
            <li className="step bg-edge">
              <span className="hidden text-[clamp(28px,2.6vw,36px)] lg:block" aria-hidden="true"> </span>
              <div className="step-card reveal [transition-delay:160ms]" data-ui aria-hidden="true">
                <p className="text-[13px] text-soft">Requête · terminée</p>
                <p className="mt-2 text-[15px] leading-[1.5]">Pourquoi ma requête fetch renvoie une erreur CORS ?</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]"><div><dt className="text-soft">Coût</dt><dd className="text-cyan tabular-nums">6 crédits</dd></div><div><dt className="text-soft">Solde</dt><dd className="text-ink tabular-nums">294</dd></div></dl>
              </div>
              <p className="step-clause reveal">Enfin, tu lis la réponse<br /> et son coût.</p>
            </li>
          </ol>
        </section>


        {/* Cameroun : le terrain de départ, en photos réelles de Douala. */}
        <section id="cameroun" className="mx-auto grid max-w-page scroll-mt-20 gap-10 px-5 pt-28 md:px-8 lg:grid-cols-12 lg:gap-8 lg:pt-40" aria-labelledby="cameroon-title">
          <div className="lg:col-span-5 lg:pt-4">
            <h2 id="cameroon-title" className="reveal text-[clamp(34px,4vw,56px)] font-semibold leading-[1.02] tracking-[-0.035em]">Pensé d’abord<br /> pour le Cameroun.</h2>
            <p className="reveal mt-8 max-w-[42ch] text-[17px] leading-[1.6] [transition-delay:80ms]">PrismAI part des besoins du quotidien : la boutique qui répond à ses clients, l’étudiant qui révise, le développeur qui livre. En français et en anglais, avec un solde clair à chaque réponse.</p>
            <ul className="reveal mt-8 space-y-3 text-[17px] [transition-delay:140ms]">
              <li className="facet">Commerce : descriptions, devis, messages clients</li>
              <li className="facet">Études : révision, plans et reformulation</li>
              <li className="facet">Administration : lettres, CV et demandes</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:col-span-7">
            <figure className="photo reveal col-span-2">
              <img src="/landing/douala-circulation.webp" width="1600" height="1200" alt="Une avenue de Douala en saison sèche, voitures et motos sous le soleil" className="aspect-[16/10] w-full object-cover" loading="lazy" />
              <figcaption>Une avenue de Douala, en saison sèche.</figcaption>
            </figure>
            <figure className="photo reveal [transition-delay:80ms]">
              <img src="/landing/douala-marche.webp" width="1000" height="1333" alt="Étals de légumes dans un marché de Douala" className="aspect-[4/5] w-full object-cover" loading="lazy" />
              <figcaption>Un marché de légumes à Douala.</figcaption>
            </figure>
            <figure className="photo reveal [transition-delay:160ms]">
              <img src="/landing/douala-bonamoussadi.webp" width="1000" height="1333" alt="Rue commerçante du quartier Bonamoussadi à Douala" className="aspect-[4/5] w-full object-cover" loading="lazy" />
              <figcaption>Le quartier Bonamoussadi.</figcaption>
            </figure>
          </div>
        </section>

        {/* FAQ : titre collant à gauche, tuiles pleines à droite, une seule ouverte à la fois. */}
        <section id="faq" className="mx-auto grid max-w-page scroll-mt-20 gap-10 px-5 py-28 md:px-8 lg:grid-cols-12 lg:gap-8 lg:py-40" aria-labelledby="faq-title">
          <div className="lg:col-span-4">
            <h2 id="faq-title" className="reveal text-[clamp(34px,4vw,56px)] font-semibold leading-[1.02] tracking-[-0.035em] lg:sticky lg:top-28">Questions<br className="hidden lg:block" /> fréquentes</h2>
          </div>
          <div className="space-y-2 lg:col-span-8">
            <details className="faq reveal" {...{ name: 'faq' }} open>
              <summary>Qu’est-ce que PrismAI ?<span className="faq-sign" aria-hidden="true"></span></summary>
              <p>Un assistant IA pour rédiger, coder, résumer et traduire, dans un seul espace de conversation. Tu écris ta demande ; PrismAI adapte sa réponse à la tâche.</p>
            </details>
            <details className="faq reveal" {...{ name: 'faq' }}>
              <summary>L’inscription est-elle gratuite ?<span className="faq-sign" aria-hidden="true"></span></summary>
              <p>Oui. Il suffit d’une adresse e-mail et d’un mot de passe. 300 crédits sont versés sur ton compte dès l’inscription, sans carte bancaire.</p>
            </details>
            <details className="faq reveal" {...{ name: 'faq' }}>
              <summary>Comment mon solde se recharge-t-il ?<span className="faq-sign" aria-hidden="true"></span></summary>
              <p>À partir du lendemain de ton inscription, un quota de 100 crédits est ouvert chaque jour. Il est séparé de ton bonus de 300 crédits, qui reste acquis.</p>
            </details>
            <details className="faq reveal" {...{ name: 'faq' }}>
              <summary>Combien coûte une réponse ?<span className="faq-sign" aria-hidden="true"></span></summary>
              <p>Le coût dépend de la longueur de la réponse et du type de tâche : de 1 à 2 crédits par tranche de 1 000 tokens. Le montant s’affiche avec chaque réponse.</p>
            </details>
            <details className="faq reveal" {...{ name: 'faq' }}>
              <summary>Dans quelles langues puis-je écrire ?<span className="faq-sign" aria-hidden="true"></span></summary>
              <p>En français et en anglais. Tu peux aussi demander une traduction de l’un vers l’autre dans la même conversation.</p>
            </details>
            <details className="faq reveal" {...{ name: 'faq' }}>
              <summary>Où PrismAI est-il disponible ?<span className="faq-sign" aria-hidden="true"></span></summary>
              <p>PrismAI se lance d’abord au Cameroun, en français et en anglais, avant de s’ouvrir à d’autres pays d’Afrique.</p>
            </details>
          </div>
        </section>

        {/* Appel final : le premier écran du produit, déjà ouvert. */}
        <section className="bg-accent text-white" aria-labelledby="cta-title">
          <div className="mx-auto grid max-w-page gap-12 px-5 py-24 md:px-8 lg:min-h-[80svh] lg:grid-cols-12 lg:items-end lg:gap-8 lg:py-28">
            <div className="lg:col-span-7">
              <h2 id="cta-title" className="reveal text-[clamp(44px,5vw,72px)] font-semibold leading-[0.98] tracking-[-0.045em]">Pose ta première<br /> question.</h2>
              <p className="reveal mt-8 max-w-[38ch] text-[17px] leading-[1.55] [transition-delay:80ms]">Ton compte est prêt en une minute. Les 300 crédits sont versés dès la confirmation de ton e-mail.</p>
            </div>
    <CtaForm />
          </div>
        </section>
      </main>

      {/* Pied de page : le prisme et le nom, construits en grand. */}
      <footer className="mx-auto max-w-page px-5 pb-10 pt-24 md:px-8" aria-label="Pied de page">
        <div className="flex items-end gap-3 sm:gap-5" aria-hidden="true">
          <span className="block aspect-square w-[16vw] max-w-[180px] bg-accent [clip-path:polygon(50%_0,100%_27%,82%_100%,18%_100%,0_27%)]"></span>
          <span className="block text-[clamp(64px,17vw,250px)] font-semibold leading-[0.78] tracking-[-0.06em]">PrismAI</span>
        </div>
        <div className="mt-16 grid grid-cols-2 gap-8 text-[15px] md:grid-cols-12">
          <div className="md:col-span-2"><p className="text-soft">Produit</p><ul className="mt-3 space-y-2"><li><a className="footer-link" href="#fonctionnalites">Fonctionnalités</a></li><li><a className="footer-link" href="#chiffres">Chiffres</a></li><li><Link className="footer-link" href="/pricing">Tarifs</Link></li></ul></div>
          <div className="md:col-span-2"><p className="text-soft">Compte</p><ul className="mt-3 space-y-2"><li><Link className="footer-link" href="/signup">Créer un compte</Link></li><li><Link className="footer-link" href="/login">Se connecter</Link></li></ul></div>
          <div className="md:col-span-2"><p className="text-soft">Aide</p><ul className="mt-3 space-y-2"><li><a className="footer-link" href="#fonctionnement">Fonctionnement</a></li><li><a className="footer-link" href="#cameroun">Cameroun</a></li><li><a className="footer-link" href="#faq">Questions fréquentes</a></li></ul></div>
          <div className="col-span-2 md:col-span-4 md:col-start-9"><p className="text-soft">PrismAI</p><p className="mt-3 leading-[1.55]">Une IA pour tout ton travail.<br />Lancé au Cameroun.</p></div>
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-4 text-[13px] leading-[1.5] text-soft sm:flex-row sm:items-center">
          <p>© 2026 PrismAI · Photos via Wikimedia Commons : « Douala traffic » par Bmnda (CC0), « Vegetable market in Douala » par Adesolive (CC0), « Douala Bonamoussadi » par MimbaF7023 (<a className="underline underline-offset-2 hover:text-ink" href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a>).</p>
          <a href="#" className="shrink-0 rounded-lg bg-raise px-3 py-2 text-ink transition-colors hover:bg-edge">Revenir en haut</a>
        </div>
      </footer>
    </div>
  );
}
