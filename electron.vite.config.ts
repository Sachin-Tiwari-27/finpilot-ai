import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, "electron/main/index.ts"),
      },
    },
    resolve: {
      alias: {
        "@main": resolve(__dirname, "electron/main"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, "electron/preload/index.ts"),
      },
    },
  },
  renderer: {
    root: "src",
    build: {
      rollupOptions: {
        input: "./src/index.html",
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "@components": resolve(__dirname, "src/components"),
        "@pages": resolve(__dirname, "src/pages"),
        "@store": resolve(__dirname, "src/store"),
        "@services": resolve(__dirname, "src/services"),
        "@utils": resolve(__dirname, "src/utils"),
        "@types-app": resolve(__dirname, "src/types"),
      },
    },
    plugins: [react()],
  },
});
