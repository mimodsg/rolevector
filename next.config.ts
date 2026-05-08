import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@napi-rs/canvas", "pdf-parse", "pdfjs-dist"]
};

export default nextConfig;
