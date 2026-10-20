// Définit le contrat minimal d’un stockage objet privé.
export type BlobStore = {
  // Génère une clé serveur pour un tenant et un type d’objet.
  keyFor: (tenantId: string, kind: string, name: string) => string;
};
// Construit une clé privée déterministe sans accepter de chemin absolu.
export function createBlobStore(): BlobStore {
  return { keyFor: (tenantId, kind, name) => `${tenantId}/${kind}/${name.replaceAll('/', '_')}` };
}
