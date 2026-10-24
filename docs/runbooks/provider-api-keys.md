# Clés API des fournisseurs IA

Utiliser ce guide uniquement pour un environnement local ou un staging isolé. Ne jamais placer une clé dans le code client, une variable `NEXT_PUBLIC_*`, une capture d’écran, un commit, un log ou un message de chat. En local, un fichier `.env.local` ignoré par Git est une option; un gestionnaire de secrets ou les variables d’environnement de l’hébergeur conviennent aussi.

## Variables attendues

| Fournisseur | Variable serveur | Endpoint de référence | Capacité à déclarer après test |
|---|---|---|---|
| Groq | `GROQ_API_KEY` | `https://api.groq.com/openai/v1/chat/completions` | texte/code selon le modèle réellement activé |
| Gemini | `GEMINI_API_KEY` | API Gemini `generateContent` | texte/vision selon le modèle et le compte réellement activés |
| OpenRouter | `OPENROUTER_API_KEY` | `https://openrouter.ai/api/v1/chat/completions` | capacités du modèle sélectionné, jamais supposées |
| Mistral | `MISTRAL_API_KEY` | `https://api.mistral.ai/v1/chat/completions` | capacités et allocation du Workspace à confirmer |
| Cloudflare Workers AI | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions` | modèle exact et quota account à vérifier; `creditClass` existante obligatoire |
| Hugging Face Inference Providers | `HF_TOKEN` avec permission `inference.serverless.write` | `https://router.huggingface.co/v1/chat/completions` | pas de crédit d’inférence en plan Free; modèle possiblement `is_free` temporaire; `creditClass` obligatoire |
| SambaNova Cloud | `SAMBANOVA_API_KEY` | `https://api.sambanova.ai/v1/chat/completions` | quotas Free par modèle à confirmer dans le compte; `creditClass` obligatoire |

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
- Les nouveaux providers n’ont pas de barème implicite : définir une classe de crédits interne déjà existante ou laisser leur modèle désactivé. Cela n’ajoute ni ne modifie aucun taux.

## Test réel Gemini

Le provider Gemini est désactivé sans `GEMINI_API_KEY` et modèle explicite Gemini dans `PRISMAI_ROUTING_CATALOG`. Le runtime transmet la clé via l’en-tête `x-goog-api-key`, jamais dans l’URL. Pour autoriser un test réseau ponctuel, confirmer d’abord dans AI Studio que le modèle configuré et le quota du compte sont bien gratuits, puis définir `GEMINI_TEST_FREE_CONFIRMED=true` dans l’environnement d’exécution et lancer `pnpm test:integration:gemini`. Le script fait une seule requête non sensible, ne réessaie pas et ne journalise ni la clé, ni le modèle, ni le texte généré. En l’absence de clé, de modèle ou de confirmation, il retourne `SKIPPED`. Cette validation réelle reste à effectuer avant de déclarer Gemini opérationnel dans PrismAI.

## Test réel Groq

Le provider Groq est désactivé sans `GROQ_API_KEY` et modèle explicitement configuré. La clé est transmise par Bearer dans l’en-tête HTTPS, jamais dans l’URL. Avant `pnpm test:integration:groq`, vérifier dans GroqCloud que le modèle exact est accessible et que le compte dispose du quota Free, puis définir `GROQ_TEST_FREE_CONFIRMED=true`. Le test envoie une requête courte unique, sans retry et sans données sensibles; il n’affiche ni clé, ni modèle, ni réponse. Sans configuration ou confirmation, il retourne `SKIPPED`. Une valeur de clé déjà exposée dans un message doit être révoquée et remplacée avant tout essai.

## Test réel OpenRouter

OpenRouter n’est activé qu’avec `OPENROUTER_API_KEY` et une entrée de modèle explicite. Avant `pnpm test:integration:openrouter`, vérifier que le modèle catalogué porte bien une offre gratuite active pour ce compte et que l’appel ne peut pas consommer de crédits payants ou d’essai. Définir ensuite `OPENROUTER_TEST_FREE_CONFIRMED=true`. Les modèles gratuits et leurs limites sont susceptibles d’évoluer; le test effectue une seule petite requête, sans retry ni journalisation de clé, modèle ou réponse. Sans clé, modèle ou confirmation, il se marque `SKIPPED`.

## Test réel Mistral

L’offre Mistral Free est une allocation mensuelle partagée du Workspace, pas une gratuité illimitée. Avant `pnpm test:integration:mistral`, vérifier dans Mistral Admin le modèle précis, le solde restant et les limites d’usage, puis définir `MISTRAL_TEST_FREE_CONFIRMED=true` seulement si l’appel reste dans cette allocation gratuite. Le test exige également `MISTRAL_API_KEY` et un modèle explicitement catalogué; il fait une requête courte, sans retry ni sortie de secret. Sans confirmation, il retourne `SKIPPED`.

## Test réel Cloudflare Workers AI

Cloudflare requiert `CLOUDFLARE_ACCOUNT_ID` et un API Token serveur limité aux droits Workers AI nécessaires. Le modèle doit être explicite dans `PRISMAI_ROUTING_CATALOG` et inclure `creditClass` parmi les classes PrismAI déjà tarifées (`groq`, `gemini`, `openrouter`, `mistral`); à défaut, il est ignoré et aucun appel ne démarre. Cette classe régit uniquement les crédits PrismAI et ne prétend pas reproduire le prix Cloudflare. Le quota documenté est de 10 000 neurons par compte et par jour, avec exceptions possibles selon le modèle et le plan. Confirmer dans le dashboard que le modèle précis reste dans le quota gratuit et qu’aucune facturation Workers Paid/crédit prépayé ne sera déclenchée, puis définir `CLOUDFLARE_TEST_FREE_CONFIRMED=true` et lancer `pnpm test:integration:cloudflare`. Le script effectue au plus une requête minimale sans retry ni journalisation du token, du compte ou du modèle.

## Test réel SambaNova Cloud

SambaNova utilise un endpoint compatible OpenAI, mais les quotas Free et les conditions de plan varient selon le modèle et ne sont pas formulés de manière entièrement cohérente dans les pages consultées. Définir `SAMBANOVA_API_KEY` et cataloguer explicitement le modèle avec une `creditClass` PrismAI; cette classe interne ne reproduit pas les coûts SambaNova. Vérifier directement dans le compte le modèle, la disponibilité du Free Tier et le quota restant avant de définir `SAMBANOVA_TEST_FREE_CONFIRMED=true`. Le test `pnpm test:integration:sambanova` envoie alors une seule requête minimale, sans retry ni journalisation de la clé, du modèle ou de la réponse. Sinon, il retourne `SKIPPED`.

## Test réel Hugging Face Inference Providers

Le plan Free Hugging Face n’inclut aucun crédit d’inférence; certains modèles peuvent néanmoins être marqués temporairement `is_free`. Créer un token finement limité avec permission `inference.serverless.write`, puis cataloguer le modèle exact et une `creditClass` PrismAI déjà tarifée. Cette classe sert uniquement au calcul interne de crédits et ne reproduit pas le prix Hugging Face. Avant le test, vérifier dans l’interface Hugging Face que le modèle reste gratuit et que l’appel n’utilisera ni crédit payant ni crédit d’essai. Définir `HF_TEST_FREE_CONFIRMED=true` uniquement après cette vérification, puis exécuter `pnpm test:integration:huggingface`. Une seule petite requête est envoyée, sans retry ni journalisation du token, du modèle ou de la réponse. Sans clé, modèle ou confirmation, le script retourne `SKIPPED`; ce n’est pas une validation réelle tant que le test n’a pas passé sur le compte visé.
