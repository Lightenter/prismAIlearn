// Vérifie l’appartenance d’un utilisateur à une organisation.
export function canAccessResource(userId: string, ownerId: string) { return userId === ownerId; }
