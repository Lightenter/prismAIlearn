# PrismAI Web

Application Next.js 14 (App Router) des projets PrismAI. L’authentification Supabase et les crédits restent gérés côté serveur ; la landing est publique et les routes de compte restent protégées selon leur contrat existant.

## Landing publique (`/`)

La landing utilise Tailwind CSS v3, limité à l’interface publique :

- `app/page.tsx` : hero, usages, crédits, fonctionnement, photos, FAQ et CTA ;
- `app/components/landing/` : formulaire final, animations accessibles et exemples interactifs préécrits ;
- `app/landing.css` : styles Tailwind et reset local ;
- `tailwind.config.ts` : `preflight` désactivé afin de préserver les autres écrans ;
- `public/landing/` : photos de Douala, avec les crédits dans le pied de page.

La démo contient uniquement des réponses d’exemple : elle ne lance aucun appel IA et ne débite aucun crédit. Le CTA conserve l’adresse saisie temporairement dans `sessionStorage` afin de préremplir `/signup`, sans placer l’adresse dans l’URL.

Les pages `/features` et `/how-it-works` renvoient respectivement vers les sections correspondantes de la landing ; leur contenu est ainsi maintenu à un seul endroit.

## Crédits et Chat

Les valeurs de 300 crédits à la création du compte et de 100 crédits quotidiens proviennent des migrations Supabase. Le coût réel d’une réponse est calculé côté serveur selon le barème interne et le nombre de tokens ; il est transmis avec l’événement `run.completed` et affiché après les nouvelles réponses réussies. La démo marketing ne simule pas ce coût.

Les messages d’erreur publics n’exposent ni nom de modèle, ni nom de fournisseur, ni détail technique sensible. Les métadonnées nécessaires à l’audit interne restent gérées côté serveur.

## Thème et accessibilité

Le thème sombre est appliqué par défaut. Le bouton `ThemeToggle` permet de passer au thème clair et mémorise ce choix dans `localStorage` sous la clé `prismai:theme`. Le script du layout applique le choix avant le premier rendu ; les transitions respectent `prefers-reduced-motion`.
