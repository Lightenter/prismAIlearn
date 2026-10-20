import type { Capability, ChatMessage, Complexity } from '@prismai/contracts';
import type { ProviderName } from './types';

export type CapabilityDecision = { capability: Capability; complexity: Complexity; reason: string };
export type ProviderPolicy = { provider: ProviderName; model: string; reason: string };

export function classifyCapability(messages: ChatMessage[]): CapabilityDecision {
  const text = messages.map((message) => message.content).join(' ').toLowerCase();
  if (/\b(video|vidéo|animation|clip)\b/.test(text)) return { capability: 'VIDEO', complexity: 'HIGH', reason: 'signal vidéo explicite' };
  if (/\b(image|illustration|logo|visuel)\b/.test(text)) return { capability: 'IMAGE', complexity: 'MEDIUM', reason: 'signal image explicite' };
  if (/\b(pdf|document|contrat|résume ce fichier|fichier)\b/.test(text)) return { capability: 'DOCUMENT', complexity: 'MEDIUM', reason: 'signal document explicite' };
  if (/\b(code|typescript|javascript|python|sql|bug|fonction)\b/.test(text)) return { capability: 'CODE', complexity: text.length > 2000 ? 'HIGH' : 'MEDIUM', reason: 'signal code explicite' };
  if (/\b(recherche|source|actualité|internet)\b/.test(text)) return { capability: 'SEARCH', complexity: 'HIGH', reason: 'signal recherche explicite' };
  return { capability: 'TEXT', complexity: text.length > 2000 ? 'HIGH' : text.length > 500 ? 'MEDIUM' : 'LOW', reason: 'capacité texte par défaut' };
}

export function selectTextProvider(decision: CapabilityDecision, available: ProviderName[] = ['groq', 'gemini', 'openrouter', 'mistral']): ProviderPolicy {
  const preferred = decision.complexity === 'HIGH' ? ['mistral', 'openrouter', 'groq', 'gemini'] : ['groq', 'gemini', 'mistral', 'openrouter'];
  const provider = preferred.find((candidate) => available.includes(candidate as ProviderName));
  if (!provider) throw new Error(`NO_PROVIDER_FOR_CAPABILITY ${decision.capability}`);
  return { provider: provider as ProviderName, model: provider === 'gemini' ? 'gemini-1.5-flash' : 'default', reason: `${decision.capability}/${decision.complexity}` };
}
