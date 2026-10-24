# PrismAI — plateforme SaaS IA multi-fournisseurs

> **Toutes les IA. Un seul Prisme.**

Ce dépôt contient l’implémentation progressive de PrismAI à partir du cadrage architectural versionné. Le projet est un monorepo TypeScript pnpm/Turborepo avec Next.js pour le web, API Node.js, Supabase pour l’identité/persistance/RLS/RPC et Cloudflare R2 pour les objets privés. MongoDB n’est pas utilisé.

## Références conservées

- [`docs/prismai-architecture-report.md`](docs/prismai-architecture-report.md) — matrice des références, risques, décisions et architecture cible.
- [`docs/source-requirements.txt`](docs/source-requirements.txt) — cahier des charges et méthode par étapes.
- [`docs/frontend-reference.md`](docs/frontend-reference.md) et [`docs/assets/prismai-frontend-reference.png`](docs/assets/prismai-frontend-reference.png) — référence visuelle dark neon, utilisée comme direction et non comme copie pixel par pixel.
- [`plan.md`](plan.md) — périmètre de l’unité livrée.
- [`TODO.md`](TODO.md) — exigences couvertes et travaux restants.

## Architecture implémentée

```text
apps/web       Next.js 14 : landing, auth, chat, studios, dashboard et routes API
apps/api       API Node/TypeScript : health et point d’entrée stateless
apps/workers   jobs bornés et traitements asynchrones
apps/edge      adaptateurs Edge ciblés
packages/contracts       schémas Zod, événements SSE et contrats de run
packages/domain          capacités, états de run, crédits et erreurs métier
packages/db              client Supabase, repositories et opérations crédits
packages/authz           identité, ownership et autorisations
packages/chat-runtime    orchestration, réservation et finalisation d’un tour
packages/provider-router classification de capacité puis choix/fallback fournisseur
packages/tools-runtime   registre allowlisté et exécution contrôlée
packages/evidence        ledger append-only, hash et provenance
packages/blobstore       abstraction R2, préfixes privés et URLs signées
packages/observability   corrélation et logs JSON redigés
packages/ui              tokens PrismAI réutilisables
supabase/                migration, seed et tests RLS/RPC
infra/                    R2, LiteLLM, Redis et CI
```

## Installation

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

L’application web écoute sur `http://localhost:3000` et l’API interne sur `API_PORT` si elle est démarrée séparément. Les pages marketing et la référence UI sont visibles sans secret ; les actions privées exigent Supabase Auth et les clés serveur correspondantes.

## Variables et sécurité

`.env.example` ne contient aucun secret réel. Les clés Supabase service role, fournisseurs IA, Campay et R2 ne doivent exister que côté backend/worker. Les buckets R2 restent privés et les URLs sont présignées pour une courte durée. Le frontend ne décide jamais du coût d’une opération.

## Supabase

Les migrations `001_init.sql` à `006_user_credit_summary.sql` sont appliquées au projet de staging. `001_init.sql` est historique et attribue encore 10 000 crédits dans son trigger ; `003_daily_credit_quota.sql` le remplace par la règle actuelle : bonus d’inscription permanent de 300 crédits et quota non cumulable de 100 crédits par jour, à partir du lendemain, en heure `Africa/Douala`. Les crédits quotidiens expirent à minuit local et ne se convertissent pas en crédits permanents. Toujours appliquer `003` avant de rouvrir les inscriptions. Le job Cron actif tourne à `23:00 GMT`, soit `00:00 Africa/Douala`. `006_user_credit_summary.sql` expose au Dashboard une RPC de lecture liée à `auth.uid()` pour afficher le total et ses compartiments sans ouvrir la table du quota aux utilisateurs.

## Tests et build

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Les tests locaux ne déclarent pas avoir validé un service externe : ils couvrent les contrats, le routeur, les transitions de crédits et les doubles de provider. Les tests Supabase/R2/Campay staging restent à exécuter avec de vrais environnements isolés.

## Limites connues

- Le streaming local utilise un protocole SSE typé et un fallback borné ; la reprise multi-instance durable nécessite Redis et une file de jobs activés en staging.
- Les studios image, vidéo et document exposent explicitement leur disponibilité/configuration ; ils ne simulent pas une génération réelle sans provider configuré.
- Le profil conserve le nom et le code de parrainage facultatif; les mots de passe restent gérés et hachés par Supabase Auth. Le quota journalier est consommé avant le portefeuille permanent. Les promotions de codes promo ne sont pas encore validées ni créditées.
- LiteLLM est documenté comme gateway optionnelle derrière le routeur PrismAI, jamais comme source d’autorité tenant/billing.

