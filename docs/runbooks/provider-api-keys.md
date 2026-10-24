# Clés API des fournisseurs IA

Utiliser ce guide uniquement pour un environnement local ou un staging isolé. Ne jamais placer une clé dans `apps/web`, une variable `NEXT_PUBLIC_*`, une capture d’écran, un commit, un log ou un message de chat.

## Variables attendues

| Fournisseur | Variable serveur | Endpoint de référence | Capacité à déclarer après test |
|---|---|---|---|
| Groq | `GROQ_API_KEY` | `https://api.groq.com/openai/v1/chat/completions` | texte/code selon le modèle réellement activé |
| Gemini | `GEMINI_API_KEY` | API Gemini `generateContent` | texte/vision selon le modèle et le compte réellement activés |
| OpenRouter | `OPENROUTER_API_KEY` | `https://openrouter.ai/api/v1/chat/completions` | capacités du modèle sélectionné, jamais supposées |
| Mistral | `MISTRAL_API_KEY` | `https://api.mistral.ai/v1/chat/completions` | capacités et allocation du Workspace à confirmer |

## Procédure

1. Créer ou ouvrir le projet fournisseur avec le compte de l’équipe et activer uniquement les permissions nécessaires.
2. Générer une clé dédiée à l’environnement (`local`, `staging`, `production`) avec restrictions de quota, origine/IP si le fournisseur le permet et date de rotation documentée.
3. Ajouter la clé uniquement dans le gestionnaire de secrets ou dans un `.env.local` ignoré par Git. Copier le nom de variable, jamais la valeur, dans `.env.example`.
4. Redémarrer le backend/worker après modification. Le navigateur ne doit recevoir que des capacités et statuts abstraits, jamais la clé ou l’endpoint privé si celui-ci révèle une information sensible.
5. Effectuer un appel minimal non sensible avec un prompt de test. Vérifier timeout, erreur 401/403, 429, 5xx, usage et réponse vide. Enregistrer le résultat dans le runbook, sans enregistrer le contenu de la clé.
6. Ajouter le provider à la matrice de capacités seulement après validation de la capacité observée. Le routeur doit choisir d’abord `TEXT`, `CODE`, `IMAGE`, `VIDEO`, `DOCUMENT`, `AGENT` ou `SEARCH`, puis un provider compatible.
7. Définir une limite de retries et un budget avant activation. Ne pas relancer automatiquement une opération payante au résultat incertain ; utiliser l’idempotency key et une procédure de réconciliation.
8. Révoquer l’ancienne clé après rotation et vérifier les logs redigés. Ne jamais transmettre la clé à une sous-tâche ou la demander à l’utilisateur dans un message libre ; utiliser le gestionnaire de secrets prévu par l’environnement.

## Contrôles avant activation

- `GROQ_API_KEY`, `GEMINI_API_KEY` et `OPENROUTER_API_KEY` ne sont pas exposées au bundle Next.js.
- Les erreurs sont normalisées et ne contiennent ni clé, ni header Authorization, ni URL signée.
- Le timeout est borné et le circuit breaker empêche une boucle de retries.
- Le prix/coût est versionné et attribué par tentative, y compris les fallbacks.
- Les capacités non testées sont marquées indisponibles, pas présentées comme garanties.

## Test réel Gemini

Le provider Gemini est désactivé sans `GEMINI_API_KEY` et modèle explicite Gemini dans `PRISMAI_ROUTING_CATALOG`. Le runtime transmet la clé via l’en-tête `x-goog-api-key`, jamais dans l’URL. Pour autoriser un test réseau ponctuel, confirmer d’abord dans AI Studio que le modèle configuré et le quota du compte sont bien gratuits, puis définir `GEMINI_TEST_FREE_CONFIRMED=true` dans l’environnement d’exécution et lancer `pnpm test:integration:gemini`. Le script fait une seule requête non sensible, ne réessaie pas et ne journalise ni la clé, ni le modèle, ni le texte généré. En l’absence de clé, de modèle ou de confirmation, il retourne `SKIPPED`. Cette validation réelle reste à effectuer avant de déclarer Gemini opérationnel dans PrismAI.
