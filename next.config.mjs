/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Obligamos a procesar las librerías modernas (Firebase + IA)
  transpilePackages: [
    'undici',
    'firebase',
    '@firebase/storage',
    '@firebase/firestore',
    '@firebase/auth',
    '@imgly/background-removal',
    'onnxruntime-web'
  ],

  // 2. Permitimos las fotos de Firebase
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },

  // 3. Regla especial para que la IA no rompa el build
  webpack: (config) => {
    // Esto hace que Webpack ignore los errores de "import.meta" en la librería de IA
    config.module.rules.push({
      test: /\.m?js$/,
      type: "javascript/auto",
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
};

export default nextConfig;