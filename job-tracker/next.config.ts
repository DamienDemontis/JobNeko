import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during builds since we have warnings configured as off
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable type checking during builds for faster compilation
    ignoreBuildErrors: false,
  },
  webpack: (config: any, { isServer }: any) => {
    // Fix for pdf-parse module on server side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'pdf-parse': 'commonjs pdf-parse'
      });
    }
    return config;
  }
};

export default nextConfig;
