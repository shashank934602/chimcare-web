/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Original WordPress media is served from the live site. Images are NOT
  // re-optimised or renamed in this pilot, so remote patterns only.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "www.chimcare.com" }],
  },
};
export default nextConfig;
