'use client';

// Démonstration de la landing : exemples de réponses et coût en crédits (barèmes de @prismai/domain).
// Ne jamais afficher de nom de modèle ou de fournisseur sur la landing.
import { useEffect, useRef, useState } from 'react';

type Task = { label: string; prompt: string; type: string; tarif: string; rate: number; tokens: number; answer: string };

// Exemples illustratifs ; tarifs en crédits par tranche de 1 000 tokens.
const TASKS: Task[] = [
  { label: 'Rédiger', prompt: 'Rédige une description pour ma boutique de pagnes à Douala.', type: 'Rédaction', tarif: 'rédaction', rate: 1.5, tokens: 1840,
    answer: 'Des pagnes wax choisis un par un au marché de Douala : motifs vifs, coton dense, coupe sur mesure en 48 heures. Livraison à Bonapriso, Akwa et Bonamoussadi.' },
  { label: 'Coder', prompt: 'Pourquoi ma requête fetch renvoie une erreur CORS ?', type: 'Code', tarif: 'code', rate: 2, tokens: 2600,
    answer: 'Le serveur ne renvoie pas l’en-tête Access-Control-Allow-Origin pour ton domaine. Ajoute-le côté API, ou passe par une route serveur qui appelle l’API à ta place.' },
  { label: 'Résumer', prompt: 'Résume ce compte rendu de réunion en cinq points.', type: 'Synthèse', tarif: 'synthèse', rate: 1, tokens: 3200,
    answer: 'Lancement reporté au 15. Budget marketing validé. Deux recrutements ouverts. Nouveau moyen de paiement à tester. Point d’étape vendredi à 10 h.' },
  { label: 'Traduire', prompt: 'Traduis ce message client en anglais.', type: 'Traduction', tarif: 'traduction', rate: 1, tokens: 650,
    answer: 'Hello, thank you for your order. Your parcel will leave our Douala shop tomorrow morning, and we will send you the tracking link.' },
];

const fmt = new Intl.NumberFormat('fr-FR');
const plural = (n: number, word: string) => `${fmt.format(n)} ${word}${n > 1 ? 's' : ''}`;
const cost = (t: Task) => Math.ceil(t.tokens / 1000) * t.rate;

export function TaskDemo() {
  const [current, setCurrent] = useState(0);
  const [shown, setShown] = useState(0);
  const [switching, setSwitching] = useState(false);
  const [spent, setSpent] = useState(0);
  const touched = useRef(false);
  const currentRef = useRef(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  // Change de tâche avec un court fondu ; débite le solde fictif seulement sur action du visiteur.
  function select(index: number, byUser: boolean) {
    currentRef.current = index;
    setCurrent(index);
    setSwitching(true);
    window.setTimeout(() => {
      setShown(index);
      if (byUser) setSpent((value) => value + cost(TASKS[index]));
      setSwitching(false);
    }, 220);
  }

  // Défilement lent automatique tant que le visiteur n’a rien choisi ; arrêté si mouvement réduit.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (touched.current || document.hidden) return;
      select((currentRef.current + 1) % TASKS.length, false);
    }, 5600);
    return () => window.clearInterval(id);
  }, []);

  function onPick(index: number) { touched.current = true; select(index, true); }
  function onKey(event: React.KeyboardEvent) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const next = (current + (event.key === 'ArrowRight' ? 1 : TASKS.length - 1)) % TASKS.length;
    tabs.current[next]?.focus();
    onPick(next);
  }

  const task = TASKS[shown];
  const slices = Math.ceil(task.tokens / 1000);
  const price = cost(task);

  return (
    <div className="reveal relative ml-auto max-w-[620px] rounded-lg bg-surface p-5 text-[15px] [transition-delay:120ms] sm:p-6" data-ui aria-label="Démonstration PrismAI">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[15px] font-semibold">PrismAI <span className="font-normal text-soft">· exemple de réponse</span></h2>
        <p className="text-[13px] text-soft">Solde <span className="tabular-nums text-ink">{fmt.format(300 - spent)}</span> crédits</p>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-1 rounded-lg bg-ground p-1" role="tablist" aria-label="Choisis une tâche">
        {TASKS.map((item, index) => (
          <button key={item.label} ref={(el) => { tabs.current[index] = el; }} type="button" className="tab" role="tab" aria-selected={index === current} tabIndex={index === current ? 0 : -1} onClick={() => onPick(index)} onKeyDown={onKey}>
            {item.label}
          </button>
        ))}
      </div>
      <div className={`router-body mt-5${switching ? ' is-switching' : ''}`} aria-live="polite">
        <div className="rounded-lg bg-raise p-4">
          <p className="text-[13px] text-soft">Ta question</p>
          <p className="mt-1.5 text-[17px] leading-[1.5]">{task.prompt}</p>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-[13px]">
          <div className="rounded-lg bg-raise p-3"><dt className="text-soft">Type de tâche</dt><dd className="mt-1 text-[15px] font-medium">{task.type}</dd></div>
          <div className="rounded-lg bg-raise p-3"><dt className="text-soft">Longueur</dt><dd className="mt-1 text-[15px] font-medium tabular-nums">{fmt.format(task.tokens)} tokens</dd></div>
          <div className="rounded-lg bg-raise p-3"><dt className="text-soft">Coût de la réponse</dt><dd className="mt-1 text-[15px] font-medium tabular-nums text-cyan">{plural(price, 'crédit')}</dd></div>
        </dl>
        <div className="mt-4 rounded-lg bg-raise p-4">
          <p className="text-[13px] text-soft">Réponse</p>
          <p className="mt-1.5 text-[15px] leading-[1.6] text-ink/90">{task.answer}</p>
        </div>
        <p className="mt-4 text-[13px] leading-[1.5] text-soft">
          Tarif {task.tarif} : {plural(task.rate, 'crédit')} par tranche de 1 000 tokens · {plural(slices, 'tranche')} = {plural(price, 'crédit')}
        </p>
      </div>
    </div>
  );
}
