# TODO — PrismAI

## Livré dans cette unité

### Monorepo reproductible

- [x] Monorepo pnpm/Turborepo avec `apps/web`, `apps/api`, `apps/workers`, `apps/edge` et les packages de l’architecture cible.
- [x] TypeScript strict, lockfile, ESLint non interactif, `.env.example` sans secret réel et policy pnpm 11 pour les scripts nécessaires.
- [x] README, plan, docs d’architecture existantes, runbooks et traçabilité conservés dans le dépôt cible.

### Domaine, contrats et exécution

- [x] Contrats Zod pour messages, paiements, runs et événements SSE avec séquence/idempotence.
- [x] Classification de capacité séparée du choix du fournisseur ; fallback borné Groq/Gemini/OpenRouter/Mistral et circuit breaker.
- [x] Runtime chat avec vérification, réservation, finalisation et remboursement explicites côté domaine.
- [x] Registre d’outils allowlisté ; aucune exécution arbitraire, commande système, SSRF ou plugin privilégié par défaut.
- [x] Ledger Evidence append-only avec hash, provenance, couverture et inconnues explicites.

### Supabase, R2 et sécurité

- [x] Migration Supabase sans MongoDB : organisations/membres, profils, conversations, parts, runs, crédits, opérations, paiements, pièces jointes et Evidence.
- [x] RLS deny-by-default et policies d’ownership ; RPC de crédits atomiques, idempotence de paiement et finalisation de run.
- [x] Adaptateur R2 privé avec préfixes tenant/type, clés générées serveur et URLs signées courte durée.
- [x] Secrets serveur uniquement ; aucun provider/R2/service role dans le bundle frontend.

### Web et studios

- [x] Landing, login, signup, vérification e-mail, pricing, chat, dashboard, settings et shell dark neon responsive.
- [x] Studios texte, image, vidéo, code et document avec disponibilité explicite lorsque le provider n’est pas configuré.
- [x] Manifeste `manus-routes.json` synchronisé avec les routes pages principales.

### Validation locale

- [x] Lint, typecheck, tests unitaires/contrats et build à exécuter dans ce dépôt cible avant commit.
- [ ] Exécuter `supabase test db` sur un projet local/staging et prouver les allow/deny inter-tenant.
- [ ] Tester un vrai flux Auth, provider, SSE, R2 et Campay avec secrets de staging séparés.
- [ ] Activer Redis/LiteLLM/Workers Cloudflare seulement après décision opérationnelle, coûts, régions et permissions.
- [ ] Réaliser les E2E mobile/clavier/contraste et tests de reprise multi-instance.

## Décisions toujours ouvertes

- Résidence des données, SLO/RPO/RTO, quotas et politique de rétention.
- LiteLLM séparé ou providers directs selon les résultats de staging.
- Niveau de sandbox pour OCR/STT/RAG/MCP/Code Interpreter ; ces fonctions ne sont pas simulées.
- Offre commerciale Free/Pro/Créateur, CinetPay/Stripe et règles de crédits mensuels/supplémentaires.
- Revue juridique finale des licences et SBOM des futures dépendances tierces.


## Durcissement sécurité — unité courante

- [x] Cookies Supabase SSR httpOnly/Secure avec rotation des refresh tokens gérée par `@supabase/ssr`.
- [x] RBAC `user`/`premium`/`admin` dans `profiles.role`, avec protection RLS contre l’auto-élévation.
- [x] RPC crédits réconciliées sur `reserve_credits`, `complete_credits` et `refund_credits`, avec révocation des anciens appels directs pour `authenticated`.
- [x] Rate limiting SQL atomique des routes chat/SSE : 30 requêtes par utilisateur sur 60 secondes.
- [x] Vérification HMAC/Stripe des webhooks avant parsing et crédit de paiement idempotent par `tx_id`.
- [x] Validation Zod et nettoyage des caractères de contrôle sur les messages entrants, sans modifier les corps signés avant vérification.
- [ ] Exécuter la migration 002 et les tests de concurrence avec un Supabase staging réel ; les tests locaux ne prouvent pas les verrous PostgreSQL.


## Authentification — écran PrismAI

- [x] Conserver l’identité visuelle de la maquette — PrismAI, prisme lumineux et fond bleu nuit/violet — sur deux pages cohérentes et responsive, chacune avec un seul formulaire centré. Supprimer leur barre de navigation, ajouter une flèche retour vers la landing, harmoniser largeur/marges et style des CTA et boutons Google, intégrer le champ promo et son action « Appliquer » sans débordement mobile, et limiter le footer aux mentions légales. Le code est transmis à l’inscription ; sa validation/attribution d’avantage reste dépendante des règles de promotion à construire.
- [x] Séparer les routes `/login` et `/signup` en pages dédiées : chaque page ne montre que son propre formulaire, avec « Créer mon espace » vers l’inscription et « Se connecter » vers la connexion.
- [x] Relier les routes de connexion et d’inscription au backend Supabase : e-mail/mot de passe, nom, confirmation du mot de passe, messages d’erreur/succès et liens réciproques.
- [x] Rediriger vers `/dashboard` uniquement après une session Supabase vérifiée par `auth.getUser()` ; afficher une confirmation e-mail sans ouvrir le Dashboard lorsqu’aucune session n’est établie.
- [x] Protéger `/dashboard` côté serveur et lire le profil, le solde et l’activité depuis les tables Supabase RLS ; afficher un état vide explicite pour les projets non disponibles au lieu de simuler des données.
- [x] Ajouter les endpoints backend de récupération du mot de passe, renvoi du lien de vérification et Google OAuth ; les sessions et cookies PKCE restent httpOnly, Secure et SameSite=None en HTTPS.
- [x] Mettre à jour les README des dépôts `prismAIlearn` et `prismai-architecture` avec le fonctionnement et les prérequis Supabase, y compris `APP_BASE_URL` et les callbacks autorisés.
- [ ] Effectuer un test positif complet d’inscription, confirmation par e-mail puis connexion avec une boîte contrôlée et l’URL de callback de staging autorisée. Le serveur est démarré ; l’accès Auth, l’inscription activée et le retour d’erreur login ont été vérifiés, sans créer de compte de test ni toucher à la production.
