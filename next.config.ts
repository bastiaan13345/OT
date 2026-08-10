import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    // OpenNext expects the standard production artifact directory.
    // Keep the isolated directory for development to avoid stale dev output
    // affecting production builds.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    experimental: {
      serverActions: {
        bodySizeLimit: "64mb",
      },
    },
  };
}
