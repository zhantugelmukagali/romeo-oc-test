import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: "demo-dist",
    assetsInlineLimit: 2000000,
    chunkSizeWarningLimit: 2000,
  },
  publicDir: false,
});
