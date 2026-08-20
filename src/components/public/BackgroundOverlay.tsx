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
  if (!imageUrl) return <div>{children}</div>;

  return (
    <div className="relative">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
        aria-hidden
      />
      <div
        className="absolute inset-0"
        style={{ backgroundColor: overlayColor ?? "#3B0764", opacity: overlayOpacity ?? 0.5 }}
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}
