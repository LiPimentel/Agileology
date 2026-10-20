import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
