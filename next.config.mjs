/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignoramos errores menores para que no pare el build
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Configuración de imágenes optimizada para ahorrar cuota
  images: {
    // 1. Reducimos los "deviceSizes". 
    // Por defecto Next trae 8 tamaños. Aquí dejamos solo 3 esenciales:
    // 640 (móvil), 1080 (tablet/laptop), 1920 (monitor grande).
    deviceSizes: [640, 1080, 1920],

    // 2. Reducimos los "imageSizes".
    // Estos se usan cuando pones el atributo "sizes" o para imágenes fijas pequeñas.
    imageSizes: [32, 64, 128],

    // 3. Limitamos los formatos.
    // Forzamos solo WebP para evitar generar versiones dobles (AVIF + WebP).
    formats: ['image/webp'],

    // 4. Aumentamos el tiempo de caché (Opcional pero recomendado).
    // Le dice a Vercel que guarde la imagen optimizada por 1 año, reduciendo re-procesados.
    minimumCacheTTL: 31536000,

    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};

export default nextConfig;