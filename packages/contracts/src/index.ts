import { z } from 'zod';
export * from './run';

export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1).max(50_000),
});

export const chatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  messages: z.array(chatMessageSchema).min(1).max(100),
  model: z.string().optional(),
});

export const providerResponseSchema = z.object({
  content: z.string(),
  provider_used: z.string(),
  model: z.string(),
  tokens: z.number().int().nonnegative(),
  request_id: z.string().optional(),
});

export const paymentWebhookSchema = z.object({
  userId: z.string().uuid(),
  txId: z.string().min(1),
  amount: z.coerce.number().positive(),
  status: z.enum(['SUCCESSFUL', 'SUCCESS', 'FAILED', 'PENDING']).default('SUCCESSFUL'),
  reference: z.string().optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ProviderResponse = z.infer<typeof providerResponseSchema>;
export type PaymentWebhook = z.infer<typeof paymentWebhookSchema>;
