import type { Config } from "tailwindcss";
import { cantilaTheme } from "./src/brand/tailwind.partial";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: cantilaTheme,
  },
  plugins: [],
};

export default config;
