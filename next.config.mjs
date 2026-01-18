/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. IMPORTANTE: Hemos quitado la librería de IA de aquí para que no intente traducirla y falle.
  transpilePackages: [
    'firebase',
    '@firebase/auth',
    '@firebase/storage',
    '@firebase/firestore'
  ],

  // 2. Esto le dice a Next.js: "Estos paquetes son complejos, no intentes optimizarlos en el servidor".
  serverExternalPackages: ['@imgly/background-removal', 'onnxruntime-web'],

  // 3. Permitimos las fotos de Firebase y del CDN de la IA
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'static.imgly.com',
      },
    ],
  },

  // 4. Reglas técnicas para que acepte archivos .wasm (el cerebro de la IA)
  webpack: (config) => {
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    // Esta regla evita que se queje por los archivos .mjs
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
};

export default nextConfig;