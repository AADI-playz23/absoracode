/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow Monaco Editor worker files
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },
};

module.exports = nextConfig;