## Licences et réutilisation

Le code PrismAI reste original et n’embarque pas de copie de LibreChat, Open WebUI, LobeHub, REA, Vercel AI SDK, LiteLLM ou Workers SDK. Le dépôt réutilise des patterns publics documentés après revue des licences signalées dans le rapport d’architecture. Toute future adaptation de code tiers devra conserver les notices et être validée fichier par fichier.

## Validation des intégrations

Les scripts non destructifs `scripts/integration/test_supabase_connection.mjs` et `scripts/integration/test_r2_connection.mjs` valident respectivement les endpoints Supabase et le cycle temporaire Put/Head/Get/Delete R2. Ils retournent `SKIPPED` si les variables requises sont absentes et ne journalisent jamais les secrets. Utiliser `pnpm test:integration`, `pnpm test:integration:supabase` ou `pnpm test:integration:r2`. Le guide des clés Groq, Gemini et OpenRouter est dans [`docs/runbooks/provider-api-keys.md`](docs/runbooks/provider-api-keys.md).

## Authentification du chat

Les routes `/api/chat` et `/api/chat/stream` vérifient la session Supabase côté serveur avant d’exécuter un run. L’identifiant transmis au runtime vient exclusivement de `supabase.auth.getUser()` ; un `userId` envoyé par le navigateur est ignoré. Une session absente ou invalide retourne `401 UNAUTHORIZED`, sans divulguer les détails du jeton ou de la base.


## Durcissement sécurité MVP

La migration additive [`supabase/migrations/002_security_hardening.sql`](supabase/migrations/002_security_hardening.sql) ajoute le RBAC `user`/`premium`/`admin`, protège le changement de rôle par RLS, révoque les RPC de crédits pour les JWT utilisateur et réserve les crédits via des verrous PostgreSQL. Le runtime suit désormais `reserve_credits → provider → complete_credits` ou `refund_credits`; la clé d’idempotence doit être conservée lors d’un retry HTTP via l’en-tête `Idempotency-Key`.

Les cookies Supabase SSR sont httpOnly ; `SUPABASE_COOKIE_SECURE=true` active Secure et SameSite=None pour tout accès HTTPS, y compris une Preview, et doit rester false uniquement en HTTP localhost. La rotation des refresh tokens est déléguée à `@supabase/ssr` et déclenchée par la vérification serveur `auth.getUser()`. Le rate limiting chat est atomique en base, à 30 requêtes par utilisateur et par fenêtre de 60 secondes. Le client DB backend refuse tout fallback vers la clé anon publique.

Les routes `/api/webhooks/stripe`, `/api/webhooks/campay` et `/api/webhooks/cinetpay` vérifient la signature du corps brut avant parsing, valident le payload et dédupliquent les transactions par `tx_id` via `credit_payment_v2`. Les secrets `STRIPE_WEBHOOK_SECRET`, `CAMPAY_WEBHOOK_SECRET` et `CINETPAY_WEBHOOK_SECRET` sont strictement serveur. Les messages sont validés par Zod, nettoyés des caractères de contrôle et rendus par React sans HTML non échappé; le corps brut d’un webhook n’est jamais sanitizé avant vérification cryptographique.

Avant application en production, exécuter la migration 002 sur un projet Supabase de staging isolé et réaliser les tests transactionnels réels avec deux sessions/utilisateurs. Les tests locaux vérifient les contrats et mocks, mais ne prouvent pas à eux seuls les garanties de concurrence PostgreSQL.

## Connexion et inscription PrismAI

