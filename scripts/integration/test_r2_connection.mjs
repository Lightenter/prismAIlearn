#!/usr/bin/env node
// Vérifie Put/Head/Get/Delete sur un objet temporaire R2 puis le supprime.
import path from 'node:path';
import { createRequire } from 'node:module';

const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.log(`SKIPPED r2 missing=${missing.join(',')}`);
  process.exit(0);
}

const projectDir = process.env.PRISMAI_PROJECT_DIR ?? process.cwd();
const requireFromProject = createRequire(path.join(projectDir, 'package.json'));
let S3Client;
let PutObjectCommand;
let HeadObjectCommand;
let GetObjectCommand;
let DeleteObjectCommand;
try {
  ({ S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } = requireFromProject('@aws-sdk/client-s3'));
} catch {
  console.error('FAIL r2 missing @aws-sdk/client-s3 in PRISMAI_PROJECT_DIR');
  process.exit(1);
}

const endpoint = process.env.R2_ENDPOINT ?? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const client = new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
const key = `incoming/integration-tests/${Date.now()}-${Math.random().toString(16).slice(2)}.txt`;
const body = Buffer.from('PrismAI R2 integration test');

try {
  await client.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, Body: body, ContentType: 'text/plain' }));
  const head = await client.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
  const object = await client.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
  const downloaded = Buffer.from(await object.Body.transformToByteArray());
  if (head.ContentLength !== body.length || !downloaded.equals(body)) throw new Error('R2_CONTENT_MISMATCH');
  console.log(`PASS r2 bucket=${process.env.R2_BUCKET_NAME} key_prefix=incoming/integration-tests`);
} catch (error) {
  console.error(`FAIL r2 ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  try {
    await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
  } catch (cleanupError) {
    console.error(`WARN r2 cleanup_failed=${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
    if (process.exitCode === undefined) process.exitCode = 1;
  }
}
