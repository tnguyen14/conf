# conf

Schedule planners for conferences I attend, published with GitHub Pages.

- [KubeCon + CloudNativeCon NA 2026](https://tnguyen14.github.io/conf/kubecon-2026/) (`kubecon-2026/`)

Each conference is a static page under its own sub path, built with Vite.
The schedule is public. Marking talks, notes and "My talks" need sign-in
(Auth0, `tridnguyen.auth0.com`). Marks and notes are still saved in the browser
(localStorage) only.

## Auth setup

Sign-in uses the Auth0 SPA application `IxcfVZqCVF9b5FS2NVVnElOeBnoNG02Z`
(client ID in `lib/auth.js`). Its settings need:

- Allowed Callback URLs and Allowed Logout URLs:
  `https://tnguyen14.github.io/conf/kubecon-2026/`,
  `http://localhost:4005/kubecon-2026/`
- Allowed Web Origins: `https://tnguyen14.github.io`, `http://localhost:4005`

```sh
npm install
npm run dev     # local dev server
npm run build   # static output in dist/
```

Pushes to `main` build and deploy via GitHub Actions
(`.github/workflows/deploy.yml`).
