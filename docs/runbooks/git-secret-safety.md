# Protection des fichiers d’environnement avant commit

Le `.gitignore` du dépôt ignore `.env` et `.env.*`, tout en autorisant `.env.example`. Le hook pré-commit ajoute un contrôle défensif : il refuse tout fichier d’environnement staged, y compris un fichier ajouté avec `git add -f`, sauf `.env.example`. Il inspecte uniquement les noms de chemins et n’affiche jamais le contenu des fichiers.

Après un clone, installe le hook dans la configuration Git **locale** du dépôt :

```bash
pnpm git-safety:install
```

L’installation définit `core.hooksPath=.githooks` pour ce clone uniquement; elle ne modifie pas la configuration Git globale. Vérifie le garde-fou avec :

```bash
pnpm git-safety:test
pnpm git-safety:check
```

Le test utilise un dépôt temporaire et une valeur fictive, vérifie que `.env.example` passe, qu’un `apps/web/.env.local` staged est refusé, et que son contenu ne s’affiche pas.

Ce contrôle cible les **noms de fichiers** d’environnement; il ne détecte pas une clé copiée dans un autre fichier. Il peut aussi être contourné avec `git commit --no-verify`. Continue de vérifier les fichiers staged et utilise la détection de secrets de GitHub ou un scanner tel que Gitleaks dans la CI pour un contrôle général. Si un secret a déjà été poussé, révoque-le et remplace-le : l’ajouter ensuite au `.gitignore` ne l’efface pas de l’historique.
