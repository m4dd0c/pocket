import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config.ts";
import zip from "vite-plugin-zip-pack";

export default defineConfig({
  plugins: [
    crx({ manifest }),
    tailwindcss(),
    zip({ outDir: "release", outFileName: "release.zip" }),
  ],
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
});
