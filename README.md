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

Appliquer `supabase/migrations/001_init.sql` sur un projet de staging avant production. La migration couvre profils, organisations, conversations, messages/parts, runs, comptes crédits, opérations, paiements, pièces jointes et Evidence, avec RLS et RPC atomiques. Les fonctions de crédits utilisent les états `CREATED`, `RESERVED`, `PROCESSING`, `COMPLETED` et `FAILED`.

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
- La réservation de crédits est prête côté domaine/SQL ; les règles commerciales Free/Pro/Créateur et CinetPay/Stripe restent configurables mais non activées.
- LiteLLM est documenté comme gateway optionnelle derrière le routeur PrismAI, jamais comme source d’autorité tenant/billing.

## Licences et réutilisation

Le code PrismAI reste original et n’embarque pas de copie de LibreChat, Open WebUI, LobeHub, REA, Vercel AI SDK, LiteLLM ou Workers SDK. Le dépôt réutilise des patterns publics documentés après revue des licences signalées dans le rapport d’architecture. Toute future adaptation de code tiers devra conserver les notices et être validée fichier par fichier.

## Validation des intégrations

Les scripts non destructifs `scripts/integration/test_supabase_connection.mjs` et `scripts/integration/test_r2_connection.mjs` valident respectivement les endpoints Supabase et le cycle temporaire Put/Head/Get/Delete R2. Ils retournent `SKIPPED` si les variables requises sont absentes et ne journalisent jamais les secrets. Utiliser `pnpm test:integration`, `pnpm test:integration:supabase` ou `pnpm test:integration:r2`. Le guide des clés Groq, Gemini et OpenRouter est dans [`docs/runbooks/provider-api-keys.md`](docs/runbooks/provider-api-keys.md).

## Authentification du chat

Les routes `/api/chat` et `/api/chat/stream` vérifient la session Supabase côté serveur avant d’exécuter un run. L’identifiant transmis au runtime vient exclusivement de `supabase.auth.getUser()` ; un `userId` envoyé par le navigateur est ignoré. Une session absente ou invalide retourne `401 UNAUTHORIZED`, sans divulguer les détails du jeton ou de la base.


## Durcissement sécurité MVP

La migration additive [`supabase/migrations/002_security_hardening.sql`](supabase/migrations/002_security_hardening.sql) ajoute le RBAC `user`/`premium`/`admin`, protège le changement de rôle par RLS, révoque les RPC de crédits pour les JWT utilisateur et réserve les crédits via des verrous PostgreSQL. Le runtime suit désormais `reserve_credits → provider → complete_credits` ou `refund_credits`; la clé d’idempotence doit être conservée lors d’un retry HTTP via l’en-tête `Idempotency-Key`.

Les cookies Supabase SSR sont httpOnly et Secure hors développement. La rotation des refresh tokens est déléguée à `@supabase/ssr` et déclenchée par la vérification serveur `auth.getUser()`. Le rate limiting chat est atomique en base, à 30 requêtes par utilisateur et par fenêtre de 60 secondes. Le client DB backend refuse tout fallback vers la clé anon publique.

Les routes `/api/webhooks/stripe`, `/api/webhooks/campay` et `/api/webhooks/cinetpay` vérifient la signature du corps brut avant parsing, valident le payload et dédupliquent les transactions par `tx_id` via `credit_payment_v2`. Les secrets `STRIPE_WEBHOOK_SECRET`, `CAMPAY_WEBHOOK_SECRET` et `CINETPAY_WEBHOOK_SECRET` sont strictement serveur. Les messages sont validés par Zod, nettoyés des caractères de contrôle et rendus par React sans HTML non échappé; le corps brut d’un webhook n’est jamais sanitizé avant vérification cryptographique.

Avant application en production, exécuter la migration 002 sur un projet Supabase de staging isolé et réaliser les tests transactionnels réels avec deux sessions/utilisateurs. Les tests locaux vérifient les contrats et mocks, mais ne prouvent pas à eux seuls les garanties de concurrence PostgreSQL.
