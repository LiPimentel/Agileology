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

  // MediaUploadForm has no <form> of its own (it's nested inside a bigger
  // form -- see that component for why), so this actually receives the
  // WHOLE enclosing form's fields, which can include more than one upload
  // widget's file/altText inputs if several are open at once (their field
  // names carry a per-instance suffix precisely to avoid colliding here).
  // We can't ask "which button was clicked" via the button's own name/value
  // -- React reserves that pair for its own action-dispatch encoding on a
  // button with a function formAction and overrides anything set there.
  // Instead: exactly one of the file-* fields will actually have a file in
  // it (the one the user picked), the rest (if any other widget happens to
  // be open) are empty -- find that one directly.
  let file: File | null = null;
  let fieldSuffix = "";
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("file-") && value instanceof File && value.size > 0) {
      file = value;
      fieldSuffix = key.slice("file-".length);
      break;
    }
  }
  const altTextRaw = fieldSuffix ? formData.get(`altText-${fieldSuffix}`) : null;
  if (!file) return { error: "Selecciona un archivo." };

  let saved;
  try {
    saved = await saveUploadedImage(file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo procesar la imagen." };
  }

  const altText = sanitizePlainText(String(altTextRaw ?? ""));
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
