# TODO — PrismAI

## Livré dans cette unité

### Socle exécutable et reproductible

- Initialiser le monorepo avec `package.json` et `pnpm-workspace.yaml`.
- Fournir un `.env.example` sans secret réel.
- Créer l’application API minimale avec `GET /health`.
- Retourner une erreur JSON `404` explicite pour toute route inconnue.
- Ajouter les tests automatisés du contrat de santé et de la route inconnue.
- Documenter les fichiers, les commandes, les résultats et les limites dans le README.

## À venir après validation

### Authentification et autorisation

- Implémenter l’inscription, la connexion, la session et les routes privées avec Supabase Auth.
- Définir le modèle tenant/org/rôles et les politiques RLS.
- Ajouter les tests d’isolation entre utilisateurs et tenants.

### Conversation et streaming

- Définir les contrats Conversation, MessagePart et Run.
- Ajouter le premier parcours de chat avec streaming SSE, arrêt, reprise et idempotence.
- Tester les erreurs, les reconnexions et la finalisation unique.

### Routage et fournisseurs IA

- Définir `ProviderAdapter` et la matrice de capacités réelle.
- Décider LiteLLM séparé ou routeur interne.
- Ajouter les timeouts, retries bornés, fallbacks, budgets et journaux de décision.

### Crédits, fichiers et studios

- Concevoir le ledger de crédits côté serveur et ses tests de concurrence.
- Ajouter le BlobStore et l’intégration R2 après validation des choix de sécurité.
- Ajouter les studios MVP un par un, sans simuler une capacité fournisseur absente.

### Paiements et production

- Préparer les webhooks idempotents CinetPay/Stripe.
- Ajouter les tests de sécurité, de résilience, de performance et de déploiement.
