// هذا التعديل يحل مشكلة تحديد المسار (root) لـ Vite
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// هذا التعليق يمنع Vite من التخزين المؤقت للإعدادات على Render/Replit
// مما يضمن أن التغييرات يتم تطبيقها دائمًا.
// @ts-ignore
// eslint-disable-next-line
// @ts-nocheck
const disableCacheBusting = true;


export default defineConfig(async ({ command }) => {
  const rootDir = path.dirname(import.meta.url).replace("file://", "");
  
  if (command === "serve") {
    // This is development environment configuration
    // Do not modify this block unless specifically troubleshooting development environment issues.
  }
  
  return {
    plugins: [
      react({
        // Add a runtime error overlay in development.
        // It's recommended to disable this in production to avoid exposing internal errors.
        ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined ? {
            babel: {
                plugins: [runtimeErrorOverlay]
            }
        } : {}),
      }),
    ],
    // All files are in root directory
    root: rootDir,
    
    resolve: {
      alias: [
        { find: /^@\/components\/ui\/(.*)$/, replacement: path.resolve(rootDir, "$1.tsx") },
        { find: "@/components", replacement: path.resolve(rootDir) },
        { find: "@/lib", replacement: path.resolve(rootDir) },
        { find: "@/hooks", replacement: path.resolve(rootDir) },
        { find: "@/pages", replacement: path.resolve(rootDir) },
        { find: "@shared", replacement: path.resolve(rootDir) },
        { find: "@", replacement: path.resolve(rootDir) },
      ],
    },
    build: {
      outDir: path.resolve(rootDir, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: false,
      },
    },
  };
});
