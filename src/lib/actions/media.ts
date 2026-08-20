"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { saveUploadedImage } from "@/lib/image";
import { sanitizePlainText } from "@/lib/sanitize";
import { revalidatePath } from "next/cache";
import { unlink } from "node:fs/promises";
import path from "node:path";

export type UploadState = { error?: string; media?: { id: string; url: string } };

/** RS-07, 7.2, 7.10: validated, resized upload added to the shared media library. */
export async function uploadMedia(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const admin = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona un archivo." };

  let saved;
  try {
    saved = await saveUploadedImage(file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo procesar la imagen." };
  }

  const altText = sanitizePlainText(String(formData.get("altText") ?? ""));
  const media = await prisma.media.create({
    data: { ...saved, altText: altText || null },
  });

  await logAudit({ adminId: admin.id, action: "upload_media", entityType: "Media", entityId: media.id });
  revalidatePath("/admin/media");

  return { media: { id: media.id, url: media.url } };
}

export async function deleteMedia(mediaId: string) {
  const admin = await requireAdmin();
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) return;

  await prisma.media.delete({ where: { id: mediaId } });
  await unlink(path.join(process.cwd(), "public", media.url)).catch(() => undefined);
  await logAudit({ adminId: admin.id, action: "delete_media", entityType: "Media", entityId: mediaId });
  revalidatePath("/admin/media");
}
