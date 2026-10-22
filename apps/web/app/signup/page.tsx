'use client';

// Importe Link pour les liens légaux et le retour vers la connexion.
import Link from 'next/link';
// Importe les primitives React nécessaires au formulaire contrôlé.
import { FormEvent, useState } from 'react';
// Importe le routeur client pour rediriger uniquement après session vérifiée.
import { useRouter } from 'next/navigation';
// Importe le shell Auth partagé sans navigation complète.
import { AuthShell } from '../components/AuthShell';

// Rend l’écran d’inscription PrismAI aligné sur la maquette corrigée.
export default function SignupPage() {
  // Conserve l’état des champs sans jamais stocker de mot de passe côté serveur applicatif.
  const [form, setForm] = useState({ fullName: '', email: '', password: '', passwordConfirm: '', referralCode: '', accepted: false });
  // Conserve le message d’erreur contrôlé renvoyé par le parcours Auth.
  const [error, setError] = useState('');
  // Conserve le message de confirmation lorsque l’e-mail doit être validé.
  const [notice, setNotice] = useState('');
  // Signale l’envoi en cours pour éviter les doubles créations de compte.
  const [pending, setPending] = useState(false);
  // Prépare la navigation contrôlée vers le Dashboard.
  const router = useRouter();

  // Met à jour un champ sans exposer les données saisies dans une URL.
  function updateField(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  // Soumet l’inscription au handler serveur Supabase.
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!form.accepted) {
      setError('Tu dois accepter les conditions pour créer ton compte.');
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setPending(true);
    try {
      const response = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email, password: form.password, fullName: form.fullName, referralCode: form.referralCode }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error === 'ACCOUNT_ALREADY_EXISTS' ? 'Un compte existe déjà avec cette adresse e-mail.' : 'Impossible de créer le compte. Vérifie les informations saisies.');
        return;
      }
      if (result.sessionEstablished === true) {
        router.replace('/dashboard');
        router.refresh();
        return;
      }
      setNotice('Compte créé. Consulte ton e-mail pour confirmer ton adresse avant de te connecter.');
    } catch {
      setError('Le service d’authentification est momentanément indisponible.');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell eyebrow="PrismAI · Un seul Prisme" title="Crée ton compte PrismAI" description="Rejoins ton espace pour explorer et travailler avec l’IA.">
      {/* Formulaire d’inscription connecté à Supabase via le handler serveur. */}
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="signup-name">Nom complet</label>
        <input id="signup-name" type="text" placeholder="Ton nom" autoComplete="name" value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} required />
        <label htmlFor="signup-email">Adresse e-mail</label>
        <input id="signup-email" type="email" placeholder="nom@exemple.com" autoComplete="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required />
        <label htmlFor="signup-password">Mot de passe</label>
        <input id="signup-password" type="password" placeholder="Crée un mot de passe" autoComplete="new-password" value={form.password} onChange={(event) => updateField('password', event.target.value)} minLength={8} required />
        <label htmlFor="signup-password-confirm">Confirmer le mot de passe</label>
        <input id="signup-password-confirm" type="password" placeholder="Répète ton mot de passe" autoComplete="new-password" value={form.passwordConfirm} onChange={(event) => updateField('passwordConfirm', event.target.value)} minLength={8} required />
        <label htmlFor="signup-promo">Code promo ou code de parrainage <span className="optional">(facultatif)</span></label>
        <div className="promo-row"><input id="signup-promo" type="text" placeholder="Tu as un code ? Ajoute-le ici." autoComplete="off" value={form.referralCode} onChange={(event) => updateField('referralCode', event.target.value)} /><button className="promo-button" type="button" onClick={() => setNotice(form.referralCode ? 'Le code sera transmis avec ton inscription.' : 'Le code promo reste facultatif.')}>Appliquer</button></div>
        <label className="consent-row"><input type="checkbox" checked={form.accepted} onChange={(event) => updateField('accepted', event.target.checked)} required /> <span>J’accepte les <Link href="/">Conditions d’utilisation</Link> et la <Link href="/">Politique de confidentialité</Link>.</span></label>
        {error && <p className="auth-message auth-error" role="alert">{error}</p>}
        {notice && <p className="auth-message auth-notice" role="status">{notice}</p>}
        <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>{pending ? 'Création en cours…' : 'Créer mon compte'}</button>
        <p className="auth-switch">Déjà un compte ? <Link href="/login">Se connecter</Link></p>
      </form>
    </AuthShell>
  );
}
