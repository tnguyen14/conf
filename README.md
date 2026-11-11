# conf

Schedule planners for conferences I attend, published with GitHub Pages.

- [KubeCon + CloudNativeCon NA 2026](https://tridnguyen.com/conf/kubecon-na-2026/) (`kubecon-na-2026/`)

Each conference is a static page under its own sub path, built with Vite.
The schedule is public. Marking talks, notes and "My talks" need sign-in
(Auth0, `tridnguyen.auth0.com`). Marks and notes are saved in the
[lists API](https://github.com/tnguyen14/lists): one list per conference
(`conf/kubecon-na-2026`), one item per talk with a mark or a note:

```json
{ "id": "1246200", "mark": "go", "note": "- …", "updatedAt": "…" }
```

`id` is the Sessionize session ID, or `general` for general notes. `mark` is
`go`, `later` or `null`. Each conference's list has to exist before use (lists
are created by a super admin), and the lists API must allow this site's origin
(CORS).

## Auth setup

Sign-in uses the "Auth" SPA application in Auth0 (`IxcfVZqCVF9b5FS2NVVnElOeBnoNG02Z`)
(client ID in `lib/auth.js`). Its settings need:

- Allowed Callback URLs and Allowed Logout URLs: `https://tridnguyen.com/conf/`
- Allowed Web Origins: `https://tridnguyen.com`

The site root (`index.html`) is the callback and logout page for every
conference: it finishes the redirect and sends you back to the page you came
from. A new conference needs no Auth0 changes.

## Schedule data

Each conference's talks, keynotes and descriptions come from Sessionize and
are stored in `<conference>/schedule.json`, which is bundled into the page.
What gets included (tracks, formats, extra sessions) is set in
`<conference>/sessionize.config.js`. Break banners and track colors are
hand-written in `<conference>/conference-data.js`.

To refresh a schedule, run the **Pull schedule from Sessionize** workflow
(Actions tab → Run workflow). It commits `schedule.json` only if something
changed, then deploys. Or run it locally:

```sh
npm run pull -- kubecon-na-2026
```

Talks are keyed by their Sessionize session ID, so a refresh that changes a
talk's time, room or title keeps its marks and notes.

Pushes to `main` build and deploy via GitHub Actions
(`.github/workflows/deploy.yml`).
