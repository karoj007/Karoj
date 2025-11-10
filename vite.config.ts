import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async ({ command }) => {
  return {
    plugins: [
      react(),
    ],
    root: __dirname,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
        "@shared": path.resolve(__dirname, "."),
        "@/components": path.resolve(__dirname, "."),
        "@/lib": path.resolve(__dirname, "."),
        "@/hooks": path.resolve(__dirname, "."),
        "@/pages": path.resolve(__dirname, "."),
      },
    },
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: false,
      rollupOptions: {
        input: path.resolve(__dirname, "index.html"),
      },
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
