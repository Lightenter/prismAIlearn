import { z } from 'zod';
export * from './run';
export * from './sanitize';

const safeMessageContent = z.string().min(1).max(50_000).transform((value) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()).refine((value) => value.length > 0, 'Le message ne peut pas être vide');
export const chatMessageSchema = z.object({ role: z.enum(['system', 'user', 'assistant']), content: safeMessageContent });
export const chatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  messages: z.array(chatMessageSchema).min(1).max(100),
});
export const providerResponseSchema = z.object({ content: z.string(), provider_used: z.string(), model: z.string(), tokens: z.number().int().nonnegative(), request_id: z.string().optional(), fallback_used: z.boolean().optional() });
export const paymentWebhookSchema = z.object({ userId: z.string().uuid(), txId: z.string().min(1), amount: z.coerce.number().positive(), status: z.enum(['SUCCESSFUL', 'SUCCESS', 'FAILED', 'PENDING']).default('SUCCESSFUL'), reference: z.string().optional() });
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ProviderResponse = z.infer<typeof providerResponseSchema>;
export type PaymentWebhook = z.infer<typeof paymentWebhookSchema>;
