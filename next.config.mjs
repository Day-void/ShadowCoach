import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Fix for ENOENT error when multiple lockfiles exist in parent directories.
  // Forces Next.js to use the project directory as the workspace root.
  outputFileTracingRoot: __dirname,

  // Hardened security headers — covers OWASP top-10 HTTP header risks.
  // CSP: only load scripts/styles/media from self + trusted CDNs.
  // HSTS: force HTTPS for 1 year (preload-ready).
  // Permissions-Policy: camera allowed (pose tracking), everything else locked.
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js requires 'unsafe-inline' for its inline style injection; nonces
      // would be better but require custom server — acceptable trade-off here.
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // MediaPipe WASM + model files are fetched from Google CDN at runtime
      "connect-src 'self' https://storage.googleapis.com https://api.groq.com",
      "img-src 'self' data: blob:",
      // Camera feed goes through blob: URLs
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "font-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          // HSTS — 1 year, include subdomains, preload-ready
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Download-Options', value: 'noopen' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Camera needed for pose tracking. Mic/geo/payment all locked.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()' },
          // Prevent clickjacking via CSP frame-ancestors (belt+suspenders with X-Frame-Options)
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
