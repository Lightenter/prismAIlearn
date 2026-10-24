#!/usr/bin/env node
// Appel Cloudflare Workers AI minimal, explicite et non répété; ne journalise pas les identifiants, le modèle ni le contenu.
import { fileURLToPath } from 'node:url';

const appEnvPath = fileURLToPath(new URL('../../apps/web/.env.local', import.meta.url));
try { process.loadEnvFile(appEnvPath); }
catch (error) {
  if (error?.code !== 'ENOENT') {
    console.error('FAIL cloudflare env_file_unreadable');
    process.exit(1);
  }
}

const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
if (!apiToken || !accountId) {
  console.log(`SKIPPED cloudflare missing=${[!apiToken && 'CLOUDFLARE_API_TOKEN', !accountId && 'CLOUDFLARE_ACCOUNT_ID'].filter(Boolean).join(',')}`);
  process.exit(0);
}
if (!/^[a-f0-9]{32}$/i.test(accountId)) {
  console.log('SKIPPED cloudflare invalid=CLOUDFLARE_ACCOUNT_ID');
  process.exit(0);
}
if (process.env.CLOUDFLARE_TEST_FREE_CONFIRMED !== 'true') {
  console.log('SKIPPED cloudflare missing=CLOUDFLARE_TEST_FREE_CONFIRMED (verify model availability and remaining neurons first)');
  process.exit(0);
}

let catalog;
try { catalog = JSON.parse(process.env.PRISMAI_ROUTING_CATALOG ?? ''); }
catch {
  console.error('FAIL cloudflare invalid=PRISMAI_ROUTING_CATALOG');
  process.exit(1);
}
const creditClasses = new Set(['groq', 'gemini', 'openrouter', 'mistral']);
const entry = Array.isArray(catalog) ? catalog.find((item) => item?.provider === 'cloudflare'
  && typeof item.model === 'string' && item.model.trim()
  && creditClasses.has(item.creditClass)) : undefined;
if (!entry) {
  console.log('SKIPPED cloudflare missing=explicit_model_and_creditClass_in_PRISMAI_ROUTING_CATALOG');
  process.exit(0);
}

const configuredTimeout = Number(process.env.AI_TIMEOUT_MS ?? 30_000);
const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout >= 1_000 && configuredTimeout <= 120_000 ? configuredTimeout : 30_000;
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1/chat/completions`;
try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiToken}` },
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
  console.log(`PASS cloudflare http=${response.status} response=nonempty total_tokens=${Number.isFinite(tokens) ? tokens : 0}`);
} catch (error) {
  const reason = error instanceof Error && /^HTTP_\d{3}$/.test(error.message) ? error.message : error?.name === 'TimeoutError' ? 'TIMEOUT' : error?.message === 'EMPTY_RESPONSE' ? 'EMPTY_RESPONSE' : 'REQUEST_FAILED';
  console.error(`FAIL cloudflare ${reason}`);
  process.exitCode = 1;
}
