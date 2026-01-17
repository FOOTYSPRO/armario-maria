import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    // Aseguramos que lea todas las carpetas posibles
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Esto elimina la letra "antigua" (Times New Roman)
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'], 
      },
      // Colores extra si los necesitamos
      colors: {
        'footys-black': '#111111',
        'footys-gray': '#f5f5f7',
      }
    },
  },
  plugins: [],
};
export default config;