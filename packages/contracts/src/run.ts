import { z } from 'zod';

const runMessageSchema = z.object({ role: z.enum(['system', 'user', 'assistant']), content: z.string().min(1).max(50_000) });
export const runStateSchema = z.enum(['CREATED', 'RESERVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']);
export const capabilitySchema = z.enum(['TEXT', 'CODE', 'REASONING', 'CREATIVE', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'AGENT', 'SEARCH']);
export const complexitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const runEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('run.started'), runId: z.string().uuid(), sequence: z.number().int().nonnegative(), state: runStateSchema, capability: capabilitySchema }),
  z.object({ type: z.literal('message.delta'), runId: z.string().uuid(), sequence: z.number().int().nonnegative(), text: z.string() }),
  z.object({ type: z.literal('run.completed'), runId: z.string().uuid(), sequence: z.number().int().nonnegative(), state: z.literal('COMPLETED'), fallbackUsed: z.boolean(), credits: z.number().nonnegative() }),
  z.object({ type: z.literal('run.failed'), runId: z.string().uuid(), sequence: z.number().int().nonnegative(), state: z.literal('FAILED'), code: z.string(), retryable: z.boolean() }),
]);
export const runRequestSchema = z.object({ runId: z.string().uuid().optional(), idempotencyKey: z.string().min(8).max(160), messages: z.array(runMessageSchema).min(1).max(100), capability: capabilitySchema.optional(), complexity: complexitySchema.optional() });
export type RunState = z.infer<typeof runStateSchema>;
export type Capability = z.infer<typeof capabilitySchema>;
export type Complexity = z.infer<typeof complexitySchema>;
export type RunEvent = z.infer<typeof runEventSchema>;
export type RunRequest = z.infer<typeof runRequestSchema>;
