import "server-only";
import { prisma } from "@/lib/prisma";
import type { RenderableBlock } from "@/components/blocks/BlockRenderer";

// Field-type labels live in lib/formFieldTypes.ts, not here -- that module
// has no "server-only" guard, so client components (FormEditorForm.tsx)
// can import it too; this file can't be imported from a "use client" file
// at all once "server-only" is in play.

export type ResolvedFormField = {
  id: string;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder: string | null;
  options: string[];
};

export type ResolvedForm = {
  id: string;
  name: string;
  successMessage: string;
  fields: ResolvedFormField[];
};

/**
 * Resolves every "customForm" block's `formId` into the form's CURRENT
 * name/fields, in one batched query -- called just before handing a
 * snapshot's blocks to PageRenderer (public route + admin preview route),
 * never baked into the persisted PageVersion snapshot itself. That's
 * deliberate: a form is a referenced library resource, not content the
 * page owns, so editing its fields should update every page using it
 * immediately, the same way swapping a Media Library image updates every
 * page referencing that URL -- not require republishing each page.
 *
 * A block whose form was since deleted resolves to `fields: []` and
 * BlockRenderer's customForm case renders nothing for it, the same
 * graceful-skip other block types use for missing content.
 */
export async function resolveCustomFormBlocks(blocks: RenderableBlock[]): Promise<RenderableBlock[]> {
  const formIds = Array.from(
    new Set(blocks.filter((b) => b.type === "customForm").map((b) => String(b.content.formId ?? "")).filter(Boolean)),
  );
  if (formIds.length === 0) return blocks;

  const forms = await prisma.formDefinition.findMany({
    where: { id: { in: formIds } },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  const byId = new Map(forms.map((f) => [f.id, f]));

  return blocks.map((b) => {
    if (b.type !== "customForm") return b;
    const form = byId.get(String(b.content.formId ?? ""));
    if (!form) return { ...b, content: { ...b.content, formName: null, successMessage: null, fields: [] } };
    return {
      ...b,
      content: {
        ...b.content,
        formName: form.name,
        successMessage: form.successMessage,
        fields: form.fields.map((f) => ({
          id: f.id,
          label: f.label,
          fieldType: f.fieldType,
          required: f.required,
          placeholder: f.placeholder,
          options: f.options,
        })),
      },
    };
  });
}
