/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. IMPORTANTE: Le decimos a Next.js que NO intente procesar/transpilar estos paquetes.
  // Esto evita el error de "import outside of module".
  serverExternalPackages: ['@imgly/background-removal', 'onnxruntime-web'],

  // 2. Permitimos las fotos de Firebase y otros sitios necesarios
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

  // 3. Reglas para que Webpack sepa cómo tratar los archivos de la IA
  webpack: (config) => {
    // Regla para archivos .wasm (el cerebro de la IA)
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    // Regla CRÍTICA: Esto le dice a Webpack que los archivos .mjs son código moderno
    // y debe dejar de intentar analizarlos como si fueran scripts antiguos.
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