export type Evidence = { source: string; label: string; uri?: string; retrievedAt: string };
export * from './ledger';
export function createEvidence(source: string, label: string, uri?: string): Evidence {
  return { source, label, uri, retrievedAt: new Date().toISOString() };
}
