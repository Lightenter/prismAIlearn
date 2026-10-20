# PrismAI — cadrage technique SaaS

Ce dépôt contient le cadrage initial demandé pour PrismAI, avant toute implémentation applicative.

> **Toutes les IA. Un seul Prisme.**

## Contenu

- [`docs/prismai-architecture-report.md`](docs/prismai-architecture-report.md) : matrice des références, architecture cible, arborescence, dépendances, risques, décisions à approuver, plan de tests et feuille de route.
- [`docs/source-requirements.txt`](docs/source-requirements.txt) : copie du cahier des charges fourni pour assurer la traçabilité.

## Statut

Étape de cadrage uniquement. Aucun code de production, aucune clé secrète, aucun déploiement Supabase/Cloudflare/fournisseur IA et aucun test end-to-end n’a été exécuté dans ce dépôt.

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
