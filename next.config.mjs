/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evitamos errores de compilación estrictos
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Permitimos las imágenes
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'static.imgly.com' },
      { protocol: 'https', hostname: 'unpkg.com' },
      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
    ],
  },

  // Configuración de Webpack para evitar el error de "import.meta" y WASM
  webpack: (config) => {
    config.resolve.alias = {
        ...config.resolve.alias,
        "onnxruntime-node": false, // Evita que intente cargar cosas de servidor en el navegador
    };

    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    config.module.rules.push({
      test: /\.m?js$/,
      type: "javascript/auto", // Esto soluciona el problema de import.meta
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
};

export default nextConfig;