import { createHash } from 'node:crypto';

export type EvidenceStatus = 'OBSERVED' | 'PROPOSED' | 'UNVERIFIED';
export type EvidenceRecord = {
  id: string;
  claim: string;
  status: EvidenceStatus;
  source: string;
  authority: string;
  coverage: string;
  limitations: string[];
  parentId?: string;
  hash: string;
  createdAt: string;
};

export function hashEvidence(input: Omit<EvidenceRecord, 'hash'>): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export function createEvidenceRecord(input: Omit<EvidenceRecord, 'hash' | 'createdAt'>): EvidenceRecord {
  const base = { ...input, createdAt: new Date().toISOString() };
  return { ...base, hash: hashEvidence(base) };
}

export function verifyEvidence(record: EvidenceRecord): boolean {
  const { hash, ...base } = record;
  return hash === hashEvidence(base);
}
