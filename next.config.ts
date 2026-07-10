import type { NextConfig } from "next";
const nextConfig: NextConfig = { images: { remotePatterns: [{ protocol: "https", hostname: "www.grimmfirepump.com" }] } };
export default nextConfig;
