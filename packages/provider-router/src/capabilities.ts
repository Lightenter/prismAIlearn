import type { Capability, ChatMessage, Complexity } from '@prismai/contracts';
import { calculateCreditCost } from '@prismai/domain';
import type { ConfiguredModel, PlanTier } from './config';

export type CapabilityDecision = { capability: Capability; complexity: Complexity; reason: string };
export const CHAT_API_CAPABILITIES: Capability[] = ['TEXT', 'CODE', 'REASONING', 'CREATIVE'];

function latestUserText(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'user')?.content.trim() ?? '';
}

export function estimateInputTokens(messages: ChatMessage[]) {
  const characterCount = messages.reduce((sum, message) => sum + message.content.length, 0);
  return Math.max(1, Math.ceil(characterCount / 4));
}

export function classifyCapability(messages: ChatMessage[]): CapabilityDecision {
  const text = latestUserText(messages).toLowerCase();
  if (/\b(video|vidéo|animation|clip)\b/.test(text) && /\b(crée|génère|produis|monte|fais|faire)\b/.test(text)) {
    return { capability: 'VIDEO', complexity: 'HIGH', reason: 'media generation request' };
  }
  if (/\b(audio|voix|musique|son|podcast)\b/.test(text) && /\b(crée|génère|produis|transcris|enregistre)\b/.test(text)) {
    return { capability: 'AUDIO', complexity: 'HIGH', reason: 'audio task request' };
  }
  if (/\b(image|illustration|logo|visuel|dessin)\b/.test(text) && /\b(crée|génère|dessine|produis|fais|faire)\b/.test(text)) {
    return { capability: 'IMAGE', complexity: 'MEDIUM', reason: 'image generation request' };
  }
  if (/\b(pdf|document|fichier joint|pièce jointe|contrat à analyser)\b/.test(text)) {
    return { capability: 'DOCUMENT', complexity: 'MEDIUM', reason: 'document task request' };
  }
  if (/\b(recherche sur le web|cherche sur internet|sources récentes|actualité|en temps réel|web search)\b/.test(text)) {
    return { capability: 'SEARCH', complexity: 'HIGH', reason: 'live search request' };
  }
  if (/\b(code|typescript|javascript|python|sql|bug|fonction|script|compiler|débogue|debug)\b/.test(text)) {
    return { capability: 'CODE', complexity: isComplex(text) ? 'HIGH' : 'MEDIUM', reason: 'code task' };
  }
  if (/\b(poème|poésie|histoire|fiction|slogan|campagne créative|écris une chanson|scénario)\b/.test(text)) {
    return { capability: 'CREATIVE', complexity: isComplex(text) ? 'HIGH' : 'MEDIUM', reason: 'creative writing task' };
  }
  if (/\b(analyse|compare|évalue|raisonne|démontre|argumente|stratégie|plusieurs étapes|étape par étape|plan détaillé)\b/.test(text)) {
    return { capability: 'REASONING', complexity: isComplex(text) ? 'HIGH' : 'MEDIUM', reason: 'reasoning task' };
  }
  return { capability: 'TEXT', complexity: isComplex(text) ? 'HIGH' : text.length > 500 ? 'MEDIUM' : 'LOW', reason: 'general text task' };
}

function isComplex(text: string) {
  const multiStep = /\b(étape par étape|en plusieurs étapes|compare|contraste|à la fois|d’abord|ensuite|enfin|avec contraintes|analyse approfondie)\b/.test(text);
  const constraintCount = (text.match(/\b(mais|cependant|tout en|sauf|à condition que|en tenant compte)\b/g) ?? []).length;
  return multiStep || constraintCount >= 2 || text.length > 2000;
}

export function isSupportedChatCapability(capability: Capability) {
  return CHAT_API_CAPABILITIES.includes(capability);
}

export function selectRoutedModels(
  decision: CapabilityDecision,
  estimatedInputTokens: number,
  available: ConfiguredModel[],
  plan: PlanTier,
): ConfiguredModel[] {
  if (!isSupportedChatCapability(decision.capability)) {
    throw Object.assign(new Error('CAPABILITY_UNAVAILABLE'), { code: 'CAPABILITY_UNAVAILABLE' });
  }
  const compatible = available.filter((model) =>
    model.capabilities.includes(decision.capability)
    && model.plans.includes(plan)
    && model.contextWindowTokens >= estimatedInputTokens,
  );
  if (!compatible.length) {
    throw Object.assign(new Error('NO_MODEL_FOR_CAPABILITY'), { code: 'NO_MODEL_FOR_CAPABILITY' });
  }

  const preferQuality = plan === 'PRO' && decision.complexity === 'HIGH';
  const sorted = compatible.sort((left, right) => {
    const leftCredits = calculateCreditCost(left.provider, estimatedInputTokens);
    const rightCredits = calculateCreditCost(right.provider, estimatedInputTokens);
    const rankDifference = preferQuality
      ? (right.qualityRank - left.qualityRank) || (leftCredits - rightCredits)
      : (leftCredits - rightCredits) || (right.qualityRank - left.qualityRank);
    return rankDifference || left.provider.localeCompare(right.provider) || left.model.localeCompare(right.model);
  });
  const seenProviders = new Set<string>();
  return sorted.filter((model) => {
    if (seenProviders.has(model.provider)) return false;
    seenProviders.add(model.provider);
    return true;
  });
}
