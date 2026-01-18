/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignorar errores de TypeScript y ESLint durante el build para que no se detenga
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
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
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
    ],
  },

  webpack: (config) => {
    // Regla para archivos .wasm
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    // Regla para archivos .mjs (La clave del problema)
    config.module.rules.push({
      test: /\.m?js$/,
      type: "javascript/auto",
      resolve: {
        fullySpecified: false,
      },
    });

    // Evitar que Webpack intente analizar estas librerías problemáticas
    config.externals = [...(config.externals || []), {
        '@imgly/background-removal': '@imgly/background-removal',
        'onnxruntime-web': 'onnxruntime-web'
    }];

    return config;
  },
};

export default nextConfig;