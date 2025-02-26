import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        verto: {
          blue: {
            primary: 'var(--verto-blue-primary)',
            light: 'var(--verto-blue-light)',
            dark: 'var(--verto-blue-dark)',
          },
          gray: {
            light: 'var(--verto-gray-light)',
            DEFAULT: 'var(--verto-gray)',
            dark: 'var(--verto-gray-dark)',
          },
          success: 'var(--verto-success)',
          warning: 'var(--verto-warning)',
          error: 'var(--verto-error)',
        },
      },
    },
  },
  plugins: [],
};
export default config;
