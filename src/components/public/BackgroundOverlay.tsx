import { backgroundPictureStyle } from "@/lib/backgroundPicture";
import { BackgroundVideo } from "@/components/public/BackgroundVideo";

export function BackgroundOverlay({
  imageUrl,
  overlayColor,
  overlayOpacity,
  videoUrl,
  gradientEnd,
  focalX,
  focalY,
  zoom,
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
  // Which part of the picture shows: focal point in % from the top-left, and zoom (1 = just covering).
  // Defaults (50/50/1) are the centred look every background had before this existed.
  focalX?: number | null;
  focalY?: number | null;
  zoom?: number | null;
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
        <BackgroundVideo src={videoUrl} />
      ) : (
        imageUrl && (
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            <div
              className="absolute inset-0 bg-cover"
              style={backgroundPictureStyle(imageUrl, focalX, focalY, zoom)}
            />
          </div>
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
