'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';

type AuthMode = 'login' | 'signup';
type Notice = { tone: 'success' | 'error' | 'info'; text: string } | null;
type AuthAction = 'login' | 'signup' | 'google-login' | 'google-signup' | 'reset' | null;

function describeAuthError(code: string) {
  if (code === 'INVALID_CREDENTIALS') return 'Adresse e-mail ou mot de passe incorrect.';
  if (code === 'EMAIL_NOT_CONFIRMED') return 'Confirme ton adresse e-mail avant de te connecter.';
  if (code === 'ACCOUNT_ALREADY_EXISTS') return 'Cette adresse e-mail possède déjà un compte. Connecte-toi plutôt.';
  if (code === 'PASSWORD_TOO_SHORT' || code === 'INVALID_REQUEST') return 'Vérifie les informations saisies et la longueur du mot de passe.';
  if (code === 'AUTH_NOT_CONFIGURED') return 'Supabase n’est pas configuré sur le serveur de cette application.';
  if (code === 'AUTH_UNAVAILABLE') return 'Le service d’authentification est temporairement indisponible. Réessaie plus tard.';
  return 'L’opération n’a pas abouti. Vérifie tes informations et réessaie.';
}

async function postAuth(path: string, body: Record<string, string>) {
  const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({})) as { error?: string; emailConfirmationRequired?: boolean };
  return { response, payload };
}

function GoogleMark() {
  return <svg aria-hidden="true" className="google-mark" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 18l6.8-5.3Z"/><path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.9-5.9A19.7 19.7 0 0 0 24 4 20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-8.4 11.4-8.4Z"/></svg>;
}

function PrismIllustration() {
  return (
    <svg className="auth-prism-art" viewBox="0 0 540 280" role="img" aria-label="Prisme lumineux PrismAI">
      <defs>
        <linearGradient id="prism-left" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#43f2ff"/><stop offset="1" stopColor="#485cff"/></linearGradient>
        <linearGradient id="prism-right" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#a73cff"/><stop offset="1" stopColor="#f08cff"/></linearGradient>
        <linearGradient id="prism-center" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#fff"/><stop offset=".55" stopColor="#59e6ff"/><stop offset="1" stopColor="#8f35ff"/></linearGradient>
        <filter id="prism-blur"><feGaussianBlur stdDeviation="16"/></filter>
      </defs>
      <ellipse cx="270" cy="235" rx="205" ry="16" fill="#b238ff" opacity=".72" filter="url(#prism-blur)"/>
      <path d="M44 224H496" stroke="#8b6bff" strokeOpacity=".45"/>
      <path d="M270 25 120 220h150V25Z" fill="url(#prism-left)" fillOpacity=".88" stroke="#a9f9ff" strokeOpacity=".9"/>
      <path d="M270 25 420 220H270V25Z" fill="url(#prism-right)" fillOpacity=".83" stroke="#f4caff" strokeOpacity=".88"/>
      <path d="m120 220 150-67 150 67" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="1.2"/>
      <path d="M270 25v128" stroke="url(#prism-center)" strokeWidth="2"/>
      <path d="m270 153 76 67" stroke="#fff" strokeOpacity=".72"/>
      <path d="m270 153-78 67" stroke="#b8faff" strokeOpacity=".75"/>
      <g fill="#fff" opacity=".85"><circle cx="92" cy="115" r="2"/><circle cx="452" cy="91" r="2"/><circle cx="404" cy="48" r="1.5"/><circle cx="143" cy="63" r="1.5"/><circle cx="468" cy="181" r="1.5"/></g>
      <g fill="none" stroke="#7777ff" strokeOpacity=".42"><rect x="22" y="119" width="116" height="68" rx="4"/><rect x="403" y="111" width="110" height="68" rx="4"/></g>
      <path d="M43 143h73m-58 12h58m308-19h62m-62 13h44" stroke="#86edff" strokeOpacity=".64" strokeWidth="2"/>
    </svg>
  );
}

function BackArrow() {
  return <Link className="auth-back-link" href="/" aria-label="Retour à la page d’accueil"><span aria-hidden="true">←</span></Link>;
}

