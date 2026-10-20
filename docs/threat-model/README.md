# Threat model

Contrôles MVP : RLS par `auth.uid()`, clé service uniquement côté serveur, validation Zod des payloads, idempotence `tx_id`, URLs R2 signées, allowlist d’outils et absence de secrets dans le frontend.
