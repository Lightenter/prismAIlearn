'use client';

// Exemples préécrits, sans appel IA ni débit de crédits.
import { useCallback, useEffect, useRef, useState } from 'react';

type Task = { label: string; prompt: string; type: string; context: string; answer: string };

const TASKS: Task[] = [
  { label: 'Rédiger', prompt: 'Rédige une description pour ma boutique de pagnes à Douala.', type: 'Rédaction', context: 'Commerce',
    answer: 'Des pagnes wax choisis un par un au marché de Douala : motifs vifs, coton dense, coupe sur mesure en 48 heures. Livraison à Bonapriso, Akwa et Bonamoussadi.' },
  { label: 'Coder', prompt: 'Pourquoi ma requête fetch renvoie une erreur CORS ?', type: 'Code', context: 'Développement',
    answer: 'Le serveur ne renvoie pas l’en-tête Access-Control-Allow-Origin pour ton domaine. Ajoute-le côté API, ou passe par une route serveur qui appelle l’API à ta place.' },
  { label: 'Résumer', prompt: 'Résume ce compte rendu de réunion en cinq points.', type: 'Synthèse', context: 'Réunion',
    answer: 'Lancement reporté au 15. Budget marketing validé. Deux recrutements ouverts. Nouveau moyen de paiement à tester. Point d’étape vendredi à 10 h.' },
  { label: 'Traduire', prompt: 'Traduis ce message client en anglais.', type: 'Traduction', context: 'Relation client',
    answer: 'Hello, thank you for your order. Your parcel will leave our Douala shop tomorrow morning, and we will send you the tracking link.' },
];

export function TaskDemo() {
  const [current, setCurrent] = useState(0);
  const [shown, setShown] = useState(0);
  const [switching, setSwitching] = useState(false);
  const touched = useRef(false);
  const currentRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  // Annule le changement précédent : des clics rapides ne doivent pas afficher une tâche périmée.
  const select = useCallback((index: number, byUser: boolean) => {
    if (byUser) {
      touched.current = true;
      if (index === currentRef.current) return;
    }
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    currentRef.current = index;
    setCurrent(index);
    setSwitching(true);
    timerRef.current = window.setTimeout(() => {
      setShown(index);
      setSwitching(false);
      timerRef.current = null;
    }, 220);
  }, []);

  // Défilement lent automatique tant que le visiteur n’a rien choisi ; respecte mouvement réduit.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (touched.current || document.hidden) return;
      select((currentRef.current + 1) % TASKS.length, false);
    }, 5600);
    return () => {
      window.clearInterval(id);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [select]);

  function onPick(index: number) { select(index, true); }
  function onKey(event: React.KeyboardEvent) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const next = (current + (event.key === 'ArrowRight' ? 1 : TASKS.length - 1)) % TASKS.length;
    tabs.current[next]?.focus();
    onPick(next);
  }

  const task = TASKS[shown];

  return (
    <div className="reveal relative ml-auto max-w-[620px] rounded-lg bg-surface p-5 text-[15px] [transition-delay:120ms] sm:p-6" data-ui aria-label="Démonstration illustrative PrismAI">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[15px] font-semibold">PrismAI <span className="font-normal text-soft">· démonstration</span></h2>
        <p className="text-right text-[12px] text-soft">Aucun appel IA<br />ni crédit utilisé</p>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-1 rounded-lg bg-ground p-1" role="tablist" aria-label="Choisis un exemple">
        {TASKS.map((item, index) => (
          <button key={item.label} ref={(el) => { tabs.current[index] = el; }} type="button" className="tab" role="tab" aria-selected={index === current} tabIndex={index === current ? 0 : -1} onClick={() => onPick(index)} onKeyDown={onKey}>
            {item.label}
          </button>
        ))}
      </div>
      <div className={`demo-body mt-5${switching ? ' is-switching' : ''}`} aria-live="polite">
        <div className="rounded-lg bg-raise p-4">
          <p className="text-[13px] text-soft">Exemple de question</p>
          <p className="mt-1.5 text-[17px] leading-[1.5]">{task.prompt}</p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
          <div className="rounded-lg bg-raise p-3"><dt className="text-soft">Type d’exemple</dt><dd className="mt-1 text-[15px] font-medium">{task.type}</dd></div>
          <div className="rounded-lg bg-raise p-3"><dt className="text-soft">Contexte</dt><dd className="mt-1 text-[15px] font-medium">{task.context}</dd></div>
        </dl>
        <div className="mt-4 rounded-lg bg-raise p-4">
          <p className="text-[13px] text-soft">Exemple de réponse</p>
          <p className="mt-1.5 text-[15px] leading-[1.6] text-ink/90">{task.answer}</p>
        </div>
        <p className="mt-4 text-[13px] leading-[1.5] text-soft">
          Les exemples sont préécrits. Dans une vraie conversation, le coût est calculé côté serveur et affiché après la réponse.
        </p>
      </div>
    </div>
  );
}
