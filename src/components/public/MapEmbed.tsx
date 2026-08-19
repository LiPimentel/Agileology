export function MapEmbed({ address }: { address: string }) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  return (
    <div className="aspect-video max-w-3xl overflow-hidden rounded-md border border-slate-200">
      <iframe
        src={src}
        className="h-full w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Mapa: ${address}`}
      />
    </div>
  );
}
