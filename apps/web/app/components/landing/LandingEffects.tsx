'use client';

// Entrées de section : le contenu reste visible sans script ; l’animation se déclenche une fois.
import { useEffect } from 'react';

export function LandingEffects() {
  useEffect(() => {
    // Sans support de l’observateur, ou en mouvement réduit, aucune animation n’est posée : tout reste visible.
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    // Sécurité : si l’observateur ne se déclenche pas (aperçu en iframe, onglet masqué, navigateur atypique),
    // le contenu serait invisible à opacity 0. Ce garde-fou révèle tout après un délai court.
    let safety: ReturnType<typeof setTimeout> | undefined;
    const revealAll = () => {
      document.querySelectorAll('.landing .reveal').forEach((el) => el.classList.add('is-in'));
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-in'); observer.unobserve(entry.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    // Le masquage initial n’est appliqué qu’une fois l’observateur réellement en place.
    root.classList.add('js-reveal');
    document.querySelectorAll('.landing .reveal').forEach((el) => observer.observe(el));
    // Deux filets de sécurité indépendants : délai court et retour de visibilité de l’onglet.
    safety = setTimeout(revealAll, 1800);
    const onVisible = () => { if (document.visibilityState === 'visible') revealAll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      observer.disconnect();
      if (safety) clearTimeout(safety);
      document.removeEventListener('visibilitychange', onVisible);
      root.classList.remove('js-reveal');
    };
  }, []);
  return null;
}
