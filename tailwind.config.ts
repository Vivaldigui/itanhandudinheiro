import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        folha: {
          50: "#f7fbf9",
          100: "#e8f4ee",
          600: "#1f7a68",
          800: "#145244"
        },
        atencao: {
          50: "#fff8e8",
          500: "#b7791f"
        }
      },
      boxShadow: {
        soft: "0 20px 70px rgba(0, 0, 0, 0.28)",
        neon: "0 0 18px rgba(34, 211, 238, 0.35), 0 0 40px rgba(163, 230, 53, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
