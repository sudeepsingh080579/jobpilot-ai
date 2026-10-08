import { usesBlobStore } from "@/lib/deploy";

/** Stay under Vercel's 4.5 MB request-body limit. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function safeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80);
  return cleaned || "resume";
}

/**
 * Keep the original file off the function disk.
 * Postgres holds the bytes unless BLOB_READ_WRITE_TOKEN is set, in which case
 * the file goes to Vercel Blob and only the URL is stored.
 * Blob objects are unlisted public URLs. The app never renders that URL.
 */
export async function storeResumeFile(input: {
  userId: string;
  filename: string;
  bytes: Buffer;
  contentType: string;
}): Promise<{ fileUrl: string; fileData: Buffer | null }> {
  if (!usesBlobStore(process.env.BLOB_READ_WRITE_TOKEN)) {
    return { fileUrl: "", fileData: input.bytes };
  }
  const { put } = await import("@vercel/blob");
  const blob = await put(`resumes/${input.userId}/${safeFileName(input.filename)}`, input.bytes, {
    access: "public",
    addRandomSuffix: true,
    contentType: input.contentType || "application/octet-stream",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return { fileUrl: blob.url, fileData: null };
}
