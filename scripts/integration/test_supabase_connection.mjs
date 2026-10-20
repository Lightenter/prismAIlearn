#!/usr/bin/env node
// Vérifie la disponibilité HTTP de Supabase sans écrire de donnée métier.

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.log(`SKIPPED supabase missing=${missing.join(',')}`);
  process.exit(0);
}

const baseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
const headers = { apikey: process.env.SUPABASE_ANON_KEY, authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}` };

async function check(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  if (!response.ok) throw new Error(`${path} HTTP_${response.status}`);
  return response.status;
}

try {
  const authStatus = await check('/auth/v1/health');
  const restStatus = await check('/rest/v1/');
  console.log(`PASS supabase auth=${authStatus} rest=${restStatus}`);
} catch (error) {
  console.error(`FAIL supabase ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
