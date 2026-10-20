// Importe le client S3 compatible avec Cloudflare R2.
import { S3Client } from '@aws-sdk/client-s3';
// Construit un client R2 uniquement côté serveur.
export function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) throw new Error('R2_CONFIG_MISSING');
  return new S3Client({ region: 'auto', endpoint: process.env.R2_ENDPOINT ?? `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
}
