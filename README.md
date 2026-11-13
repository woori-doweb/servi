# servi.im

Static site for <https://servi.im> — a home for the programs, utilities, services and solutions we build.
No build step: the repository root is the web root.

```
index.html            product list (cards filtered by category)
ohmyzip/index.html    ohmyZip page
ohmypic/index.html    ohMypic page
404.html              not-found page (wire it as the server's 404 document)
assets/               style.css, site.js, favicon.svg, icons/
robots.txt, sitemap.xml
scripts/check_site.py site check (not served)
```

## Downloads

Download buttons link to the GitHub release page in plain HTML, so they work without JavaScript.
`assets/site.js` asks the GitHub API for the newest release whose tag matches the app (`APPS` table) and
rewrites the buttons to the direct `win-x64.zip` asset, filling in version, size, date and the SHA-256 link.
New releases appear on the site without a redeploy.

## Adding a product

1. Copy an `<article class="card">` in `index.html`; set `data-cat` to `utility`, `program`, `service` or `solution`.
2. Add `<name>/index.html` (copy an existing product page) and an icon in `assets/icons/`.
3. If it ships GitHub releases, add an entry to `APPS` in `assets/site.js` and use `data-download="<id>"`.
4. Add the page to `sitemap.xml`.
5. `python -X utf8 scripts/check_site.py` must end with `0 failure(s)`.

## Check

```
python -X utf8 scripts/check_site.py                         # local links, sitemap, release lookup
python -X utf8 scripts/check_site.py --base https://servi.im  # plus the deployed site (bytes match, 404)
```

## Deploy

Serve the repository root as static files (exclude `.git/`, `scripts/`, `README.md`).
`404.html` is the error document for unknown paths. Update by `git pull` in the web root or by copying the tree.
