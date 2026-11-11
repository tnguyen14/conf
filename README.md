# conf

Schedule planners for conferences I attend, published with GitHub Pages.

- [KubeCon + CloudNativeCon NA 2026](https://tridnguyen.com/conf/kubecon-2026/) (`kubecon-2026/`)

Each conference is a static page under its own sub path, built with Vite.
The schedule is public. Marking talks, notes and "My talks" need sign-in
(Auth0, `tridnguyen.auth0.com`). Marks and notes are still saved in the browser
(localStorage) only.

## Auth setup

Sign-in uses the "Auth" SPA application in Auth0 (`IxcfVZqCVF9b5FS2NVVnElOeBnoNG02Z`)
(client ID in `lib/auth.js`). Its settings need:

- Allowed Callback URLs and Allowed Logout URLs:
  `https://tridnguyen.com/conf/`,
  `http://localhost:4005/`
- Allowed Web Origins: `https://tridnguyen.com`, `http://localhost:4005`

The site root (`index.html`) is the callback and logout page for every
conference: it finishes the redirect and sends you back to the page you came
from. A new conference needs no Auth0 changes.

```sh
npm install
npm run dev     # local dev server
npm run build   # static output in dist/
```

Pushes to `main` build and deploy via GitHub Actions
(`.github/workflows/deploy.yml`).
