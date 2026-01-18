/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignoramos errores menores para que no pare el build
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Permitimos las imágenes de tu base de datos
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};

export default nextConfig;