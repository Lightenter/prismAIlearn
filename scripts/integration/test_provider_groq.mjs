#!/usr/bin/env node
// Appel Groq minimal, explicite et non répété; ne journalise jamais la clé, le modèle ni le contenu.
import { fileURLToPath } from 'node:url';

const appEnvPath = fileURLToPath(new URL('../../apps/web/.env.local', import.meta.url));
try { process.loadEnvFile(appEnvPath); }
catch (error) {
  if (error?.code !== 'ENOENT') {
    console.error('FAIL groq env_file_unreadable');
    process.exit(1);
  }
}

const apiKey = process.env.GROQ_API_KEY?.trim();
if (!apiKey) {
  console.log('SKIPPED groq missing=GROQ_API_KEY');
  process.exit(0);
}
if (process.env.GROQ_TEST_FREE_CONFIRMED !== 'true') {
  console.log('SKIPPED groq missing=GROQ_TEST_FREE_CONFIRMED (verify model and Free plan limits in GroqCloud first)');
  process.exit(0);
}

let catalog;
try { catalog = JSON.parse(process.env.PRISMAI_ROUTING_CATALOG ?? ''); }
catch {
  console.error('FAIL groq invalid=PRISMAI_ROUTING_CATALOG');
  process.exit(1);
}
const entry = Array.isArray(catalog) ? catalog.find((item) => item?.provider === 'groq' && typeof item.model === 'string' && item.model.trim()) : undefined;
if (!entry) {
  console.log('SKIPPED groq missing=explicit_Groq_model_in_PRISMAI_ROUTING_CATALOG');
  process.exit(0);
}

const configuredTimeout = Number(process.env.AI_TIMEOUT_MS ?? 30_000);
const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout >= 1_000 && configuredTimeout <= 120_000 ? configuredTimeout : 30_000;
try {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: entry.model,
      messages: [{ role: 'user', content: 'Réponds uniquement par le mot OK.' }],
      temperature: 0,
      max_tokens: 8,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const result = await response.json();
  const answer = String(result?.choices?.[0]?.message?.content ?? '').trim();
  if (!answer) throw new Error('EMPTY_RESPONSE');
  const tokens = Number(result?.usage?.total_tokens ?? 0);
  console.log(`PASS groq http=${response.status} response=nonempty total_tokens=${Number.isFinite(tokens) ? tokens : 0}`);
} catch (error) {
  const reason = error instanceof Error && /^HTTP_\d{3}$/.test(error.message) ? error.message : error?.name === 'TimeoutError' ? 'TIMEOUT' : error?.message === 'EMPTY_RESPONSE' ? 'EMPTY_RESPONSE' : 'REQUEST_FAILED';
  console.error(`FAIL groq ${reason}`);
  process.exitCode = 1;
}
