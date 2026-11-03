'use client';

// Entrées de section : le contenu reste visible sans script ; l’animation se déclenche une fois.
import { useEffect } from 'react';

export function LandingEffects() {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    root.classList.add('js-reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-in'); observer.unobserve(entry.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.landing .reveal').forEach((el) => observer.observe(el));
    return () => { observer.disconnect(); root.classList.remove('js-reveal'); };
  }, []);
  return null;
}
