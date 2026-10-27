# dictpics

Make a dictionary page for a friend: their photograph, a slang headword, and that word's real [Urban Dictionary](https://www.urbandictionary.com/) definition.

Pick one of 48 curated terms or hit Random, crop a photo, and export the page as a PNG or pass it to Web Share. There is an optional name, guide words, and a page number. If a lookup comes back empty, or you would rather write it yourself, choose **Use my own wording**.

Photos stay in the browser. They are not uploaded. Listed terms are looked up live through `/api/urban`, a small proxy in the Vite dev server and the preview server, because the Urban Dictionary API does not send CORS headers. Definitions are not stored in this repository.

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

`npm run preview` serves the production build and the same `/api/urban` proxy.
