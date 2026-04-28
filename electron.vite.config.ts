import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        "@main": resolve("electron/main"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
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
        "@": resolve("src"),
        "@components": resolve("src/components"),
        "@pages": resolve("src/pages"),
        "@store": resolve("src/store"),
        "@services": resolve("src/services"),
        "@utils": resolve("src/utils"),
        "@types-app": resolve("src/types"),
      },
    },
    plugins: [react()],
  },
});
