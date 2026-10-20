import { describe, expect, it } from 'vitest';
import { createRunEvents, encodeSse } from '@prismai/chat-runtime';
import { canTransition, transitionRun } from '@prismai/domain';
import { classifyCapability } from '@prismai/provider-router';
import { createEvidenceRecord, verifyEvidence } from '@prismai/evidence';

describe('contrats de l’architecture PrismAI', () => {
  it('sépare la capacité de l’implémentation fournisseur', () => {
    expect(classifyCapability([{ role: 'user', content: 'Explique ce code TypeScript' }]).capability).toBe('CODE');
  });
  it('produit des événements SSE ordonnés et valides', () => {
    const events = createRunEvents(crypto.randomUUID(), [{ role: 'user', content: 'Bonjour' }], 'Réponse', 'groq', 1);
    expect(events.map((event) => event.sequence)).toEqual([0, 1, 2]);
    expect(encodeSse(events[0])).toContain('event: run.started');
  });
  it('refuse une transition de run incohérente', () => {
    expect(transitionRun('CREATED', 'RESERVED')).toBe('RESERVED');
    expect(() => transitionRun('COMPLETED', 'PROCESSING')).toThrow('INVALID_RUN_TRANSITION');
    expect(canTransition('PROCESSING', 'COMPLETED')).toBe(true);
  });
  it('vérifie l’intégrité d’une preuve append-only', () => {
    const evidence = createEvidenceRecord({ id: crypto.randomUUID(), claim: 'Le contrat est observé', status: 'OBSERVED', source: 'test', authority: 'fixture', coverage: 'claim fini', limitations: [] });
    expect(verifyEvidence(evidence)).toBe(true);
    expect(verifyEvidence({ ...evidence, claim: 'altéré' })).toBe(false);
  });
});
