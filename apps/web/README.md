# PrismAI Web

Cette application sera créée dans une étape ultérieure, après validation du socle API et des décisions de design.

Aucun appel fournisseur, aucune clé secrète et aucune authentification ne sont encore implémentés dans cette unité de travail.

## Landing page (`/`)

La landing publique est construite en Tailwind CSS (v3), limité à la landing :

- `app/page.tsx` — structure de la page (hero, fonctionnalités, chiffres, fonctionnement, Cameroun, FAQ, appel final) ;
- `app/components/landing/` — composants client : démonstrateur PRISM ROUTER, entrées animées, formulaire final ;
- `app/landing.css` — directives Tailwind, reset local et composants de la landing ;
- `tailwind.config.ts` — `content` restreint à la landing et `preflight` désactivé pour ne pas modifier les autres écrans ;
- `public/landing/` — photos de Douala (Wikimedia Commons, crédits dans le pied de page).

Le formulaire final transmet l’e-mail à `/signup` via `sessionStorage` (jamais dans l’URL).
Les chiffres affichés (300 crédits, 100 crédits par jour, 8 fournisseurs, barèmes) reprennent `packages/domain` et `packages/provider-router` ; à mettre à jour s’ils changent.
