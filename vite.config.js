import { resolve } from "node:path";
import { defineConfig } from "vite";

// Each conference is its own page under a sub path, e.g. /conf/kubecon-na-2026/.
// BASE_PATH is set in CI to the GitHub Pages path.
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  server: { port: 4005, strictPort: true },
  preview: { port: 4005, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        "kubecon-na-2026": resolve(
          import.meta.dirname,
          "kubecon-na-2026/index.html",
        ),
        // Redirect from the old path.
        "kubecon-2026": resolve(import.meta.dirname, "kubecon-2026/index.html"),
      },
    },
  },
});
