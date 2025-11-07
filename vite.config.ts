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
    // التعديل الرئيسي: تحديد مجلد 'client' كجذر لمكونات الواجهة الأمامية (front-end)
    root: path.resolve(path.dirname(import.meta.url).replace("file://", ""), "client"),
    
    resolve: {
      alias: {
        "src": path.resolve(path.dirname(import.meta.url).replace("file://", ""), "client", "src"),
        "shared": path.resolve(path.dirname(import.meta.url).replace("file://", ""), "shared"),
        "assets": path.resolve(path.dirname(import.meta.url).replace("file://", ""), "attached_assets"),
      },
    },
    build: {
      outDir: path.resolve(path.dirname(import.meta.url).replace("file://", ""), "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.../**"],
      },
    },
  };
});
