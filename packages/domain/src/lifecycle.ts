import type { RunState } from '@prismai/contracts';

const transitions: Record<RunState, RunState[]> = {
  CREATED: ['RESERVED', 'FAILED', 'CANCELLED'],
  RESERVED: ['PROCESSING', 'FAILED', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export function canTransition(from: RunState, to: RunState): boolean {
  return transitions[from].includes(to);
}

export function transitionRun(from: RunState, to: RunState): RunState {
  if (!canTransition(from, to)) throw new Error(`INVALID_RUN_TRANSITION ${from}->${to}`);
  return to;
}

export type CreditOperationState = 'CREATED' | 'RESERVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export function canCompleteCredits(state: CreditOperationState): boolean {
  return state === 'PROCESSING' || state === 'RESERVED';
}

export function canRefundCredits(state: CreditOperationState): boolean {
  return state === 'RESERVED' || state === 'PROCESSING';
}