Les routes `/login` et `/signup` sont deux pages distinctes qui partagent la même identité visuelle PrismAI et n’affichent chacune que leur formulaire. Elles n’ont pas de barre de navigation ; une flèche discrète ramène à l’accueil, les formulaires sont centrés et de largeur cohérente, et le footer ne contient que les mentions légales. « Créer mon espace » mène à `/signup`; « Se connecter » mène à `/login`, avec un lien réciproque clair sur chaque page. Les boutons principaux et Google sont uniformes en largeur ; le code promo facultatif est intégré au formulaire avec une action « Appliquer » et ne déborde pas sur mobile. Cette action transmet le code avec l’inscription mais ne valide pas son éligibilité ; l’application d’un avantage dépend des règles de promotion configurées. L’authentification par e-mail utilise Supabase Auth : création de compte avec nom et confirmation du mot de passe, connexion, réinitialisation du mot de passe, renvoi du lien de vérification et callback serveur pour les liens e-mail/OAuth. Les opérations transitent par les routes backend `/api/auth/*`; les sessions sont placées dans des cookies httpOnly. Le code de parrainage facultatif est enregistré comme métadonnée d’inscription ; il n’est pas encore validé ni utilisé pour accorder une promotion ou des crédits.

Pour configurer l’application Web en développement, copier `apps/web/.env.example` vers `apps/web/.env.local` et définir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `APP_BASE_URL` avec un projet Supabase de développement/staging. `APP_BASE_URL` doit être l’origine visible par le navigateur (`http://localhost:3000` en local direct, ou l’origine HTTPS publique pour un tunnel) ; les liens de confirmation et OAuth en dépendent. Ces valeurs sont lues par les routes serveur Next.js ; le code navigateur n’instancie pas de client Supabase. **Ne jamais mettre `SUPABASE_SERVICE_ROLE_KEY` dans une variable `NEXT_PUBLIC_*` ou dans l’application Web.** Les variables locales sont ignorées par Git.

Dans Supabase Auth, configurer l’URL du site et autoriser précisément `${APP_BASE_URL}/auth/callback` dans la liste des URL de redirection ; le callback rejette les chemins de retour externes. Le staging `prismai-staging` est distinct de Production, les inscriptions e-mail y sont réactivées et `Confirm email` est désactivé (`mailer_autoconfirm=true`) afin que l’inscription ne dépende pas d’un e-mail de validation. Le fichier local `apps/web/.env.local` pointe sur ce staging et reste ignoré par Git. La connexion, l’inscription positive et l’attribution de 300 crédits restent à tester avec un nouveau compte staging. Employer un staging isolé, jamais une base de production.

Le serveur web peut être lancé depuis la racine avec `pnpm --filter @prismai/web dev`; il écoute par défaut sur `http://localhost:3000`.

## Parcours Auth vers Dashboard

Les handlers `/api/auth/signup` et `/api/auth/login` ne renvoient `sessionEstablished: true` qu’après vérification de l’utilisateur par `supabase.auth.getUser()`. Les pages `/signup` et `/login` redirigent vers `/dashboard` uniquement dans ce cas ; une inscription nécessitant la confirmation e-mail affiche un message de confirmation et ne rend aucune donnée privée.

Le Dashboard vérifie à nouveau la session côté serveur avant son rendu, puis lit `profiles` et `credit_transactions` avec le client SSR soumis à RLS. `get_my_credit_summary()` ne prend aucun identifiant utilisateur en argument, crée idempotemment le quota du jour si nécessaire et ne retourne que le portefeuille, le quota et le total de `auth.uid()`. Les projets ne sont pas encore présents dans le schéma utilisé : l’interface affiche donc un état vide explicite et ne simule ni projets, ni activité, ni forfait. Le test positif complet avec un nouveau compte staging reste à effectuer.

## Routage automatique du Chat

Le navigateur envoie les messages à PrismAI sans sélectionner de fournisseur ni de modèle. Le serveur classe l’intention et les capacités, lit le rôle `profiles.role` côté Supabase (`premium` devient `PRO`, toute autre valeur devient `FREE`), filtre les modèles selon leur compatibilité et le forfait, puis choisit le candidat selon la politique de coût/qualité. Les identifiants de modèles, les clés et les erreurs fournisseur ne sont pas exposés au client. Les capacités actuellement prises en charge par le Chat standard sont `TEXT`, `CODE`, `REASONING` et `CREATIVE`; les demandes de PDF/document, image, audio, vidéo, recherche ou outils non raccordés sont refusées plutôt que simulées ou envoyées à un modèle incompatible.

