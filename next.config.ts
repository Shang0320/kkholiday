import type {NextConfig} from 'next';

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  output: 'export',
  trailingSlash: true,
  basePath: isGitHubActions ? '/kkholiday' : '',
  transpilePackages: ['motion'],
};

export default nextConfig;
