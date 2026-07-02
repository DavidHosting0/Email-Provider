/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.platform !== 'win32' ? { output: 'standalone' } : {}),
  transpilePackages: ['@email-provider/shared'],
};

export default nextConfig;
