export function BackgroundOverlay({
  imageUrl,
  overlayColor,
  overlayOpacity,
  children,
}: {
  imageUrl?: string | null;
  overlayColor?: string | null;
  overlayOpacity?: number | null;
  children: React.ReactNode;
}) {
  // A color-only overlay (no background image) is a valid combination --
  // e.g. a plain purple section background. Bailing out here whenever
  // there's no image meant that case silently never rendered any overlay
  // at all, on both the public page and the admin's live preview.
  const hasOverlay = (overlayOpacity ?? 0) > 0;
  if (!imageUrl && !hasOverlay) return <div>{children}</div>;

  return (
    <div className="relative">
      {imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
          aria-hidden
        />
      )}
      {hasOverlay && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: overlayColor ?? "#3B0764", opacity: overlayOpacity ?? 0.5 }}
          aria-hidden
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
