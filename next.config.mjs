/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permitir paquetes modernos
  transpilePackages: [
    '@imgly/background-removal', 
    'firebase', 
    '@firebase/auth',
    '@firebase/storage', 
    '@firebase/firestore'
  ],

  // Permitir imágenes externas
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'static.imgly.com' }, // Permitir el cerebro de la IA
    ],
  },

  // Cabeceras de seguridad para que la IA funcione (SharedArrayBuffer)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },

  // Configuración para archivos raros de la IA
  webpack: (config) => {
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;