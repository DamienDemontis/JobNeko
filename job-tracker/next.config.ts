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
  env: {
    // Make sure environment variables are available
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
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
