/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evitamos que intente procesar estas librerías pesadas en el servidor
  serverExternalPackages: ['@imgly/background-removal', 'onnxruntime-web'],

  // Permitimos imágenes de Firebase y del CDN de la IA
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

  // Reglas para que Webpack no se queje de los archivos .wasm ni .mjs
  webpack: (config) => {
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

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