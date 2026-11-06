# dictpics

Make a dictionary page for a friend: their photograph, a slang headword, and that word's real [Urban Dictionary](https://www.urbandictionary.com/) definition.

Pick one of 48 curated terms or hit Random, crop a photo, and export the page as a PNG or pass it to Web Share. There is an optional name, guide words, and a page number. If a lookup comes back empty, or you would rather write it yourself, choose **Use my own wording**.

Photos stay in the browser. They are not uploaded. Listed terms are looked up live. The Urban Dictionary API does not send CORS headers, so the browser cannot call it directly. `npm run dev` and `npm run preview` proxy that call at `/api/urban` on the Vite server. Definitions are not stored in this repository, and the app never fills one in when a lookup fails.

**Skip likely slurs** is off by default, so the full list is available. Turn it on to leave those words out of the list and out of your own wording.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints, usually http://localhost:5173.

```bash
npm test
npm run build
npm run preview
```

`npm run preview` serves the production build at http://127.0.0.1:4173/dictpics/ and keeps the same lookup proxy at `/dictpics/api/urban`.

## GitHub Pages

The site is prepared for https://dietofworms.github.io/dictpics/. Pushing to `master` runs `.github/workflows/pages.yml`, which tests, builds with that base path, and deploys. Nothing in the workflow turns Pages on or changes who can see the repo.

The files GitHub Pages serves are public on the internet. Keeping this repository private does not keep that site private. There is no custom domain in this repo. Do not add one unless that hostname should serve the same public files.

GitHub Pages serves files only. It cannot host `/api/urban`. A browser on Pages also cannot call `api.urbandictionary.com` directly, because that API does not allow cross-origin calls. Without `VITE_URBAN_LOOKUP_URL`, the published site does not send the chosen headword anywhere. It does not invent a definition.

### Turn on Pages

You do this in the repository settings. The workflow does not do it for you.

1. Open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

Until Pages is enabled, a push to `master` can still run the workflow, but GitHub will not serve the site. Enabling Pages publishes the built files publicly.

### Live definitions on Pages

Dev and preview keep working with the built-in proxy and no extra configuration.

For the Pages site, run the included proxy somewhere you control, then point the build at it. The proxy only accepts a `term` and fetches `https://api.urbandictionary.com/v0/define`. It has no API key, it does not accept a target URL, and it only adds CORS for origins you list.

```bash
PORT=8787 ALLOWED_ORIGINS=https://dietofworms.github.io npm run proxy
```

`npm run proxy` listens on port 8787. Then add a repository **variable** (Settings → Secrets and variables → Actions → Variables), not a secret:

`VITE_URBAN_LOOKUP_URL` = `https://<your-proxy-host>/api/urban`

The next push to `master` copies that URL into the public JavaScript. Use https, with no username, password, query string, or token. The build refuses anything else, including a direct Urban Dictionary URL. The proxy and Urban Dictionary then see the headword and the proxy's network address. They do not receive the photograph. A cropped photo is re-encoded in the browser as a JPEG, which drops the original file's EXIF and location metadata, and it stays in the browser unless you download or share the PNG.

With no variable set, Pages can still crop a photo, pick a headword, use your own wording, and download a PNG. A live lookup shows that the static host cannot reach the dictionary.
