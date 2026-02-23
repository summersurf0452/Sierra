import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      'pino-pretty': '',
      lokijs: '',
      encoding: '',
    },
  },
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.pinata.cloud',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
      },
      {
        protocol: 'https',
        hostname: '**.mypinata.cloud',
      },
      {
        protocol: 'https',
        hostname: 'sierra-nft-images.s3.ap-northeast-2.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;
