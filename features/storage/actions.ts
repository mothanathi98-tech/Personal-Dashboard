"use server";

import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/permissions/owner";
import { getS3Client, getStorageConfig, MAX_UPLOAD_BYTES } from "@/lib/storage/s3";

const refresh = () => revalidatePath("/files");

function safeFileName(name: string) {
  const base = name.split(/[\\/]/).pop()?.normalize("NFKC") ?? "";
  return base.replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 140) || "upload";
}

export async function uploadFile(formData: FormData): Promise<void> {
  const { user } = await getCtx();
  const config = getStorageConfig();
  const client = getS3Client();
  if (!config || !client) redirect("/files?error=not-configured");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect("/files?error=choose-file");
  if (file.size > MAX_UPLOAD_BYTES) redirect("/files?error=too-large");

  const key = `users/${user.id}/${Date.now()}-${safeFileName(file.name)}`;
  try {
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: new Uint8Array(await file.arrayBuffer()),
      ContentType: file.type || "application/octet-stream",
      Metadata: { originalname: safeFileName(file.name) },
    }));
  } catch {
    redirect("/files?error=upload-failed");
  }
  refresh();
  redirect("/files?uploaded=1");
}

export async function deleteFile(formData: FormData): Promise<void> {
  const { user } = await getCtx();
  const config = getStorageConfig();
  const client = getS3Client();
  if (!config || !client) redirect("/files?error=not-configured");

  const key = String(formData.get("key") ?? "");
  if (!key.startsWith(`users/${user.id}/`) || key.length > 1024) redirect("/files?error=invalid-file");
  try {
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
  } catch {
    redirect("/files?error=delete-failed");
  }
  refresh();
  redirect("/files?deleted=1");
}
