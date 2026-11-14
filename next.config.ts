import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The viewer may be embedded in other sites: /embed must be allowed inside an iframe.
  async headers() {
    return [{ source: '/embed', headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }] }];
  },
};

export default nextConfig;
