/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.aliyuncs.com' },
      { protocol: 'https', hostname: '**.feishu.cn' },
    ],
  },
};

module.exports = nextConfig;
