import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Para las fotos de ejemplo
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com', // Para cuando subas tus fotos reales
      },
    ],
  },
};

export default nextConfig;