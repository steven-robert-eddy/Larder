import { randomUUID } from "node:crypto";
import { uploadBuffer } from "@/lib/s3";

const MAX_IMAGE_BYTES = 8_000_000;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Downloads a hero image found during import and re-uploads it to our own
 * object storage — never hotlink someone else's server (design doc
 * section 5.1). Best-effort: a failure here just means no hero image,
 * not a failed import, so this never throws.
 */
export async function downloadAndStoreHeroImage(
  userId: string,
  importJobId: string,
  imageUrl: string,
): Promise<string | null> {
  try {
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

    const response = await fetch(parsed, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return null;

    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    const ext = ALLOWED_TYPES[contentType];
    if (!ext) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) return null;

    const key = `recipes/${userId}/imports/${importJobId}/${randomUUID()}.${ext}`;
    return await uploadBuffer(key, buffer, contentType);
  } catch {
    return null;
  }
}
