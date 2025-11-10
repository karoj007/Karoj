import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const workspaceRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(() => {
  const isDev = process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined;

  return {
    plugins: [
      react({
        ...(isDev
          ? {
              babel: {
                plugins: [runtimeErrorOverlay],
              },
            }
          : {}),
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(workspaceRoot, "src"),
        "@shared": path.resolve(workspaceRoot, "shared"),
      },
    },
    build: {
      outDir: path.resolve(workspaceRoot, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
      },
    },
  };
});
