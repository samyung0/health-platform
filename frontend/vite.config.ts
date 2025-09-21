import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import postcss from "./postcss.config.js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env files from project root (parent directory)
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");

  return {
    define: {
      "process.env": process.env,
    },
    css: {
      postcss,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    server: {
      port: 3001,
      host: true, // Allow external connections
    },
    preview: {
      port: 3001,
      host: true,
    },
  };
});
