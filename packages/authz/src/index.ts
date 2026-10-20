// Déclare les rôles issus de la colonne profiles.role contrôlée par Supabase/RLS.
export type AppRole = 'user' | 'premium' | 'admin';
// Vérifie l’appartenance simple d’un utilisateur à une ressource.
export function canAccessResource(userId: string, ownerId: string) { return userId === ownerId; }
// Vérifie un rôle déjà vérifié côté serveur, jamais une valeur provenant du navigateur.
export function hasRole(role: AppRole | null | undefined, required: AppRole) { return role === required; }
// Construit une décision RBAC explicite pour les routes serveur et les handlers.
export function authorizeRole(role: AppRole | null | undefined, required: AppRole) { return { allowed: hasRole(role, required), status: hasRole(role, required) ? 200 : 403 as const }; }
