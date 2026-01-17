/** @type {import('next').NextConfig} */
const nextConfig = {
    // Esto ayuda a que Vercel procese bien las librerías de Firebase
    transpilePackages: ['undici', 'firebase', '@firebase/storage', '@firebase/firestore', '@firebase/auth'],
};

export default nextConfig;