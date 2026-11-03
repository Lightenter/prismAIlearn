'use client';

// Dialogue final : pré-remplit l’inscription sans exposer l’e-mail dans l’URL (sessionStorage).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CtaForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    try { window.sessionStorage.setItem('prismai:signup-email', email.trim()); } catch { /* stockage indisponible : l’e-mail sera ressaisi. */ }
    router.push('/signup');
  }

  return (
    <form onSubmit={onSubmit} data-ui className="reveal w-full max-w-[460px] justify-self-end rounded-lg bg-ground p-6 text-ink shadow-[0_24px_60px_rgba(10,10,13,0.35)] [transition-delay:120ms] lg:col-span-5 lg:col-start-8 lg:self-center">
      <h3 className="text-[22px] font-semibold tracking-[-0.02em]">Crée ton espace PrismAI</h3>
      <label htmlFor="cta-email" className="mt-6 block text-[14px] text-soft">Adresse e-mail</label>
      <input id="cta-email" name="email" type="email" autoComplete="email" required placeholder="nom@exemple.com" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-surface px-4 text-[17px] text-ink placeholder:text-soft/70 focus:border-accent focus:outline-none" />
      <button type="submit" className="lp-btn mt-6 h-12 w-full text-[17px]">Créer mon espace</button>
      <p className="mt-4 text-[13px] text-soft">Déjà inscrit ? <Link href="/login" className="text-ink underline-offset-4 hover:underline">Se connecter</Link></p>
    </form>
  );
}
