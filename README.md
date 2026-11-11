# conf

Schedule planners for conferences I attend, published with GitHub Pages.

- [KubeCon + CloudNativeCon NA 2026](https://tnguyen14.github.io/conf/kubecon-2026/) (`kubecon-2026/`)

Each conference is a static page under its own sub path, built with Vite.
The schedule is public. Marking talks, notes and "My talks" need sign-in
(Auth0, `tridnguyen.auth0.com`). Marks and notes are still saved in the browser
(localStorage) only.

## Auth setup

1. In Auth0, create a Single Page Application (or reuse one) and add
   `https://tnguyen14.github.io/conf/kubecon-2026/` and
   `http://localhost:4005/kubecon-2026/` to Allowed Callback URLs and Allowed
   Logout URLs, and `https://tnguyen14.github.io` and `http://localhost:4005`
   to Allowed Web Origins.
2. Set the app's client ID as the repo variable `AUTH0_CLIENT_ID`
   (Settings → Secrets and variables → Actions → Variables).
3. For local dev, put `VITE_AUTH0_CLIENT_ID=<client id>` in `.env.local`.

Without a client ID, the build still works, but sign-in (and so marking and
notes) is off.

```sh
npm install
npm run dev     # local dev server
npm run build   # static output in dist/
```

Pushes to `main` build and deploy via GitHub Actions
(`.github/workflows/deploy.yml`).
