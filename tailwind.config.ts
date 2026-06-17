import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#f7f9fc",
        panel: "#fbfdf7",
        line: "#d5dec9",
        lime: "#65a30d",
      },
      boxShadow: {
        glow: "0 18px 50px rgba(47, 72, 38, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
