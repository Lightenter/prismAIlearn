// Importe Link pour le lien vers la connexion.
import Link from 'next/link';
// Importe le shell Auth partagé sans navigation complète.
import { AuthShell } from '../components/AuthShell';

// Rend l’écran d’inscription PrismAI aligné sur la maquette corrigée.
export default function SignupPage() {
  return (
    <AuthShell eyebrow="PrismAI · Un seul Prisme" title="Crée ton compte PrismAI" description="Rejoins ton espace pour explorer et travailler avec l’IA.">
      {/* Formulaire d’inscription avec code promo optionnel. */}
      <form className="auth-form">
        <label htmlFor="signup-name">Nom complet</label>
        <input id="signup-name" type="text" placeholder="Ton nom" autoComplete="name" />
        <label htmlFor="signup-email">Adresse e-mail</label>
        <input id="signup-email" type="email" placeholder="nom@exemple.com" autoComplete="email" />
        <label htmlFor="signup-password">Mot de passe</label>
        <input id="signup-password" type="password" placeholder="Crée un mot de passe" autoComplete="new-password" />
        <label htmlFor="signup-password-confirm">Confirmer le mot de passe</label>
        <input id="signup-password-confirm" type="password" placeholder="Répète ton mot de passe" autoComplete="new-password" />
        <label htmlFor="signup-promo">Code promo ou code de parrainage <span className="optional">(facultatif)</span></label>
        <div className="promo-row"><input id="signup-promo" type="text" placeholder="Tu as un code ? Ajoute-le ici." autoComplete="off" /><button className="promo-button" type="button">Appliquer</button></div>
        <label className="consent-row"><input type="checkbox" /> <span>J’accepte les <Link href="/">Conditions d’utilisation</Link> et la <Link href="/">Politique de confidentialité</Link>.</span></label>
        <button className="btn btn-primary auth-submit" type="button">Créer mon compte</button>
        <p className="auth-switch">Déjà un compte ? <Link href="/login">Se connecter</Link></p>
      </form>
    </AuthShell>
  );
}
