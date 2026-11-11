# conf

Schedule planners for conferences I attend, published with GitHub Pages.

- [KubeCon + CloudNativeCon NA 2026](https://tnguyen14.github.io/conf/kubecon-2026/) (`kubecon-2026/`)

Each conference is a static page under its own sub path, built with Vite.
Marks and notes are saved in the browser (localStorage) only.

```sh
npm install
npm run dev     # local dev server
npm run build   # static output in dist/
```

Pushes to `main` build and deploy via GitHub Actions
(`.github/workflows/deploy.yml`).
