/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Basic security headers (Next's equivalent of Express "helmet").
  // Because the workout API now lives in the same app under /api, there is
  // no cross-origin request to configure — this replaces the old CORS setup
  // entirely rather than reproducing it.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
