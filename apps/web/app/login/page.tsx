// Importe Link pour le lien vers l’inscription.
import Link from 'next/link';
// Importe le shell Auth partagé sans navigation complète.
import { AuthShell } from '../components/AuthShell';

// Rend l’écran de connexion PrismAI aligné sur la maquette corrigée.
export default function LoginPage() {
  return (
    <AuthShell eyebrow="PrismAI · Un seul Prisme" title="Retrouve ton espace PrismAI" description="Connecte-toi pour explorer et travailler avec l’IA.">
      {/* Formulaire principal avec les mêmes dimensions que l’inscription. */}
      <form className="auth-form">
        <label htmlFor="login-email">Adresse e-mail</label>
        <input id="login-email" type="email" placeholder="nom@exemple.com" autoComplete="email" />
        <div className="auth-label-row"><label htmlFor="login-password">Mot de passe</label><Link href="/login">Mot de passe oublié ?</Link></div>
        <input id="login-password" type="password" placeholder="Saisis ton mot de passe" autoComplete="current-password" />
        <button className="btn btn-primary auth-submit" type="button">Se connecter</button>
        <div className="auth-divider"><span>ou continuer avec</span></div>
        <button className="google-button" type="button"><span className="google-mark" aria-hidden="true">G</span>Continuer avec Google</button>
        <p className="auth-switch">Pas encore de compte ? <Link href="/signup">Créer un compte</Link></p>
      </form>
    </AuthShell>
  );
}
