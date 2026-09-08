import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

let client: S3Client | undefined;

function getClient() {
  if (!client) {
    const cfg = env.s3;
    client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      forcePathStyle: cfg.forcePathStyle,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
  }
  return client;
}

export async function presignPhotoUpload(key: string, contentType: string) {
  const cfg = env.s3;
  const command = new PutObjectCommand({ Bucket: cfg.bucket, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn: 300 });
  const publicUrl = `${cfg.publicUrl.replace(/\/$/, "")}/${key}`;
  return { uploadUrl, publicUrl };
}

/** Direct server-side upload (not presigned) — used when the server already has the bytes in hand. */
export async function uploadBuffer(key: string, body: Buffer, contentType: string) {
  const cfg = env.s3;
  await getClient().send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: body, ContentType: contentType }));
  return `${cfg.publicUrl.replace(/\/$/, "")}/${key}`;
}

export async function deleteObject(key: string) {
  const cfg = env.s3;
  await getClient().send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
}

export function keyFromPublicUrl(url: string): string | null {
  const base = env.s3.publicUrl.replace(/\/$/, "");
  if (!url.startsWith(`${base}/`)) return null;
  return url.slice(base.length + 1);
}
