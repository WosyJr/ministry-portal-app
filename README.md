# Ministry Portal — the desktop app

A window onto koministry.com with the things a browser tab cannot do.
It keeps no records of its own; everything filed goes to the same Docket and the
same archives as the website.

## Build the installer (on Windows)

    npm install
    npm run build

Produces `dist\MinistryPortalSetup.exe`.

Windows warns once that the publisher is unknown — press **More info**, then
**Run anyway**. Signing it would remove that notice; it costs roughly $80–200 a year.

## Put a new version out

1. Raise `version` in package.json.
2. `set GH_TOKEN=<a GitHub token with repo scope>`
3. `npm run release`

That uploads to the GitHub releases of WosyJr/ministry-portal-app. Every installed
copy checks on start and every six hours, downloads quietly, and offers to
restart. Nobody downloads anything twice.

## What has to be set up once

**Discord application** (id 1547370252063739944)

- OAuth2 → Redirects: add `https://koministry.com/auth/discord/callback`
- Rich Presence → Art Assets: upload the seal under the key `seal`
- The client secret goes into Railway as `DISCORD_CLIENT_SECRET`. It must never
  be put in this app. The website does the Discord exchange and hands the session
  back through `ministry://auth?code=…`, so the secret stays on the server.

**Railway** — no new variables are needed for the app itself.

## The address it opens

`main.js`, `DEFAULT_URL`. Anyone can also change it from the tray without rebuilding.
