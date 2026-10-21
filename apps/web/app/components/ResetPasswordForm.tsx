'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

export function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(''); setError(false);
    if (password !== confirmation) { setError(true); setMessage('Les deux mots de passe ne correspondent pas.'); return; }
    setPending(true);
    try {
      const response = await fetch('/api/auth/update-password', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      if (!response.ok) { setError(true); setMessage('Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.'); }
      else { setMessage('Ton mot de passe a été mis à jour. Tu peux maintenant te connecter.'); setPassword(''); setConfirmation(''); }
    } catch {
      setError(true); setMessage('Impossible de contacter le service d’authentification. Réessaie plus tard.');
    } finally { setPending(false); }
  }

  return (
    <main className="auth-utility-page">
      <Link className="wordmark auth-wordmark" href="/"><span className="prism" aria-hidden="true" />Prism<span>AI</span></Link>
      <section className="auth-utility-card" aria-labelledby="reset-title">
        <p className="auth-eyebrow">Sécurité du compte</p>
        <h1 id="reset-title">Choisis un nouveau mot de passe</h1>
        <p>Utilise au moins 8 caractères pour sécuriser ton compte PrismAI.</p>
        <form className="auth-form" onSubmit={updatePassword}>
          <label htmlFor="new-password">Nouveau mot de passe</label>
          <input autoComplete="new-password" id="new-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          <label htmlFor="new-password-confirmation">Confirme le mot de passe</label>
          <input autoComplete="new-password" id="new-password-confirmation" minLength={8} onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} />
          <button className="auth-submit" disabled={pending} type="submit">{pending ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}</button>
        </form>
        {message && <p className={`auth-utility-message ${error ? 'is-error' : 'is-success'}`} role={error ? 'alert' : 'status'}>{message}</p>}
        <p className="auth-switch"><Link href="/login">Retour à la connexion</Link></p>
      </section>
    </main>
  );
}
