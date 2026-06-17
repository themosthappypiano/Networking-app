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
        panel: "#ffffff",
        line: "#dce3ec",
        lime: "#65a30d",
      },
      boxShadow: {
        glow: "0 18px 50px rgba(15, 23, 42, 0.07)",
      },
    },
  },
  plugins: [],
};

export default config;
