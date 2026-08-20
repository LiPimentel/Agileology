import { BlockRenderer, type RenderableBlock } from "@/components/blocks/BlockRenderer";
import { BackgroundOverlay } from "@/components/public/BackgroundOverlay";
import { MapEmbed } from "@/components/public/MapEmbed";
import { ContactForm } from "@/components/public/ContactForm";

export type PageRenderData = {
  id: string;
  title: string;
  blocks: RenderableBlock[];
  background?: { imageUrl?: string | null; overlayColor?: string | null; overlayOpacity?: number | null } | null;
  mapComponent?: { address: string } | null;
  contactFormComponent?: { enabledFields: string[] } | null;
};

export function PageRenderer({ page }: { page: PageRenderData }) {
  return (
    <article>
      <BackgroundOverlay
        imageUrl={page.background?.imageUrl}
        overlayColor={page.background?.overlayColor}
        overlayOpacity={page.background?.overlayOpacity}
      >
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h1
            className={
              page.background?.imageUrl
                ? "text-4xl font-bold text-white"
                : "text-4xl font-bold text-slate-900"
            }
          >
            {page.title}
          </h1>
        </div>
      </BackgroundOverlay>

      <div className="mx-auto max-w-3xl space-y-8 px-6 py-12">
        {page.blocks.map((block, i) => (
          <BlockRenderer key={block.id ?? i} block={block} />
        ))}

        {page.mapComponent && (
          <div>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">Ubicación</h2>
            <MapEmbed address={page.mapComponent.address} />
          </div>
        )}

        {page.contactFormComponent && (
          <div>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">Contáctanos</h2>
            <ContactForm pageId={page.id} enabledFields={page.contactFormComponent.enabledFields} />
          </div>
        )}
      </div>
    </article>
  );
}
