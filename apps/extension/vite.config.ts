import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Relative base so built assets resolve correctly under chrome-extension://
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