Pour activer une génération réelle, configurer côté serveur `PRISMAI_ROUTING_CATALOG` avec un tableau JSON d’entrées comportant `provider`, l’identifiant exact `model`, `capabilities`, `contextWindowTokens`, `plans` (`FREE`/`PRO`) et `qualityRank` (entier de 1 à 5), ainsi que la clé correspondante parmi `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` ou `MISTRAL_API_KEY`. Le schéma strict et la limite de 32 entrées sont définis dans `packages/provider-router/src/config.ts`. Une clé seule ou un catalogue absent n’active aucun modèle; aucun identifiant de modèle par défaut n’est inventé. Ne jamais déplacer ces valeurs vers une variable `NEXT_PUBLIC_*`. `AI_TIMEOUT_MS` règle le délai serveur.

Le routeur essaie au plus un modèle de remplacement. Il ne bascule que sur les statuts temporaires explicitement autorisés (429/503); il ne contourne pas une erreur 401/403 et ne répète pas un appel dont l’exécution est incertaine après un timeout réseau. Le runtime réserve avant l’appel le coût maximal des candidats principal et fallback réellement éligibles, puis finalise au coût calculé de la réponse ou libère la réservation en cas d’échec. Le calcul des crédits reste celui déjà défini par fournisseur dans `packages/domain`; il ne constitue pas une grille tarifaire par modèle.

### Tests réels des providers (optionnels)

L’authentification IA n’est pas requise pour démarrer Next.js; les clés et le catalogue sont des paramètres serveur facultatifs et un provider sans clé est ignoré. L’authentification Supabase réelle reste, elle, dépendante de ses variables propres fournies par l’environnement local ou l’hébergeur. `pnpm test:integration:gemini` effectue un seul appel minimal au modèle Gemini explicitement présent dans `PRISMAI_ROUTING_CATALOG`; il se termine par `SKIPPED` si clé ou modèle manquent. Pour éviter toute consommation payante accidentelle, le script exige aussi `GEMINI_TEST_FREE_CONFIRMED=true` après vérification du modèle et du quota Free dans AI Studio. Il n’affiche ni clé, ni modèle, ni réponse, ne retente pas la requête et n’est pas inclus dans `pnpm test:integration`.

`pnpm test:integration:groq` suit le même principe pour un modèle Groq explicitement catalogué. Il exige `GROQ_TEST_FREE_CONFIRMED=true` après vérification dans GroqCloud des modèles et limites Free du compte; il effectue au plus un appel minimal, n’affiche aucun secret ou modèle et ne retente pas. Les deux tests se marquent `SKIPPED` sans configuration complète et ne sont pas inclus dans le test d’intégration général.

`pnpm test:integration:openrouter` exige `OPENROUTER_TEST_FREE_CONFIRMED=true` après vérification du modèle exact et de ses limites de compte; les disponibilités des modèles gratuits, leurs plafonds et les crédits promotionnels peuvent varier. Le test utilise uniquement le modèle OpenRouter déjà présent dans le catalogue, envoie une requête courte unique et ne retente pas. Il faut confirmer que le modèle sélectionné est bien gratuit et que le test ne consommera pas de solde payant.

`pnpm test:integration:mistral` ne s’exécute réellement qu’avec `MISTRAL_API_KEY`, un modèle du catalogue et `MISTRAL_TEST_FREE_CONFIRMED=true`. Mistral Free repose sur une allocation mensuelle partagée et limitée, non sur une gratuité illimitée; vérifier le solde et les limites du Workspace dans Admin avant de confirmer. Le test envoie une requête minimale unique et ignore toute allocation qui ne serait pas confirmée.

### Quotas et périmètre restant

Le système existant `003_daily_credit_quota.sql` attribue 100 crédits quotidiens non cumulables à tous les comptes, en plus des règles de portefeuille déjà en place; cette livraison n’invente pas un quota Pro supérieur. Le rôle `premium` côté serveur autorise les modèles dont `plans` contient `PRO`, mais ne crée pas à lui seul un plafond commercial distinct. Aucun quota « un PDF par jour » n’est appliqué pour l’instant : le dépôt ne comporte pas de route de traitement PDF intégrée au Chat, ni de flux de consommation auquel raccorder un compteur atomique. Avant d’activer les documents, ajouter ce pipeline et une RPC de quota Free atomique (idempotence, simultanéité, règles de consommation après échec), puis ses tests de concurrence. Ne pas faire passer un PDF par le Chat texte en attendant.

Dans un environnement sans clé fournisseur et catalogue explicite, le Chat reste connecté à l’authentification et aux crédits, mais aucune génération IA réelle ne peut démarrer. Les tests unitaires utilisent uniquement des fournisseurs simulés; ils ne valident pas un appel externe.
