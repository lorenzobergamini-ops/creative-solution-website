import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Public gallery images are served from the Supabase storage endpoint
      // (<project-ref>.supabase.co). Wildcard hosts cover any project ref;
      // the bucket is public and read-only (RLS select policy).
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
};
export default nextConfig;