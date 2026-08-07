/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    // No ESLint config is set up in this project; typechecking covers the checks.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
