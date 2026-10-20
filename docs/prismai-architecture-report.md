# PrismAI — rapport d’architecture et d’adaptation

> **Statut des affirmations.** `OBSERVÉ` désigne un élément lu dans les résultats vérifiés et leurs sources directes. `PROPOSÉ` désigne une adaptation ou une décision de conception PrismAI. `NON VÉRIFIÉ` / `NON VÉRIFIABLE` désigne une information non établie par le périmètre fourni. Les fonctionnalités des références ne sont pas des engagements de PrismAI.

## 1. Matrice synthétique des références

| Référence / dépôt | Fonctionnalité | Modules vérifiés | Comportement observé | Adaptation PrismAI | Dépendances | Licence | Tests | Risques |
|---|---|---|---|---|---|---|---|---|
| **LibreChat** — [github.com/LibreChat-AI/LibreChat](https://github.com/LibreChat-AI/LibreChat) | Chat, pièces jointes, agents no-code, outils/MCP, branches/forks, streaming reprenable | `ChatForm.tsx`, tests attachments, `TextStream.js`, `StreamRunManager.js`, routes agents/files, `agent.ts` | `OBSERVÉ` : composer + palette, queue/steer/stop, parts d’événements SSE, ACL agent/fichier, upload conditionné par MIME/endpoint/configuration. Reprise documentée, non exécutée. | `PROPOSÉ` : contrats `Conversation/Message/MessagePart/Run/Attachment`, SSE typé, BlobStore R2, workers extraction, agent builder borné et approbation humaine. | Node/Express, React/Vite, Mongo/Mongoose, OpenAI/MCP; Redis requis en multi-instance; OCR/STT/RAG/Code Interpreter et providers configurables. | MIT observée; conserver notices; licences des dépendances à auditer. | `OBSERVÉ` : suites composer/attachments/routes; non exécutées. `PROPOSÉ` : contrats SSE, reprise, ACL, quotas, pannes provider/Redis. | Cluster et duplication de flux; explosion de surface agents/MCP; différences providers; données sensibles; R2 non identique à S3. |
| **REA** — [github.com/morluto/rea](https://github.com/morluto/rea) | Investigation Evidence-first, graphes, captures bornées, reconstruction vérifiable sur claims finis | `src/application`, `src/server`, `src/reference`, `src/evaluation`, `bridge`, `tests` | `OBSERVÉ` : Evidence avec identité, couverture, limites, inconnues et autorité; statique distinct du runtime; `verify_reconstruction` limité à une spécification finie. CLI/MCP local en stdio. | `PROPOSÉ` : ledger append-only d’Evidence, hash/provenance, parentage, couverture et inconnues; bundle portable signé/vérifiable; pipeline d’analyse borné. REA est une méthode, pas le SaaS PrismAI. | Node/TS/ESM, CLI/MCP, outils natifs et bridges variables; outils commerciaux soumis à licences propres. | MIT pour REA; notices/licences tierces conservées. | `OBSERVÉ` : nombreuses familles de tests présentes, non exécutées. `PROPOSÉ` : fixtures, intégrité, refus si preuve partielle, claims finis. | Surinterprétation du statique; couverture incomplète; versions/outils non épinglés; artefacts sensibles; absence démontrée de multi-tenancy/SLO. |
| **Open WebUI** — [github.com/open-webui/open-webui](https://github.com/open-webui/open-webui) | Chat persistant, sidebar/recherche, partage, outils/Functions/MCP, réglages | `Chat.svelte`, `MessageInput.svelte`, `Navbar.svelte`, `Sidebar*`, modèles/routeurs chats/functions, `storage/provider.py` | `OBSERVÉ` : messages/branches, dossiers/tags/pin/archive, extensions Python in-process ou HTTP/MCP, S3 générique, permissions. Self-hosted/offline annoncé. | `PROPOSÉ` : shell de navigation, paramètres personnels/instance/modèle séparés; extensions privilégiées externalisées et sandboxées; isolation tenant/audit/quotas ajoutés. | Svelte/FastAPI dans la référence; Redis/WebSocket, SQLAlchemy, boto3, MCP. Pour PrismAI, ne pas reprendre la stack par défaut sans décision. | Open WebUI License, dérivée BSD-3-Clause avec clause de marque au-delà de 50 utilisateurs/30 jours; divergence avec historique BSD à examiner. | `OBSERVÉ` : scripts Vitest/Cypress/check/lint présents, non exécutés. `PROPOSÉ` : E2E chats, réglages, extensions, R2. | Code Python arbitraire; plugin partage CPU/RAM; contrainte de marque; self-hosted ≠ SaaS multi-tenant; sécurité non benchmarkée. |
| **LobeHub** — [github.com/lobehub/lobehub](https://github.com/lobehub/lobehub) | Agent comme unité de travail, groupes, mémoire, pages/projets/workspaces, skills/plugins, design system | README, `LICENSE`, `DESIGN.md`, manifests/workspaces, listings `src/`, `apps/`, `packages/`, `e2e/` | `OBSERVÉ` : positionnement agents, thèmes/tokens, responsive, états UX, packages déclarés. Docs actuelles partiellement placeholder; implémentations non ouvertes. | `PROPOSÉ` : Agent Profile/Skill/Memory/Topic/Group/Project/Workspace, tokens sémantiques, quatre états UI, fork et synchronisation contrôlée. | pnpm/TS/React/Next/Vite, tRPC, Drizzle, MCP, packages runtime/memory/tool. | Contradiction à résoudre : `LICENSE` Community License basée Apache-2.0 avec condition dérivé commercial; `package.json` déclare MIT. | `OBSERVÉ` : répertoire E2E, non lu/exécuté. `PROPOSÉ` : E2E agent/groupes, visuel, plugins, R2. | Licence contradictoire; canary instable; périmètre large; plugins/MCP et mémoire; preuves docs incomplètes. |
| **Vercel AI SDK** — [github.com/vercel/ai](https://github.com/vercel/ai) | Streaming, UI message parts, tool calling, agents multi-étapes, approbations, reprise UI | `stream-text.ts`, `generate-text/index.ts`, `ui-message-stream/index.ts`, `agent/index.ts`, `use-chat.ts` | `OBSERVÉ` : états submitted/streaming/ready/error, `stop`, `regenerate`, `resumeStream`; parts texte/outils; événements start/step/tool/finish/error; concurrence d’outils par défaut. | `PROPOSÉ` : couche d’exécution frontend/backend, registre de tools Zod/JSON Schema, corrélation des callbacks, persistance durable séparée du statut SDK. | Node >=22, TypeScript, `ai`, `@ai-sdk/react`, Zod; provider concret à choisir. | Apache-2.0. | `OBSERVÉ` : tests unitaires/types présents, non exécutés. `PROPOSÉ` : streams, abort, approvals, concurrence, sécurité et R2. | Erreurs dans le stream; boucles d’approbation; effets de bord concurrents; SDK ne fournit ni tenancy ni audit ni persistance. |
| **LiteLLM** — [github.com/BerriAI/litellm](https://github.com/BerriAI/litellm) | Gateway multi-providers, routage, retries/fallbacks, budgets/coûts | `router.py`, `cost_calculator.py`, `proxy_server.py`, `auth_checks.py`, docs routing/reliability/cost/deploy | `OBSERVÉ` : groupes de modèles, stratégies latency/cost/least-busy/etc., cooldowns, fallback, spend logs, carte de prix, budgets; logging parfois asynchrone. | `PROPOSÉ` : routeur central derrière adaptateur PrismAI; politique retry bornée, attribution par tentative, carte prix versionnée, health state, budgets tenant. | Python Proxy, PostgreSQL pour config/spend, Redis pour cache/rate-limit/état distribué, secrets/migrations. | MIT hors `enterprise/`; ce répertoire a son propre régime. Dépendances à auditer. | Docs de tests fallback à reproduire; `PROPOSÉ` : contrats provider, routage, coûts, pannes Redis/PostgreSQL, sécurité. | Carte prix obsolète/coût zéro; Redis indisponible; retries coût/latence; secret salt non rotatable sans plan; cohérence comptable. |
| **Supabase** — [github.com/supabase/supabase](https://github.com/supabase/supabase) | Auth/JWT, PostgreSQL, Data API, RLS, Realtime, Storage | README/LICENSE, `docker/README`, docs Auth/Database/RLS/API/Storage | `OBSERVÉ` : grants puis RLS; `service_role` contourne RLS; Storage sur `storage.objects`; self-hosting à durcir. | `PROPOSÉ` : source de vérité utilisateurs/orgs/conversations/agents/Evidence, RLS tenant partout, service keys serveur seulement, tests allow/deny. | PostgreSQL, Auth/GoTrue, PostgREST, Realtime, Storage, migrations; offre managée ou self-host à décider. | Apache-2.0 du dépôt principal; dépendances/images non inventoriées. | Docs prescrivent `supabase test db`; `PROPOSÉ` : tests inter-tenant, grants, RPC/SECURITY DEFINER, révocation, Storage/R2. | Mauvais grants/RLS; fonctions/vues security definer; fuite service key; self-host non production-ready; données hors tenant. |
| **Cloudflare Workers SDK** — [github.com/cloudflare/workers-sdk](https://github.com/cloudflare/workers-sdk) | Bootstrap, build/dev/deploy Workers, bindings R2, environnements, CI/CD | `wrangler`, `create-cloudflare`, `miniflare`, docs Wrangler/CI/authorization | `OBSERVÉ` : `wrangler dev/deploy`, `wrangler.jsonc`, bindings par environnement, permissions tokens; Miniflare/workerd est une simulation, pas preuve distante. | `PROPOSÉ` : adaptateur de déploiement et Workers ciblés pour upload/scan/signed URLs; versions et permissions verrouillées. | Node >=22, pnpm, Wrangler/Miniflare/workerd/esbuild, compte Cloudflare et tokens scoped. | Apache-2.0/MIT selon composants; R2 n’hérite pas de ces licences. | Scripts unit/e2e/type tests présents, non exécutés. `PROPOSÉ` : schéma config, build, bindings, staging et rollback. | Releases beta; workerd local non sandbox durci; bindings incomplets; identité Worker/routes incohérente. |
| **Cloudflare R2** — [developers.cloudflare.com/r2/](https://developers.cloudflare.com/r2/) | Stockage objets, URL présignées, tokens bucket-scoped, lifecycle/lock, CORS | docs tokens, S3 API/presigned, Workers binding, CORS/public, locks/lifecycle/logs | `OBSERVÉ` : buckets privés par défaut, AES-256 au repos, TLS, endpoint S3 région `auto`, URL 1 s–7 j réutilisable, S3 partiel; logs best-effort. | `PROPOSÉ` : BlobStore R2 derrière API PrismAI; clés tenant générées serveur, URL courtes, MIME/tailles signés, audit applicatif, lifecycle par classe. | Compte/bucket, token Object R/W scoped, endpoint/juridiction, SDK SigV4 ou binding, CORS/Access; scan et métadonnées PrismAI hors R2. | Non applicable comme licence de dépôt : service propriétaire; conditions Cloudflare à examiner. | `PROPOSÉ`, non exécuté : presigned/CORS/permissions/tenant/locks/lifecycle/compatibilité S3. | Bearer tokens réutilisables; exposition publique; S3 non identique; logs incomplets; lifecycle asynchrone; absence native de DLP/antivirus. |

## 2. Architecture cible PrismAI

### 2.1 Vue logique

```text
Navigateur
  └─ Frontend React/Next.js (shell, chat, agents, Evidence, settings)
       └─ API PrismAI / BFF (Node.js/TypeScript)
            ├─ AuthN/AuthZ : Supabase Auth + claims + RLS
            ├─ Domaine : conversations, runs, agents, tools, Evidence, quotas
            ├─ Stream Gateway : UI message parts/SSE, resume, stop, idempotence
            ├─ Policy/Approval : permissions, human-in-the-loop, audit
            ├─ BlobStore adapter ── R2 (presigned/binding, objets privés)
            ├─ Extraction/scan workers ── texte/OCR/STT/RAG optionnels
            └─ Provider Router adapter ── LiteLLM Proxy ── fournisseurs LLM
                                      └─ Redis (état distribué, rate-limit, reprise)
```

### 2.2 Frontend — `PROPOSÉ`

- React/Next.js + TypeScript, avec une UI construite par PrismAI; le choix s’appuie sur le Vercel AI SDK et les patterns observés dans LibreChat/LobeHub, **sans copier de code**.
- Shell : sidebar conversations, recherche/tags, agents/workspaces, états mobile/desktop, thème clair/sombre, focus clavier et `prefers-reduced-motion`.
- Chat : messages en `parts`, statut `submitted/streaming/ready/error`, événements outil/raisonnement/résultat, queue/stop/retry/regenerate/resume. Le protocole métier durable ne doit pas dépendre uniquement de `useChat`.
- Agent/Evidence : builder borné, sources/outils visibles, chronologie de run, couverture/limitations/inconnues et distinction stricte observation/proposition/non vérifié.

### 2.3 Backend et exécution — `PROPOSÉ`

- API Node.js/TypeScript stateless : REST ou RPC interne versionné; SSE pour le flux utilisateur. Les contrats doivent être indépendants de LiteLLM, R2 et du fournisseur.
- Services de domaine : `conversation`, `run`, `agent`, `tool-policy`, `attachment`, `evidence`, `usage/billing`, `audit`.
- `Run` durable avec `run_id`, séquence d’événements, état, tentative fournisseur, `tool_call_id`, idempotency key et finalisation. Redis sert de relais/état partagé, **pas d’archive**.
- Workers isolés pour extraction, OCR/STT, indexation et tâches longues. La sandbox, la limite d’étapes, les timeouts, les quotas et l’approbation humaine sont obligatoires pour les outils privilégiés.
- L’architecture n’affirme pas un scheduler, une file ou un runtime sandbox précis : choix à valider selon le cahier des charges opérationnel.

### 2.4 Supabase — `PROPOSÉ`

- Supabase Auth pour identité; PostgreSQL comme source de vérité pour tenants/organisations, membres, conversations, messages/parts, runs, agents, tools, attachments, Evidence, audit et usages.
- RLS sur toute table exposée : tenant/org dans les claims et vérification `auth.uid()`; grants minimaux; tests négatifs inter-tenant.
- `service_role`/secret keys uniquement côté backend/workers; jamais dans navigateur, logs ou dépôt. Fonctions RPC, vues et `SECURITY DEFINER` traitées comme surfaces privilégiées séparées.
- Realtime n’est pas automatiquement retenu pour le token de génération : le premier protocole cible SSE, avec Realtime éventuellement pour notifications/presence après validation de charge.

### 2.5 R2 — `PROPOSÉ`

- `BlobStore` abstrait : `put/get/head/list/delete/presign`, hash, MIME, taille, tenant, statut de scan, rétention et version de schéma dans PostgreSQL.
- Buckets privés; préfixes par environnement/tenant/type (`incoming`, `derived`, `evidence`, `exports`). URL présignées courtes, clé générée serveur, `Content-Type` signé et limites appliquées par PrismAI. Une URL R2 est un bearer token réutilisable jusqu’à expiration.
- Token R2 Object Read/Write limité au bucket pour le service applicatif; administration séparée. CORS allowlist exacte; pas de `r2.dev` en production. Les locks/lifecycle doivent être réservés aux données dont l’immuabilité et le délai asynchrone sont acceptés.
- R2 ne remplace ni antivirus/DLP, ni métadonnées d’autorisation, ni audit durable, ni sauvegarde/RPO. Les écarts S3 doivent être contractuellement testés.

### 2.6 Fournisseurs et routeur — `PROPOSÉ`

- `ProviderAdapter` PrismAI normalise modèle, capabilities, tokens, streaming, tool calling, erreurs, usage et coût; aucune compatibilité fournisseur n’est présumée.
- LiteLLM Proxy est l’option de routeur à évaluer : model groups, retries/fallbacks, cooldown/health, budgets et coûts. Il doit rester derrière la policy PrismAI et ne pas devenir la source d’autorité des tenants.
- Carte de prix versionnée avec provenance et date; attribution par tentative, y compris fallback; limites de retries et budget avant exécution. Redis pour état distribué et PostgreSQL durable pour audit/spend.
- Les capacités OCR/STT/RAG/Code Interpreter, MCP, web search et actions restent **configurables/non garanties**; chaque outil reçoit un scope, un schéma, timeout, quota, idempotence, approbation et journal d’exécution.

## 3. Arborescence cible proposée

```text
prismai/
├─ apps/
│  ├─ web/                         # Next.js/React : shell, chat, agents, Evidence
│  ├─ api/                         # API/BFF Node.js/TypeScript, SSE, auth policy
│  ├─ workers/                     # extraction, scan, OCR/STT/RAG, jobs bornés
│  └─ edge/                        # Workers Cloudflare optionnels : upload/proxy ciblé
├─ packages/
│  ├─ contracts/                   # OpenAPI/JSON Schema, SSE/UI message parts
│  ├─ domain/                      # entités, règles, statuts, permissions
│  ├─ db/                          # migrations Supabase, types, RLS/grants/tests
│  ├─ authz/                       # tenant/org/RBAC/policies et audit decisions
│  ├─ chat-runtime/                # runs, parts, stop/resume, idempotence
│  ├─ provider-router/             # adapter LiteLLM/providers, capabilities, coûts
│  ├─ tools-runtime/               # registre, validation, sandbox/approval
│  ├─ evidence/                    # ledger, hashes, provenance, coverage, export
│  ├─ blobstore/                   # interface + adapter R2 + fake/local test
│  ├─ observability/               # corrélation, métriques, redaction
│  └─ ui/                          # design tokens, composants PrismAI accessibles
├─ supabase/
│  ├─ migrations/
│  ├─ seed/
│  └─ tests/                       # supabase test db, RLS/grants/rpc
├─ infra/
│  ├─ cloudflare/                  # wrangler.jsonc, R2, bindings, envs
│  ├─ litellm/                     # config routeur, model groups, price map
│  ├─ redis/
│  └─ ci/
├─ tests/
│  ├─ contract/                    # SSE, providers, R2, schemas
│  ├─ integration/                 # Supabase, Redis, LiteLLM, R2
│  ├─ e2e/                         # parcours utilisateur et agents
│  ├─ security/                    # tenant, SSRF, secrets, prompt injection
│  └─ fixtures/                    # artefacts/Evidence versionnés et hashes
├─ docs/
│  ├─ adr/
│  ├─ threat-model/
│  ├─ runbooks/
│  └─ traceability/
└─ package.json / pnpm-workspace.yaml / README.md
```

Les noms sont **proposés**; aucune arborescence PrismAI n’est observée dans les références.

## 4. Dépendances envisagées

### MUST — nécessaires au socle proposé

| Dépendance | Justification et statut |
|---|---|
| Node.js/TypeScript + monorepo pnpm | `PROPOSÉ`; cohérent avec Vercel AI SDK, LibreChat, LobeHub et Workers SDK. Version exacte à verrouiller; AI SDK observe Node >=22, d’autres références ont des bornes différentes. |
| React/Next.js + Vercel AI SDK | `PROPOSÉ`; streaming, parts, tool calling et états UI observés dans le SDK. |
| Supabase Auth + PostgreSQL/RLS/migrations | `PROPOSÉ`; identité, source de vérité et isolation tenant. |
| API PrismAI stateless + SSE typé | `PROPOSÉ`; contrat de run et reprise à maîtriser côté PrismAI. |
| Adaptateur Provider + au moins un fournisseur LLM | `MUST` fonctionnel mais fournisseur précis `À VALIDER`; coûts/capacités ne sont pas établis. |
| Redis en multi-instance | `OBSERVÉ/PROPOSÉ` selon chemin : documenté comme nécessaire pour plusieurs instances LiteLLM et reprise/état distribué; non requis pour un mono-instance minimal. |
| R2 ou BlobStore équivalent | `PROPOSÉ` par le cadrage; R2 n’est pas observé dans les dépôts. À retenir si pièces jointes/artifacts externes sont requis. |
| Modèle de policy/audit/tenant | `MUST` d’architecture PrismAI; aucune référence ne fournit automatiquement ces garanties SaaS. |

### SHOULD — fortement recommandé

| Dépendance/capacité | Raison |
|---|---|
| LiteLLM Proxy | Routage, fallback, budgets/coûts multi-providers observés; déploiement et version à évaluer. |
| Zod/JSON Schema + contrats générés | Validation des tools, messages et SSE; Zod est observé comme peer du SDK. |
| Workers isolés pour extraction/scan | Séparer CPU, secrets et contenus non fiables de l’API; détail de queue à choisir. |
| Observabilité corrélée | `tenant_id/run_id/message_id/attempt/tool_call_id/object_key`, traces redigées, métriques coût/latence/erreur. |
| Tests RLS et contrats dans CI | Risque majeur de fuite inter-tenant et de divergence provider/R2. |
| Design tokens/accessibilité | Principes observés dans LobeHub; à implémenter dans la couche UI PrismAI. |
| Hash/provenance/Evidence ledger | Méthode REA proposée pour rendre les conclusions traçables et exportables. |

### À VALIDER avant engagement

- Fournisseur(s) LLM, régions, données autorisées, capacités tool/vision/audio, limites, SLA et tarification.
- LiteLLM en service séparé ou SDK intégré; base dédiée ou schéma séparé; mode de défaillance Redis/PostgreSQL.
- R2 managé, autre objet storage ou Supabase Storage; région/juridiction, lifecycle, lock, CORS, sauvegarde et budget.
- Queue/scheduler/sandbox précis (et niveau d’isolation) pour jobs, MCP, Code Interpreter, OCR/STT et RAG.
- Realtime Supabase vs SSE uniquement; besoin réel de multi-onglets/multi-appareils.
- Scope MVP : agents, mémoire, groupes, MCP/actions, web search, RAG, audio, partage, planning et billing.
- Politique de conservation, suppression, chiffrement applicatif, résidence, conformité et droit d’audit.
- Licence d’adaptation/redistribution de LobeHub et Open WebUI; inventaire SBOM de toutes les dépendances.

## 5. Risques techniques et mesures

| Risque | Niveau | Mesure proposée |
|---|---:|---|
| Fuite inter-tenant via RLS/grants/service keys | Critique | RLS systématique, grants minimaux, service keys backend-only, tests allow/deny et revue des fonctions/vues privilégiées. |
| Exécution d’outils/MCP/plugin non autorisée | Critique | Registre allowlisté, scopes, schémas, timeouts, quotas, sandbox séparé, approbation, audit, blocage SSRF/command execution; pas de Python arbitraire in-process par défaut. |
| Reprise/duplication/ordre de stream | Élevé | `run_id` + séquence monotone + idempotence, journal durable, Redis pour coordination, tests coupure/deux onglets/reconnexion et déduplication. |
| Différences de capacités fournisseurs | Élevé | Capability matrix, adapters contractuels, fallback borné, tests par provider, affichage explicite des limitations. |
| Coûts erronés avec retries/fallbacks | Élevé | Carte prix versionnée, attribution par tentative, budgets pré-check/post-check, alertes coût zéro, archive durable hors Redis. |
| R2 pris pour un S3 complet | Élevé | Adapter limité aux opérations validées, test contractuel ACL/KMS/Object Lock/multipart/checksums, refus explicite des features non supportées. |
| URL présignée ou bucket public exposé | Élevé | Buckets privés, tokens scoped, URL courte et clés serveur, CORS stricte, pas de secrets navigateur, tests 401/403 et domaine/Access. |
| Contenu uploadé sensible ou malveillant | Élevé | Scan MIME/antivirus/DLP hors R2, quarantaine avant usage, limites taille, hash, redaction logs, rétention et suppression vérifiable. |
| REA/statique surinterprété comme preuve | Élevé | Champs `observed/proposed/unknown`, autorité/couverture/limitations obligatoires, claims finis, refus de conclure à l’équivalence globale. |
| Licences incompatibles | Élevé | Revue juridique fichier par fichier, notices/SBOM, verrouillage de commit/release, pas de dérivé LobeHub/Open WebUI avant résolution des contradictions. |
| Dépendances mouvantes/canary | Moyen/élevé | Pin commit/release, lockfile, artefacts reproductibles, scans CI, tests de migration et ADR datées. |
| Absence de garanties SaaS dans les références | Critique | Concevoir explicitement tenancy, IAM, quotas, billing, sauvegarde, SLO, reprise, support et runbooks; ne pas les attribuer aux dépôts. |

## 6. Décisions nécessitant approbation

1. **Périmètre MVP** : chat multi-provider + pièces jointes + agents/Evidence, ou inclure dès le départ MCP/actions, mémoire, RAG, audio, groupes, planning et partage.
2. **Stack frontend/backend** : valider React/Next.js + API Node/TS + Vercel AI SDK, plutôt qu’une adaptation Svelte/FastAPI ou Express directe.
3. **Routeur fournisseur** : approuver LiteLLM Proxy séparé, ou imposer une implémentation/adapter interne; fixer budget, fallback, idempotence et politique de données.
4. **Données et multi-tenancy** : approuver Supabase Auth/PostgreSQL/RLS comme source de vérité; définir tenant/org/projet, rôles et résidence.
5. **Stockage** : approuver R2, bucket/juridiction, clés scoped, lifecycle/lock et limites S3; confirmer que l’absence d’egress annoncé ne remplace pas le budget opérations/stockage.
6. **Exécution non fiable** : approuver le niveau de sandbox pour workers, MCP, plugins, Code Interpreter et extraction; décider si certains outils sont exclus du MVP.
7. **Protocole de streaming** : SSE typé avec reprise durable; décider si Supabase Realtime est nécessaire en complément.
8. **Gouvernance Evidence** : approuver le ledger append-only, les claims finis et le vocabulaire observé/proposé/non vérifié; définir qui peut promouvoir une proposition en fait.
9. **Licences** : obtenir avis sur Open WebUI et LobeHub avant réutilisation; valider obligations MIT/Apache/Community/tiers et politique de notices.
10. **NFR** : fixer SLO, RPO/RTO, quotas, rétention/suppression, conformité, régions, budget par tenant et niveau de support avant production.

## 7. Plan de tests

1. **Contrats et schémas** — valider OpenAPI/JSON Schema, SSE/UI message parts, versionnement, séquences, fin/erreur/abort et idempotence.
2. **Unités domaine** — transitions Conversation/Run/MessagePart/Attachment/Evidence; règles de quota, permissions, approbation et promotion de statut.
3. **Auth/RLS** — anon/authenticated, quatre opérations CRUD, tenant A/B, révocation, fonctions RPC, vues `SECURITY DEFINER`, service key backend-only; exécuter `supabase test db` lorsque l’environnement existe.
4. **Provider contract tests** — auth, paramètres, streaming, tool calling, usage, finish reasons, 429/5xx/timeout, vision/audio si retenus, coût et limites.
5. **Routeur** — pondération/priorité, health/cooldown, retry borné, fallback, context-window, budgets, concurrence, pas de boucle et attribution par tentative.
6. **Streaming/reprise** — chunks ordonnés et dédupliqués, stop/abort, erreur dans flux, reconnexion, coupure réseau, deuxième onglet/appareil, finalisation unique.
7. **Tools/MCP/sandbox** — schéma invalide, approval/deny, output/error, timeout, annulation, scopes tenant, SSRF, secrets, command execution, non-blocage event loop.
8. **Fichiers/R2** — presigned PUT/GET/HEAD/DELETE, expiration et réutilisation, Content-Type, taille/MIME, CORS, 401/403, clé/collision, multipart, R2 feature gaps, scan/quarantaine, lifecycle/lock.
9. **Evidence/REA** — hash, provenance, autorité, couverture, parentage, inconnues, pagination/export, claims finis, refus de `verify` si spécification ou preuve partielle.
10. **E2E UX** — création agent, message, pièce jointe, outil avec approbation, erreur, reprise, fork, recherche/tag/pin/archive/partage; mobile, clavier, clair/sombre, reduced-motion et états empty/loading/error/success.
11. **Résilience et sécurité** — Redis/PostgreSQL/provider/R2 indisponibles, redémarrage, migrations, rate limits, isolation, logs redigés, rotation secrets, sauvegarde/restauration et RPO/RTO.
12. **Performance/coûts** — latence TTFT/stream, concurrence, taille fichiers, workers, coût par tentative/tenant, opérations R2, limites Redis et charge SSE. **Aucun de ces tests PrismAI n’a été exécuté dans le cadrage fourni.**

## 8. Feuille de route en 12 étapes

1. **Cadrer et figer les références** : confirmer cahier des charges, MVP, régions, NFR; épingler commits/releases; ouvrir ADR sur les contradictions de licences LobeHub/Open WebUI et sur REA.
2. **Établir la traçabilité** : transformer les exigences en claims finis, distinguer observé/proposé/non vérifié, définir Evidence, couverture, inconnues et critères d’acceptation.
3. **Valider le domaine et la tenancy** : schémas Conversation/Run/MessagePart/Agent/Tool/Attachment/Evidence/Audit/Usage; tenant/org/projet; rôles et suppressions.
4. **Initialiser monorepo et CI** : Node/TS/pnpm, packages contracts/domain/db, lockfile, SBOM, lint/typecheck/unit; décider Next.js/API Node et conventions de versionnement.
5. **Mettre en place Supabase** : Auth, migrations PostgreSQL, grants minimaux, RLS, tests négatifs; secrets et environnements séparés.
6. **Construire le shell frontend** : sidebar, topics, recherche, agent/workspace, responsive, tokens, accessibilité, états UX; sans promettre les fonctionnalités non retenues.
7. **Implémenter le run et le streaming** : adapter Vercel AI SDK, SSE typé, parts, stop/retry/resume, persistance des deltas, séquences/idempotence et observabilité.
8. **Intégrer le premier fournisseur puis le routeur** : capability matrix et contract tests; décider LiteLLM; ajouter carte prix, budgets, retries/fallbacks et attribution par tentative.
9. **Livrer BlobStore et fichiers** : abstraction, R2 staging, presigned URLs, CORS, scan/quarantaine, extraction texte; ajouter OCR/STT/RAG seulement après validation de besoin/coût/confidentialité.
10. **Ajouter agents/tools/Evidence** : builder borné, registre et approvals, workers/sandbox, MCP contrôlé; ledger REA, provenance, exports et vérification de claims finis.
11. **Durcir et tester** : E2E, sécurité tenant/SSRF/secrets, coupures/reprise, R2 compatibility, pannes Redis/provider, performance/coûts, runbooks et sauvegarde/restauration.
12. **Pilote puis production** : déploiement staging, tests d’acceptation, revue licences/compliance, budgets et SLO, migration/rollback, canary contrôlé, monitoring et décision go/no-go approuvée.

## Références

### Dépôts et documentation des références

- [LibreChat](https://github.com/LibreChat-AI/LibreChat) — [LICENSE](https://raw.githubusercontent.com/LibreChat-AI/LibreChat/main/LICENSE), [agents](https://www.librechat.ai/docs/features/agents), [resumable streams](https://www.librechat.ai/docs/features/resumable_streams), [StreamRunManager](https://raw.githubusercontent.com/LibreChat-AI/LibreChat/main/api/server/services/Runs/StreamRunManager.js), [ChatForm](https://raw.githubusercontent.com/LibreChat-AI/LibreChat/main/client/src/components/Chat/Input/ChatForm.tsx).
- [REA](https://github.com/morluto/rea) — [LICENSE](https://github.com/morluto/rea/blob/main/LICENSE), [THIRD_PARTY_NOTICES](https://github.com/morluto/rea/blob/main/THIRD_PARTY_NOTICES.md), [server](https://github.com/morluto/rea/tree/main/src/server), [application](https://github.com/morluto/rea/tree/main/src/application).
- [Open WebUI](https://github.com/open-webui/open-webui) — [LICENSE](https://raw.githubusercontent.com/open-webui/open-webui/main/LICENSE), [features](https://docs.openwebui.com/features/), [storage provider](https://github.com/open-webui/open-webui/blob/91ea4e3421d1d8069f13d4a463fcb5986d94ea60/backend/open_webui/storage/provider.py).
- [LobeHub](https://github.com/lobehub/lobehub) — [LICENSE](https://raw.githubusercontent.com/lobehub/lobehub/main/LICENSE), [DESIGN](https://raw.githubusercontent.com/lobehub/lobehub/canary/DESIGN.md), [README](https://raw.githubusercontent.com/lobehub/lobehub/canary/README.md).
- [Vercel AI SDK](https://github.com/vercel/ai) — [LICENSE](https://raw.githubusercontent.com/vercel/ai/main/LICENSE), [streamText](https://raw.githubusercontent.com/vercel/ai/main/packages/ai/src/generate-text/stream-text.ts), [UI stream](https://raw.githubusercontent.com/vercel/ai/main/packages/ai/src/ui-message-stream/index.ts), [useChat](https://raw.githubusercontent.com/vercel/ai/main/packages/react/src/use-chat.ts).
- [LiteLLM](https://github.com/BerriAI/litellm) — [LICENSE](https://raw.githubusercontent.com/BerriAI/litellm/main/LICENSE), [router](https://raw.githubusercontent.com/BerriAI/litellm/main/litellm/router.py), [cost calculator](https://raw.githubusercontent.com/BerriAI/litellm/main/litellm/cost_calculator.py), [routing docs](https://docs.litellm.ai/docs/routing).
- [Supabase](https://github.com/supabase/supabase) — [LICENSE](https://raw.githubusercontent.com/supabase/supabase/master/LICENSE), [Auth](https://supabase.com/docs/guides/auth), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
- [Cloudflare Workers SDK](https://github.com/cloudflare/workers-sdk) — [Wrangler](https://github.com/cloudflare/workers-sdk/tree/main/packages/wrangler), [Miniflare](https://github.com/cloudflare/workers-sdk/tree/main/packages/miniflare), [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/).

### Cloudflare R2

- [R2](https://developers.cloudflare.com/r2/), [API S3](https://developers.cloudflare.com/r2/api/s3/api/), [tokens](https://developers.cloudflare.com/r2/api/tokens/), [presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [CORS](https://developers.cloudflare.com/r2/buckets/cors/), [bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/), [lifecycle](https://developers.cloudflare.com/r2/buckets/object-lifecycles/), [data access logs](https://developers.cloudflare.com/r2/buckets/data-access-logs/), [data security](https://developers.cloudflare.com/r2/reference/data-security/).

> **Réserves finales.** Aucun dépôt n’a été exécuté ou déployé dans cette synthèse; les tests cités comme observés sont des suites ou procédures repérées, pas des résultats de test. Aucun compte Supabase, Redis, fournisseur LLM, LiteLLM ou Cloudflare n’a été vérifié. Les capacités, coûts, SLO, conformité, multi-tenancy complète, backup/restore et performances de PrismAI restent donc à valider.