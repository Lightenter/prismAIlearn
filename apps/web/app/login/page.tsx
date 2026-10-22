'use client';

// Importe Link pour les liens vers l’inscription et la récupération du mot de passe.
import Link from 'next/link';
// Importe les primitives React nécessaires au formulaire contrôlé.
import { FormEvent, useState } from 'react';
// Importe le routeur client pour rediriger uniquement après authentification réussie.
import { useRouter } from 'next/navigation';
// Importe le shell Auth partagé sans navigation complète.
import { AuthShell } from '../components/AuthShell';

// Rend l’écran de connexion PrismAI aligné sur la maquette corrigée.
export default function LoginPage() {
  // Conserve les identifiants uniquement dans l’état local du formulaire.
  const [form, setForm] = useState({ email: '', password: '' });
  // Conserve le message d’erreur sans exposer de détail Supabase.
  const [error, setError] = useState('');
  // Signale l’envoi en cours pour éviter les doubles requêtes.
  const [pending, setPending] = useState(false);
  // Prépare la navigation contrôlée vers le Dashboard.
  const router = useRouter();

  // Soumet la connexion au handler serveur Supabase.
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.sessionEstablished !== true) {
        setError(result.error === 'EMAIL_NOT_CONFIRMED' ? 'Confirme ton adresse e-mail avant de te connecter.' : 'Adresse e-mail ou mot de passe incorrect.');
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Le service d’authentification est momentanément indisponible.');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell eyebrow="PrismAI · Un seul Prisme" title="Retrouve ton espace PrismAI" description="Connecte-toi pour explorer et travailler avec l’IA.">
      {/* Formulaire principal connecté à Supabase via le handler serveur. */}
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="login-email">Adresse e-mail</label>
        <input id="login-email" type="email" placeholder="nom@exemple.com" autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
        <div className="auth-label-row"><label htmlFor="login-password">Mot de passe</label><Link href="/reset-password">Mot de passe oublié ?</Link></div>
        <input id="login-password" type="password" placeholder="Saisis ton mot de passe" autoComplete="current-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
        {error && <p className="auth-message auth-error" role="alert">{error}</p>}
        <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>{pending ? 'Connexion en cours…' : 'Se connecter'}</button>
        <div className="auth-divider"><span>ou continuer avec</span></div>
        <button className="google-button" type="button" onClick={() => router.push('/api/auth/google')}><span className="google-mark" aria-hidden="true">G</span>Continuer avec Google</button>
        <p className="auth-switch">Pas encore de compte ? <Link href="/signup">Créer un compte</Link></p>
      </form>
    </AuthShell>
  );
}
