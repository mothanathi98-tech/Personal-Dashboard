import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function getStorageConfig() {
  const bucket = process.env.AWS_S3_BUCKET_NAME?.trim();
  const region = process.env.AWS_REGION?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!bucket || !region || !accessKeyId || !secretAccessKey) return null;
  return { bucket, region, accessKeyId, secretAccessKey };
}

export function getS3Client() {
  const config = getStorageConfig();
  if (!config) return null;
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
    },
  });
}

export async function createDownloadUrl(bucket: string, key: string) {
  const client = getS3Client();
  if (!client) throw new Error("S3 storage is not configured.");
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 300 });
}
