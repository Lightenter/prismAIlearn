# Plan — unité 2 : implémentation du socle PrismAI

## Objectif

Transformer le socle API minimal en monorepo exécutable aligné sur l’architecture validée : frontend Next.js dark neon, API/route SSE, contrats de run, Supabase/Auth/RLS/RPC, routeur IA indépendant du frontend, BlobStore R2, Evidence, crédits réservables et tests locaux.

## Fichiers et dossiers concernés

- Racine : `package.json`, `pnpm-workspace.yaml`, `turbo.json`, TypeScript, ESLint, `.env.example` et lockfile.
- `apps/web` : shell, landing, auth, chat, studios, dashboard, routes API et manifeste des routes.
- `apps/api`, `apps/workers`, `apps/edge` : points d’entrée stateless et traitements bornés.
- `packages/contracts`, `domain`, `db`, `authz`, `chat-runtime`, `provider-router`, `tools-runtime`, `evidence`, `blobstore`, `observability`, `ui` : couches séparées et importables.
- `supabase/migrations/001_init.sql` : tables métier, tenancy, RLS, trigger Auth et RPC crédits.
- `infra/` : contrats R2/LiteLLM/Redis/CI sans prétendre qu’un service externe a été validé.
- `tests/` et `docs/` : contrats, unités métier, fixtures, threat model, runbooks et traçabilité.

## Modifications prévues

1. Conserver les documents d’architecture et l’image de référence existants.
2. Reprendre le socle TypeScript déjà vérifié et supprimer toute dépendance MongoDB.
3. Séparer classification `TEXT/CODE/IMAGE/VIDEO/DOCUMENT/AGENT/SEARCH` et sélection de provider.
4. Introduire un protocole SSE versionné (`run.started`, `message.delta`, `run.completed`, `run.failed`) avec séquence et idempotency key.
5. Modéliser la réservation de crédits et les remboursements côté domaine et Supabase ; aucun débit ne vient du navigateur.
6. Préparer les structures tenant/org/RBAC et les politiques RLS deny-by-default.
7. Utiliser R2 derrière `BlobStore`, avec préfixes `incoming`, `derived`, `evidence`, `exports` et URLs signées.
8. Refléter la référence frontend mobile-first sombre : bleu nuit, bordures électriques, gradient violet/cyan, focus/erreur/loading accessibles.
9. Exécuter lint, typecheck, tests et build ; documenter les limites des intégrations externes non configurées.

## Critères d’acceptation

- `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test` et `pnpm build` sont exécutables dans le dépôt cible.
- Aucun code ne contient de connexion ou package MongoDB.
- Les pages landing/auth/chat/dashboard/studios existent et n’exposent aucun secret.
- Les contrats de run/SSE, le routeur de capacité/provider, les crédits réservables et Evidence ont des tests locaux.
- La migration Supabase contient tenancy, RLS, RPC atomiques et idempotence de paiement/run.
- Le README, TODO et plan distinguent les intégrations réellement testées des adaptateurs préparés.

## Limites de cette unité

L’application ne déclare pas comme opérationnels les providers, Supabase, R2, Campay, Redis ou LiteLLM tant que leurs environnements de staging ne sont pas configurés et testés. La génération vidéo/musique et les plugins/MCP privilégiés restent bornés ou explicitement indisponibles.
