import { resolve } from "node:path";
import { defineConfig } from "vite";

// Each conference is its own page under a sub path, e.g. /conf/kubecon-2026/.
// BASE_PATH is set in CI to the GitHub Pages path.
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  // 5173 is used by the lists UI; keep conf on its own port.
  server: { port: 4005, strictPort: true },
  preview: { port: 4005, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        "kubecon-2026": resolve(import.meta.dirname, "kubecon-2026/index.html"),
      },
    },
  },
});
