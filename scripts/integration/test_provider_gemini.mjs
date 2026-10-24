#!/usr/bin/env node
// Appel Gemini minimal, explicite et non répété; ne journalise jamais la clé, le modèle ni le contenu.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const appEnvPath = fileURLToPath(new URL('../../apps/web/.env.local', import.meta.url));
try { process.loadEnvFile(appEnvPath); }
catch (error) {
  if (error?.code !== 'ENOENT') {
    console.error('FAIL gemini env_file_unreadable');
    process.exit(1);
  }
}

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  console.log('SKIPPED gemini missing=GEMINI_API_KEY');
  process.exit(0);
}
if (process.env.GEMINI_TEST_FREE_CONFIRMED !== 'true') {
  console.log('SKIPPED gemini missing=GEMINI_TEST_FREE_CONFIRMED (verify model and Free Tier quota in AI Studio first)');
  process.exit(0);
}

let catalog;
try { catalog = JSON.parse(process.env.PRISMAI_ROUTING_CATALOG ?? ''); }
catch {
  console.error('FAIL gemini invalid=PRISMAI_ROUTING_CATALOG');
  process.exit(1);
}
const entry = Array.isArray(catalog) ? catalog.find((item) => item?.provider === 'gemini' && typeof item.model === 'string' && item.model.trim()) : undefined;
if (!entry) {
  console.log('SKIPPED gemini missing=explicit_Gemini_model_in_PRISMAI_ROUTING_CATALOG');
  process.exit(0);
}

const configuredTimeout = Number(process.env.AI_TIMEOUT_MS ?? 30_000);
const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout >= 1_000 && configuredTimeout <= 120_000 ? configuredTimeout : 30_000;
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(entry.model)}:generateContent`;
try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Réponds uniquement par le mot OK.' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 8 },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const result = await response.json();
  const answer = result?.candidates?.[0]?.content?.parts?.map((part) => part?.text ?? '').join('').trim();
  if (!answer) throw new Error('EMPTY_RESPONSE');
  const tokens = Number(result?.usageMetadata?.totalTokenCount ?? 0);
  console.log(`PASS gemini http=${response.status} response=nonempty total_tokens=${Number.isFinite(tokens) ? tokens : 0}`);
} catch (error) {
  const reason = error instanceof Error && /^HTTP_\d{3}$/.test(error.message) ? error.message : error?.name === 'TimeoutError' ? 'TIMEOUT' : error?.message === 'EMPTY_RESPONSE' ? 'EMPTY_RESPONSE' : 'REQUEST_FAILED';
  console.error(`FAIL gemini ${reason}`);
  process.exitCode = 1;
}
