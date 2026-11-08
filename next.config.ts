import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  // Never let a browser guess a file's type (an upload or response read as HTML/script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Nobody may show this site inside a frame on another site (clickjacking). frame-ancestors in
  // the CSP (proxy.ts) says the same for modern browsers.
  { key: "X-Frame-Options", value: "DENY" },
  // Other sites see only the origin, never the full URL (which can hold a draft path or a token).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Browser features this site never uses stay off, even if injected content asked for them.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  // Keeps other windows from holding a reference to this one.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  // Do not announce the framework ("X-Powered-By: Next.js") to every visitor.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // The widget host page is framed by this site's own pages (see src/lib/csp.ts buildEmbedCsp); a later rule wins for the same header.
      { source: "/embed/:path*", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    // Every uploaded image already gets resized server-side to a 1920px
    // cap and re-encoded as webp on upload (see saveUploadedImage) -- this
    // is next/image's own *runtime* resizing, generating the actual
    // smaller variant a given placement needs (a 200px avatar preview, a
    // 120px blog list thumbnail, etc.) instead of always shipping that
    // same ~1920px file. All sources are same-origin relative paths
    // (/uploads/...), so no remotePatterns entry is needed.
    //
    // A trimmed deviceSizes/imageSizes list (vs. Next's much longer
    // default) keeps the number of distinct resized variants the server
    // has to generate and cache small -- this is a real, if modest,
    // consideration on a small self-hosted homelab box rather than a CDN.
    // The image cache itself lives under .next/cache, which this project's
    // own Docker deploy loop already wipes fresh on every rebuild (same
    // reason UPLOAD_DIR had to move outside public/ -- see image.ts), so
    // there's no unbounded-growth risk to worry about between deploys.
    deviceSizes: [400, 640, 828, 1080, 1920],
    imageSizes: [64, 96, 128, 200, 256],
  },
};

export default nextConfig;
