import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        canvas: "#f6f4ef",
        line: "#ddd8cc"
      }
    }
  },
  plugins: []
};

export default config;
