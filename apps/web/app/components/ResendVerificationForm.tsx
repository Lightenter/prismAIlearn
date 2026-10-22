'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

export function ResendVerificationForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(''); setError(false);
    try {
      const response = await fetch('/api/auth/resend', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) });
      if (!response.ok) { setError(true); setMessage('Impossible de renvoyer le lien pour le moment. Vérifie l’adresse puis réessaie.'); }
      else setMessage('Si cette adresse possède une inscription en attente, un nouveau lien vient d’être envoyé.');
    } catch {
      setError(true); setMessage('Impossible de contacter le service de vérification. Réessaie plus tard.');
    } finally { setPending(false); }
  }

  return (
    <main className="auth-utility-page">
      <Link className="wordmark auth-wordmark" href="/"><span className="prism" aria-hidden="true" />Prism<span>AI</span></Link>
      <section className="auth-utility-card" aria-labelledby="verify-title">
        <div className="auth-utility-icon" aria-hidden="true">✉</div>
        <p className="auth-eyebrow">Étape de vérification</p>
        <h1 id="verify-title">Vérifie ta boîte e-mail</h1>
        <p>Confirme ton adresse pour terminer la création de ton compte PrismAI.</p>
        <form className="auth-form" onSubmit={resend}>
          <label htmlFor="verify-email">Adresse e-mail</label>
          <input autoComplete="email" id="verify-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          <button className="auth-submit" disabled={pending} type="submit">{pending ? 'Envoi…' : 'Renvoyer le lien'}</button>
        </form>
        {message && <p className={`auth-utility-message ${error ? 'is-error' : 'is-success'}`} role={error ? 'alert' : 'status'}>{message}</p>}
        <p className="auth-switch"><Link href="/login">Retour à la connexion</Link></p>
      </section>
    </main>
  );
}
