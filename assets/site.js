// servi.im — latest release lookup, category filter, copy buttons, analytics events.
// Download links already point at the GitHub release page in HTML; this script only
// upgrades them to the direct asset URL of the newest matching release.

import { track } from './analytics.js';

const APPS = {
  ohmyzip: { repo: 'woori-doweb/ohmyzip', tag: /^v\d/, asset: /-win-x64\.zip$/ },
  ohmypic: { repo: 'woori-doweb/ohmyzip', tag: /^ohmypic-v\d/, asset: /-win-x64\.zip$/ },
};

const CACHE_MS = 10 * 60 * 1000;

async function releases(repo) {
  const key = 'servi:releases:' + repo;
  try {
    const hit = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  } catch { /* storage unavailable */ }
  const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=30`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error('GitHub API ' + res.status);
  const data = (await res.json()).map(r => ({
    tag: r.tag_name, draft: r.draft, prerelease: r.prerelease, published: r.published_at, url: r.html_url,
    assets: r.assets.map(a => ({ name: a.name, url: a.browser_download_url, size: a.size })),
  }));
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch { /* ignore */ }
  return data;
}

function mb(bytes) { return (bytes / 1048576).toFixed(1) + ' MB'; }

async function upgrade(id) {
  const app = APPS[id];
  const list = await releases(app.repo);
  const rel = list.find(r => !r.draft && app.tag.test(r.tag) && r.assets.some(a => app.asset.test(a.name)));
  if (!rel) return;
  const zip = rel.assets.find(a => app.asset.test(a.name));
  const sha = rel.assets.find(a => a.name === zip.name + '.sha256');
  const version = rel.tag.replace(/^.*v/, '');
  for (const a of document.querySelectorAll(`a[data-download="${id}"]`)) {
    a.href = zip.url;
    a.title = zip.name;
    a.dataset.version = version;
  }
  for (const el of document.querySelectorAll(`[data-version="${id}"]`)) el.textContent = 'v' + version;
  for (const el of document.querySelectorAll(`[data-size="${id}"]`)) el.textContent = mb(zip.size);
  for (const el of document.querySelectorAll(`[data-date="${id}"]`)) el.textContent = rel.published.slice(0, 10);
  for (const a of document.querySelectorAll(`a[data-notes="${id}"]`)) a.href = rel.url;
  for (const a of document.querySelectorAll(`a[data-sha="${id}"]`)) {
    if (sha) { a.href = sha.url; a.hidden = false; }
  }
}

function initFilter() {
  const nav = document.querySelector('.cat-nav');
  if (!nav) return;
  const cards = [...document.querySelectorAll('.grid .card')];
  for (const b of nav.querySelectorAll('button')) {
    const cat = b.dataset.cat;
    const n = cat === 'all' ? cards.length : cards.filter(c => c.dataset.cat === cat).length;
    b.querySelector('.n').textContent = n;
    if (n === 0) b.disabled = true;
    b.addEventListener('click', () => {
      track('category_filter', { category: cat });
      nav.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      cards.forEach(c => { c.hidden = cat !== 'all' && c.dataset.cat !== cat; });
    });
  }
}

function initCopy() {
  for (const b of document.querySelectorAll('.code button')) {
    b.addEventListener('click', async () => {
      const text = b.parentElement.querySelector('code').textContent;
      track('git_clone_copy', { placement: PLACEMENT });
      try { await navigator.clipboard.writeText(text); b.textContent = '복사됨'; }
      catch { b.textContent = '복사 실패'; }
      setTimeout(() => { b.textContent = '복사'; }, 1600);
    });
  }
}

const PLACEMENT = location.pathname === '/' ? 'home' : 'product';

function initTracking() {
  // Capture phase: the event is queued before the browser leaves for github.com.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-download], a[data-notes]');
    if (!a) return;
    if (a.dataset.download) {
      track('download_click', { app: a.dataset.download, version: a.dataset.version || '(unknown)', placement: PLACEMENT });
    } else {
      track('release_notes_click', { app: a.dataset.notes });
    }
  }, true);
  const app = location.pathname.split('/')[1];
  for (const s of document.querySelectorAll('.faq summary')) {
    s.addEventListener('click', () => {
      if (!s.parentElement.open) track('faq_open', { app, question: s.textContent });
    });
  }
}

initFilter();
initCopy();
initTracking();
const ids = new Set([...document.querySelectorAll('[data-download]')].map(a => a.dataset.download));
for (const id of ids) upgrade(id).catch(err => console.warn('release lookup failed:', id, err.message));
