// Définit une allowlist minimale pour empêcher l’exécution arbitraire.
export const allowedTools = new Set(['search', 'calculator']);
// Vérifie qu’un outil demandé appartient à la liste autorisée.
export function isToolAllowed(name: string) { return allowedTools.has(name); }
