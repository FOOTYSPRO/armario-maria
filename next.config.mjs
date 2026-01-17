/** @type {import('next').NextConfig} */
const nextConfig = {
  // Esto arregla el error de construcción de Firebase
  transpilePackages: ['undici', 'firebase', '@firebase/storage', '@firebase/firestore', '@firebase/auth'],
  
  // ¡ESTO ES LO NUEVO! Autorizamos las fotos de Firebase
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