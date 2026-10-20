# PrismAI — cadrage technique SaaS

Ce dépôt contient le cadrage initial demandé pour PrismAI, avant toute implémentation applicative.

> **Toutes les IA. Un seul Prisme.**

## Contenu

- [`docs/prismai-architecture-report.md`](docs/prismai-architecture-report.md) : matrice des références, architecture cible, arborescence, dépendances, risques, décisions à approuver, plan de tests et feuille de route.
- [`docs/source-requirements.txt`](docs/source-requirements.txt) : copie du cahier des charges fourni pour assurer la traçabilité.

## Statut

Étape de cadrage uniquement. Aucun code de production, aucune clé secrète, aucun déploiement Supabase/Cloudflare/fournisseur IA et aucun test end-to-end n’a été exécuté dans ce dépôt.

Les affirmations du rapport sont marquées `OBSERVÉ`, `PROPOSÉ` ou `NON VÉRIFIÉ` / `NON VÉRIFIABLE`. Les références open source ne sont pas copiées dans ce dépôt ; leurs licences et leurs dépendances doivent être revues avant toute réutilisation de code.

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
