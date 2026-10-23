import { randomUUID } from 'node:crypto';
import { runEventSchema, type Capability, type ChatMessage, type RunEvent } from '@prismai/contracts';
import { classifyCapability } from '@prismai/provider-router';

export function createRunId(): string { return randomUUID(); }
export function createRunEvents(runId: string, messages: ChatMessage[], content: string, provider: string, credits: number, model?: string): RunEvent[] {
  const decision = classifyCapability(messages);
  const events: RunEvent[] = [
    { type: 'run.started', runId, sequence: 0, state: 'CREATED', capability: decision.capability },
    { type: 'message.delta', runId, sequence: 1, text: content },
    { type: 'run.completed', runId, sequence: 2, state: 'COMPLETED', provider, ...(model ? { model } : {}), credits },
  ];
  return events.map((event) => runEventSchema.parse(event));
}
export function encodeSse(event: RunEvent): string { return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`; }
export function capabilityForMessages(messages: ChatMessage[]): Capability { return classifyCapability(messages).capability; }
