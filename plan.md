# Plan — unité 1 : socle exécutable PrismAI

## Objectif

Initialiser un monorepo reproductible et livrer une API minimale possédant un endpoint de santé testable. Cette unité ne contient ni authentification, ni fournisseur IA, ni crédits, ni stockage de fichiers, ni paiements.

## Fichiers concernés

- `package.json` : scripts et contraintes de runtime du monorepo.
- `pnpm-workspace.yaml` : espaces de travail prévus pour les applications et packages.
- `.env.example` : seule variable locale documentée, sans secret.
- `apps/api/package.json` : manifeste de l’application API.
- `apps/api/src/server.mjs` : serveur HTTP minimal et route `GET /health`.
- `apps/api/src/server.test.mjs` : tests de santé et de route inconnue.
- `apps/web/README.md` : limite explicite de l’application web dans cette étape.
- `README.md` et `TODO.md` : état, commandes, résultats et suite du travail.

## Décisions de cette unité

Le serveur utilise temporairement le module HTTP natif de Node.js afin de réduire la surface de dépendances pendant l’initialisation. L’écoute par défaut est limitée à `127.0.0.1` et le port est configurable par `PRISMAI_API_PORT`. Le passage à TypeScript, au framework HTTP retenu et aux contrats versionnés sera traité dans une unité séparée après validation du socle.

## Critères d’acceptation

Le dépôt doit installer ses outils sans secret réel, lancer les tests avec `node --test`, obtenir un succès sur `GET /health`, retourner `404` pour une route inconnue et rester propre après commit.

## Limites

Le socle n’est pas un SaaS utilisable en production. Il ne fournit encore aucune authentification, autorisation, persistance, observabilité, limitation de requêtes, streaming IA ou protection de données métier.
