# PrismAI — cadrage technique SaaS

Ce dépôt contient le cadrage initial et le premier socle exécutable de PrismAI. L’implémentation avance par unités cohérentes, documentées et validées.

> **Toutes les IA. Un seul Prisme.**

## Contenu

- [`docs/prismai-architecture-report.md`](docs/prismai-architecture-report.md) : matrice des références, architecture cible, arborescence, dépendances, risques, décisions à approuver, plan de tests et feuille de route.
- [`docs/source-requirements.txt`](docs/source-requirements.txt) : copie du cahier des charges fourni pour assurer la traçabilité.
- [`plan.md`](plan.md) : plan et critères d’acceptation de l’unité courante.
- [`TODO.md`](TODO.md) : résultats livrés et prochaines unités de travail.
- [`apps/api/src/server.mjs`](apps/api/src/server.mjs) : API HTTP minimale avec `GET /health`.
- [`apps/api/src/server.test.mjs`](apps/api/src/server.test.mjs) : tests du contrat de santé et des routes inconnues.
- [`docs/frontend-reference.md`](docs/frontend-reference.md) : analyse de la maquette frontend retrouvée dans Google Drive.
- [`docs/assets/prismai-frontend-reference.png`](docs/assets/prismai-frontend-reference.png) : image de référence visuelle versionnée.

## Statut

Le cadrage est terminé et l’unité 1 est implémentée : monorepo minimal, API locale et tests natifs Node.js. Il n’y a encore aucune authentification, clé secrète, persistance, intégration Supabase/Cloudflare/fournisseur IA, crédit, paiement ou test end-to-end.

La référence frontend a été retrouvée dans Google Drive et enregistrée dans le dépôt. Elle définit une direction mobile-first sombre et néon pour les écrans de connexion, d’inscription et de vérification d’e-mail. Les détails sont décrits dans [`docs/frontend-reference.md`](docs/frontend-reference.md) ; l’image guide l’implémentation mais ne doit pas être copiée pixel par pixel.

## Unité 1 — socle exécutable

Le socle utilise temporairement le module HTTP natif de Node.js pour réduire les dépendances initiales. L’API écoute par défaut sur `127.0.0.1:3001`, expose `GET /health` et retourne `404` avec une erreur JSON normalisée pour toute route inconnue.

Depuis la racine du dépôt, exécuter `node --test` pour lancer les tests. Pour démarrer l’API, exécuter `PRISMAI_API_PORT=3001 node apps/api/src/server.mjs`, puis appeler `http://127.0.0.1:3001/health`. La valeur `PRISMAI_API_PORT` peut être placée dans un environnement local à partir de `.env.example`; aucune valeur secrète n’est requise à cette étape.

Résultat de validation de cette unité : `node --test` a exécuté 2 tests avec 2 succès et 0 échec. Un démarrage réel de l’API a également confirmé `GET /health` en HTTP 200 avec `{"service":"prismai-api","status":"ok"}` et une route inconnue en HTTP 404 avec `{"error":"not_found"}`. `git diff --check` est propre.

Les affirmations du rapport sont marquées `OBSERVÉ`, `PROPOSÉ` ou `NON VÉRIFIÉ` / `NON VÉRIFIABLE`. Les références open source ne sont pas copiées dans ce dépôt ; leurs licences et leurs dépendances doivent être revues avant toute réutilisation de code.

## Règles de développement et de livraison

Ces règles s’appliquent à chaque étape future :

1. Chaque ligne de code ajoutée doit comporter un commentaire expliquant son rôle. Les commentaires doivent rester exacts, utiles et synchronisés avec le comportement réel du code.
2. Avant chaque modification, l’objectif, les fichiers concernés, les changements prévus et les critères d’acceptation doivent être expliqués.
3. Après chaque modification, les tests pertinents doivent être exécutés. Aucun test ne doit être déclaré réussi sans résultat vérifié.
4. Le README doit être mis à jour à chaque étape pour documenter l’état, les commandes, les variables d’environnement, les migrations, les intégrations, les limites et les résultats des tests.
5. Chaque unité de travail doit être livrée dans un commit explicite et poussée dans GitHub après vérification de l’état du dépôt.
6. Aucune vraie clé API, donnée sensible ou valeur secrète ne doit être ajoutée au dépôt ; les exemples utilisent uniquement `.env.example` et des valeurs fictives.
7. Les commentaires ne remplacent ni les tests, ni la documentation d’architecture, ni la validation de sécurité.

## Décisions attendues avant l’implémentation

1. Périmètre MVP et fonctions différées.
2. Stack React/Next.js, API Node.js/TypeScript et protocole SSE.
3. Supabase/PostgreSQL/RLS et modèle tenant/org/rôles.
4. LiteLLM séparé ou routeur interne.
5. R2, juridiction, tokens, lifecycle et contrat de compatibilité S3.
6. Niveau de sandbox pour outils, MCP, plugins et extraction.
7. SLO, RPO/RTO, quotas, rétention, conformité et budget.
8. Avis juridique sur les licences LobeHub, Open WebUI et dépendances tierces.

L’implémentation ne doit commencer qu’après validation de ces choix et du plan du rapport.
