/** @type {import('next').NextConfig} */
const nextConfig = {
    // Esto obliga a Next.js a procesar las librerías modernas de Firebase
    transpilePackages: ['undici', 'firebase', '@firebase/storage', '@firebase/firestore', '@firebase/auth'],
};

export default nextConfig;