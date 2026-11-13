# servi.im

Static site for <https://servi.im> — a home for the programs, utilities, services and solutions we build.
No build step: the repository root is the web root.

```
index.html            product list (cards filtered by category)
ohmyzip/index.html    ohmyZip page
ohmypic/index.html    ohMypic page
privacy/index.html    privacy policy (operator servi, woorimro@gmail.com) with the cookie settings button
404.html              not-found page (wire it as the server's 404 document)
assets/               style.css, site.js, analytics.js, consent.js, favicon.svg, icons/
assets/og/            1200x630 social preview images, assets/logo-512.png (Organization logo)
robots.txt, sitemap.xml, llms.txt
scripts/check_site.py site check (not served)
scripts/make_images.py regenerates assets/og/*.png and the logo (not served)
```

## Downloads

Download buttons link to the GitHub release page in plain HTML, so they work without JavaScript.
`assets/site.js` asks the GitHub API for the newest release whose tag matches the app (`APPS` table) and
rewrites the buttons to the direct `win-x64.zip` asset, filling in version, size, date and the SHA-256 link.
New releases appear on the site without a redeploy.

## Analytics and consent

Google Analytics 4 (`G-L2JC38M4HL`) loads only on `servi.im` and only after the visitor clicks "동의" in the
cookie banner (`assets/consent.js`). Before that no Google tag is requested. The choice is stored in localStorage
(`servi:consent`); the footer "쿠키 설정" button reopens the banner. Withdrawal stops sending immediately
(`ga-disable-<ID>`, `analytics_storage: denied`) and deletes the `_ga` cookies. Consent Mode v2 ad signals stay denied.
Events (`download_click`, `release_notes_click`, `git_clone_copy`, `category_filter`, `faq_open`) go through `track()`.
If what analytics collects changes, update `privacy/index.html` and bump `VERSION` in `assets/analytics.js` so
visitors are asked again. Every page must load `/assets/consent.js` and link `/privacy/`.

The server CSP must allow `https://www.googletagmanager.com` in `script-src`, and
`https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com https://*.g.doubleclick.net`
in `img-src` and `connect-src`.

## Adding a product

1. Copy an `<article class="card">` in `index.html`; set `data-cat` to `utility`, `program`, `service` or `solution`.
2. Add `<name>/index.html` (copy an existing product page) and an icon in `assets/icons/`.
   Update its title, description, canonical/og:url, the `SoftwareApplication`/`BreadcrumbList` JSON-LD and the FAQ.
   The `FAQPage` questions must be the same, in the same order, as the visible `<summary>` items.
3. Add the product to `CARDS` in `scripts/make_images.py`, run it, and point `og:image` at `assets/og/<name>.png`.
4. If it ships GitHub releases, add an entry to `APPS` in `assets/site.js` and use `data-download="<id>"`.
5. Add the page to `sitemap.xml` (with `lastmod`), to the home `ItemList` JSON-LD, and a line to `llms.txt`.
6. `python -X utf8 scripts/check_site.py` must end with `0 failure(s)`.

## Check

```
python -X utf8 scripts/check_site.py                         # local links, sitemap, release lookup
python -X utf8 scripts/check_site.py --base https://servi.im  # plus the deployed site (bytes match, 404)
```

## Deploy

Serve the repository root as static files (exclude `.git/`, `scripts/`, `README.md`).
`404.html` is the error document for unknown paths. Update by `git pull` in the web root or by copying the tree.
