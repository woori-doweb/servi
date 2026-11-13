"""servi.im site check. Exit 0 = all checks pass.

  python -X utf8 scripts/check_site.py                  # local files + GitHub release lookup
  python -X utf8 scripts/check_site.py --base https://servi.im   # also check the deployed site

Local: every root-relative href/src exists, every sitemap URL maps to a page, every
data-download id is defined in assets/site.js, no banned third-party product names.
Metadata: each indexable page has title, description, canonical = its sitemap URL, an og:image
that exists in the repo, JSON-LD that parses, and FAQPage questions equal to the visible FAQ.
Release: for each app in site.js, the newest matching GitHub release has a win-x64.zip
asset whose download URL answers 200 (after redirects).
Deployed (--base): pages 200 with the same bytes as the repo, unknown path 404.
"""
import argparse
import json
import pathlib
import re
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ["index.html", "ohmyzip/index.html", "ohmypic/index.html", "404.html"]
BANNED = re.compile(r"alsee|알씨|estsoft|altools|bandi|반디|winrar|winzip|7-zip|7zip|honeyview", re.I)

failures = []


def check(ok, msg):
    print(("PASS " if ok else "FAIL ") + msg)
    if not ok:
        failures.append(msg)


def request(url, method="GET"):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": "servi-check"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read() if method == "GET" else b""
    except urllib.error.HTTPError as e:
        return e.code, b""


def apps_from_js():
    js = (ROOT / "assets/site.js").read_text(encoding="utf-8")
    apps = {}
    for m in re.finditer(r"(\w+): \{ repo: '([^']+)', tag: /(.+?)/, asset: /(.+?)/ \}", js):
        apps[m[1]] = (m[2], re.compile(m[3]), re.compile(m[4]))
    return apps


def meta(html, name):
    m = re.search(rf'<meta (?:name|property)="{re.escape(name)}" content="([^"]*)"', html)
    return m[1] if m else None


def metadata():
    for page in PAGES[:3]:
        html = (ROOT / page).read_text(encoding="utf-8")
        url = "https://servi.im/" + page.removesuffix("index.html")
        title = re.search(r"<title>(.+?)</title>", html)
        check(bool(title) and len(title[1]) <= 60, f"{page}: title ({title and len(title[1])} chars, <= 60)")
        desc = meta(html, "description")
        check(bool(desc) and 50 <= len(desc) <= 160, f"{page}: description ({desc and len(desc)} chars, 50-160)")
        canon = re.search(r'<link rel="canonical" href="([^"]+)"', html)
        check(bool(canon) and canon[1] == url and meta(html, "og:url") == url, f"{page}: canonical and og:url = {url}")
        img = meta(html, "og:image") or ""
        check(img.startswith("https://servi.im/") and (ROOT / img.removeprefix("https://servi.im/")).is_file(),
              f"{page}: og:image {img} exists")
        graph = []
        for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
            try:
                graph += json.loads(block)["@graph"]
            except (ValueError, KeyError) as e:
                check(False, f"{page}: JSON-LD parses ({e})")
        check(bool(graph), f"{page}: JSON-LD types {[g['@type'] for g in graph]}")
        faq = [g for g in graph if g["@type"] == "FAQPage"]
        visible = re.findall(r"<summary>(.+?)</summary>", html)
        schema_q = [q["name"] for f in faq for q in f["mainEntity"]]
        check(visible == schema_q, f"{page}: FAQPage questions match visible FAQ ({len(schema_q)})")
        for g in graph:
            if g["@type"] == "SoftwareApplication":
                check(g.get("url") == url, f"{page}: SoftwareApplication url = canonical")


def local(apps):
    for page in PAGES:
        html = (ROOT / page).read_text(encoding="utf-8")
        for ref in re.findall(r'(?:href|src)="(/[^"#?]*)', html):
            path = ROOT / ref.lstrip("/")
            if ref.endswith("/"):
                path = path / "index.html"
            check(path.is_file(), f"{page}: {ref} exists")
        for app in set(re.findall(r'data-download="(\w+)"', html)):
            check(app in apps, f"{page}: data-download={app} defined in site.js")
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    for loc in re.findall(r"<loc>https://servi\.im/([^<]*)</loc>", sitemap):
        check((ROOT / loc / "index.html").is_file(), f"sitemap: /{loc} has a page")
    hits = [str(p.relative_to(ROOT)) for p in ROOT.rglob("*")
            if p.is_file() and ".git" not in p.parts and p.suffix in {".html", ".css", ".js", ".xml", ".txt", ".md", ".svg"}
            and p.name != "check_site.py" and BANNED.search(p.read_text(encoding="utf-8"))]
    check(not hits, f"no banned names ({', '.join(hits) or 'none'})")


def releases(apps):
    cache = {}
    for app, (repo, tag, asset) in apps.items():
        if repo not in cache:
            status, body = request(f"https://api.github.com/repos/{repo}/releases?per_page=30")
            check(status == 200, f"GitHub API {repo} -> {status}")
            cache[repo] = json.loads(body) if status == 200 else []
        rel = next((r for r in cache[repo] if not r["draft"] and tag.search(r["tag_name"])
                    and any(asset.search(a["name"]) for a in r["assets"])), None)
        check(rel is not None, f"{app}: release found ({rel and rel['tag_name']})")
        if rel:
            zip_asset = next(a for a in rel["assets"] if asset.search(a["name"]))
            status, _ = request(zip_asset["browser_download_url"], "HEAD")
            check(status == 200, f"{app}: {zip_asset['name']} download -> {status}")


def deployed(base):
    for page in PAGES[:3]:
        url = base.rstrip("/") + "/" + page.removesuffix("index.html")
        status, body = request(url)
        check(status == 200 and body == (ROOT / page).read_bytes(), f"{url} -> {status}, bytes match repo")
    for ref in ["/assets/style.css", "/assets/site.js", "/assets/icons/ohmyzip.png", "/assets/og/home.png",
                "/robots.txt", "/sitemap.xml", "/llms.txt"]:
        status, body = request(base.rstrip("/") + ref)
        check(status == 200 and body == (ROOT / ref.lstrip("/")).read_bytes(), f"{ref} -> {status}, bytes match repo")
    status, _ = request(base.rstrip("/") + "/no-such-page-check")
    check(status == 404, f"unknown path -> {status} (want 404)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", help="deployed site URL, e.g. https://servi.im")
    ap.add_argument("--offline", action="store_true", help="skip the GitHub release lookup")
    a = ap.parse_args()
    apps = apps_from_js()
    check(len(apps) > 0, f"site.js defines apps: {', '.join(apps)}")
    local(apps)
    metadata()
    if not a.offline:
        releases(apps)
    if a.base:
        deployed(a.base)
    print(f"\n{len(failures)} failure(s)")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
