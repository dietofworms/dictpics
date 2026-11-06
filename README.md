# dictpics

Make a dictionary page for a friend: their photograph, a slang headword, and that word's real [Urban Dictionary](https://www.urbandictionary.com/) definition.

Pick one of 48 curated terms or hit Random, crop a photo, and export the page as a PNG or pass it to Web Share. There is an optional name, guide words, and a page number. If a lookup comes back empty, or you would rather write it yourself, choose **Use my own wording**.

Photos stay in the browser. They are not uploaded. Listed terms are looked up live: the browser calls `https://api.urbandictionary.com/v0/define` directly, which allows cross-origin requests. The request carries only the term, with no cookies and no referrer. Definitions are not stored in this repository, and the app never fills one in when a lookup fails.

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

`npm run preview` serves the production build at http://127.0.0.1:4173/dictpics/.

## GitHub Pages

The site is prepared for https://dietofworms.github.io/dictpics/. Pushing to `master` runs `.github/workflows/pages.yml`, which tests, builds with that base path, and deploys. Nothing in the workflow turns Pages on or changes who can see the repo.

The files GitHub Pages serves are public on the internet. Keeping this repository private does not keep that site private. There is no custom domain in this repo. Do not add one unless that hostname should serve the same public files.

The production build's Content-Security-Policy allows network requests only to the site itself and `https://api.urbandictionary.com`.

### Turn on Pages

You do this in the repository settings. The workflow does not do it for you.

1. Open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

Until Pages is enabled, a push to `master` still runs the tests and build, and skips the deploy. Enabling Pages publishes the built files publicly.

A cropped photo is re-encoded in the browser as a JPEG, which drops the original file's EXIF and location metadata, and it stays in the browser unless you download or share the PNG.
