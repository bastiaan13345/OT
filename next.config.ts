import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    output: "standalone",
    poweredByHeader: false,
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next-build",
    experimental: {
      proxyClientMaxBodySize: "320mb",
      serverActions: {
        bodySizeLimit: "320mb",
      },
    },
    async headers() {
      const isDevelopment = phase === PHASE_DEVELOPMENT_SERVER;
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "X-Frame-Options", value: "SAMEORIGIN" },
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=()",
            },
            ...(!isDevelopment
              ? [
                  {
                    key: "Content-Security-Policy",
                    value: [
                      "default-src 'self'",
                      "base-uri 'self'",
                      "connect-src 'self'",
                      "font-src 'self' data:",
                      "form-action 'self'",
                      "frame-ancestors 'self'",
                      "img-src 'self' data: blob:",
                      "media-src 'self' blob:",
                      "object-src 'none'",
                      "script-src 'self' 'unsafe-inline'",
                      "style-src 'self' 'unsafe-inline'",
                    ].join("; "),
                  },
                ]
              : []),
            ...(isDevelopment
              ? []
              : [
                  {
                    key: "Strict-Transport-Security",
                    value: "max-age=31536000; includeSubDomains",
                  },
                ]),
          ],
        },
      ];
    },
  };
}