export function AuthExperience({ initialMode }: { initialMode: AuthMode }) {
  const isSignup = initialMode === 'signup';
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, setPending] = useState<AuthAction>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmed') === '1') setNotice({ tone: 'success', text: 'Adresse e-mail confirmée. Tu peux maintenant te connecter.' });
    if (params.get('error') === 'verification') setNotice({ tone: 'error', text: 'Le lien de vérification est invalide ou a expiré. Demande un nouvel e-mail.' });
    if (params.get('error') === 'oauth') setNotice({ tone: 'error', text: 'Connexion Google indisponible. Vérifie que le fournisseur est activé et configuré dans Supabase Auth.' });
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending('login'); setNotice(null);
    try {
      const { response, payload } = await postAuth('/api/auth/login', { email: loginEmail.trim(), password: loginPassword });
      if (!response.ok) { setNotice({ tone: 'error', text: describeAuthError(payload.error ?? 'AUTH_REQUEST_FAILED') }); return; }
      window.location.assign('/chat');
    } catch {
      setNotice({ tone: 'error', text: 'Connexion impossible pour le moment. Réessaie dans quelques instants.' });
    } finally { setPending(null); }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(null);
    if (signupPassword !== confirmPassword) { setNotice({ tone: 'error', text: 'Les deux mots de passe ne correspondent pas.' }); return; }
    setPending('signup');
    try {
      const { response, payload } = await postAuth('/api/auth/signup', { email: signupEmail.trim(), password: signupPassword, fullName: fullName.trim(), referralCode: referralCode.trim() });
      if (!response.ok) { setNotice({ tone: 'error', text: describeAuthError(payload.error ?? 'AUTH_REQUEST_FAILED') }); return; }
      if (!payload.emailConfirmationRequired) { window.location.assign('/chat'); return; }
      setNotice({ tone: 'success', text: `Compte créé. Si la confirmation par e-mail est activée, vérifie la boîte de réception de ${signupEmail.trim()} pour valider ton adresse.` });
    } catch {
      setNotice({ tone: 'error', text: 'Inscription impossible pour le moment. Réessaie dans quelques instants.' });
    } finally { setPending(null); }
  }

  function handleApplyReferral() {
    const code = referralCode.trim();
    if (!code) { setNotice({ tone: 'info', text: 'Saisis d’abord un code promo ou de parrainage.' }); return; }
    setReferralCode(code);
    setNotice({ tone: 'info', text: 'Le code sera transmis avec ton inscription ; son application dépend des règles de promotion configurées sur la plateforme.' });
  }

  function handleGoogleSignIn(action: 'google-login' | 'google-signup') {
    setPending(action); setNotice(null);
    window.location.assign('/api/auth/google?next=%2Fchat');
  }

  async function handlePasswordReset() {
    setNotice(null);
    if (!loginEmail.trim()) { setNotice({ tone: 'info', text: 'Saisis ton adresse e-mail dans le champ ci-dessus avant de demander la réinitialisation.' }); return; }
    setPending('reset');
    try {
      const { response, payload } = await postAuth('/api/auth/reset-password', { email: loginEmail.trim() });
      if (!response.ok) setNotice({ tone: 'error', text: describeAuthError(payload.error ?? 'AUTH_REQUEST_FAILED') });
      else setNotice({ tone: 'success', text: 'Si cette adresse correspond à un compte, un lien de réinitialisation vient d’être envoyé.' });
    } catch {
      setNotice({ tone: 'error', text: 'Demande de réinitialisation impossible. Réessaie plus tard.' });
    } finally { setPending(null); }
  }

  return (
    <main className={`auth-page auth-page-${initialMode}`}>
      <BackArrow />
      <div className="auth-page-content">
        {isSignup ? (
          <section className="auth-card auth-card-signup" aria-labelledby="signup-title">
            <p className="auth-eyebrow auth-card-eyebrow">PrismAI · Un seul prisme</p>
            <h1 id="signup-title" className="auth-card-title">Crée ton compte PrismAI</h1>
            <p className="auth-card-intro">Rejoins ton espace pour explorer et travailler avec l’IA.</p>
            <div className="auth-register-rule" />
            <form className="auth-form auth-signup-form" onSubmit={handleSignup}>
              <label htmlFor="signup-name">Nom complet</label>
              <input autoComplete="name" id="signup-name" name="name" onChange={(event) => setFullName(event.target.value)} placeholder="Ton nom" required value={fullName}/>
              <label htmlFor="signup-email">Adresse e-mail</label>
              <input autoComplete="email" id="signup-email" name="email" onChange={(event) => setSignupEmail(event.target.value)} placeholder="nom@exemple.com" required type="email" value={signupEmail}/>
              <label htmlFor="signup-password">Mot de passe</label>
              <input autoComplete="new-password" id="signup-password" minLength={8} name="password" onChange={(event) => setSignupPassword(event.target.value)} placeholder="Crée un mot de passe" required type="password" value={signupPassword}/>
              <label htmlFor="confirm-password">Confirmer le mot de passe</label>
              <input autoComplete="new-password" id="confirm-password" minLength={8} name="confirm-password" onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Répète ton mot de passe" required type="password" value={confirmPassword}/>
              <label htmlFor="referral-code">Code promo ou code de parrainage <span>(facultatif)</span></label>
              <div className="auth-promo-row">
                <input autoComplete="off" id="referral-code" name="referral-code" onChange={(event) => setReferralCode(event.target.value)} placeholder="Tu as un code ? Ajoute-le ici." value={referralCode}/>
                <button className="auth-promo-apply" disabled={pending !== null} onClick={handleApplyReferral} type="button">Appliquer</button>
              </div>
              <p className="auth-code-note">Le code est enregistré avec ta demande ; son application dépend des règles de promotion configurées sur la plateforme.</p>
              <button className="auth-submit" disabled={pending !== null} type="submit">{pending === 'signup' ? 'Création du compte…' : 'Créer mon compte'}</button>
            </form>
            <div className="auth-divider"><span>ou continuer avec</span></div>
            <button className="auth-google" disabled={pending !== null} onClick={() => handleGoogleSignIn('google-signup')} type="button"><GoogleMark/>{pending === 'google-signup' ? 'Redirection…' : 'Continuer avec Google'}</button>
            <p className="auth-switch">Déjà un compte ? <Link href="/login">Se connecter</Link></p>
          </section>
        ) : (
          <section className="auth-card auth-card-login" aria-labelledby="login-title">
            <Link className="wordmark auth-card-wordmark" href="/" aria-label="PrismAI, accueil"><span className="prism" aria-hidden="true"/>Prism<span>AI</span></Link>
            <p className="auth-slogan">Toutes les IA. Un seul Prisme.</p>
            <PrismIllustration />
            <p className="auth-eyebrow auth-login-eyebrow">Ton espace IA, unifié</p>
            <h1 id="login-title" className="auth-card-title">Content de te revoir.</h1>
            <p className="auth-card-intro">Connecte-toi pour retrouver ton espace IA.</p>
            <form className="auth-form auth-login-form" onSubmit={handleLogin}>
              <label htmlFor="login-email">Adresse e-mail</label>
              <input autoComplete="email" id="login-email" name="email" onChange={(event) => setLoginEmail(event.target.value)} placeholder="Adresse e-mail" required type="email" value={loginEmail}/>
              <div className="auth-password-label"><label htmlFor="login-password">Mot de passe</label><button className="auth-text-button" disabled={pending !== null} onClick={handlePasswordReset} type="button">Mot de passe oublié ?</button></div>
              <input autoComplete="current-password" id="login-password" name="password" onChange={(event) => setLoginPassword(event.target.value)} placeholder="Mot de passe" required type="password" value={loginPassword}/>
              <button className="auth-submit" disabled={pending !== null} type="submit">{pending === 'login' ? 'Connexion…' : 'Se connecter'}</button>
            </form>
            <div className="auth-divider"><span>ou continuer avec</span></div>
            <button className="auth-google" disabled={pending !== null} onClick={() => handleGoogleSignIn('google-login')} type="button"><GoogleMark/>{pending === 'google-login' ? 'Redirection…' : 'Continuer avec Google'}</button>
            <p className="auth-switch">Pas encore de compte ? <Link href="/signup">Créer mon espace</Link></p>
          </section>
        )}
      </div>

      {notice && <div className={`auth-toast auth-toast-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}{notice.tone === 'success' && notice.text.startsWith('Compte créé.') && <Link href="/verify-email">Renvoyer l’e-mail de vérification</Link>}</div>}
      <footer className="auth-footer auth-legal-footer"><span>Conditions d’utilisation</span><span aria-hidden="true">·</span><span>Confidentialité</span></footer>
    </main>
  );
}
