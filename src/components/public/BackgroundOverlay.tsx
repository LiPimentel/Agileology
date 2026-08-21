export function BackgroundOverlay({
  imageUrl,
  overlayColor,
  overlayOpacity,
  videoUrl,
  gradientEnd,
  children,
}: {
  imageUrl?: string | null;
  overlayColor?: string | null;
  overlayOpacity?: number | null;
  // An uploaded mp4/webm shown instead of imageUrl when set -- the section
  // background picker's "Video" tab. Autoplaying/muted/looping, the only
  // way a background video can play without a user gesture in any browser.
  videoUrl?: string | null;
  // When set, the overlay is a two-stop linear gradient (overlayColor ->
  // gradientEnd) instead of a solid color -- the Color tab's "Degradado"
  // option.
  gradientEnd?: string | null;
  children: React.ReactNode;
}) {
  // A color-only overlay (no background image/video) is a valid combination
  // -- e.g. a plain purple section background. Bailing out here whenever
  // there's neither meant that case silently never rendered any overlay at
  // all, on both the public page and the admin's live preview.
  const hasOverlay = (overlayOpacity ?? 0) > 0;
  if (!imageUrl && !videoUrl && !hasOverlay) return <div>{children}</div>;

  return (
    <div className="relative">
      {videoUrl ? (
        <video
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
      ) : (
        imageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${imageUrl})` }}
            aria-hidden
          />
        )
      )}
      {hasOverlay && (
        <div
          className="absolute inset-0"
          style={
            gradientEnd
              ? { background: `linear-gradient(135deg, ${overlayColor ?? "#3B0764"}, ${gradientEnd})`, opacity: overlayOpacity ?? 0.5 }
              : { backgroundColor: overlayColor ?? "#3B0764", opacity: overlayOpacity ?? 0.5 }
          }
          aria-hidden
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
