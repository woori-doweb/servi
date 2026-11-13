// servi.im — Google Analytics 4 behind a consent choice.
// Nothing Google is loaded or sent until the visitor chooses "동의". The choice is stored in
// localStorage and can be changed at any time (footer "쿠키 설정"). Withdrawal stops sending at once
// and deletes the GA cookies. Ads-related Consent Mode v2 signals stay denied: the site runs no ads.
// GA is loaded only on the production host, so local previews and forks never report.

const MEASUREMENT_ID = 'G-L2JC38M4HL';
const enabled = location.hostname === 'servi.im';
const KEY = 'servi:consent';
const VERSION = 1; // bump when the privacy policy changes what analytics collects; old choices are asked again

let loaded = false;
window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); } // gtag.js reads the arguments object, not an array

function getConsent() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    return c && c.v === VERSION && (c.analytics === 'granted' || c.analytics === 'denied') ? c.analytics : null;
  } catch { return null; }
}

function load() {
  loaded = true;
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied',
  });
  gtag('consent', 'update', { analytics_storage: 'granted' });
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
  document.head.appendChild(s);
}

function deleteGaCookies() {
  for (const c of document.cookie.split('; ')) {
    const name = c.split('=')[0];
    if (!/^_ga(_|$)/.test(name)) continue;
    for (const domain of ['', '; domain=.' + location.hostname, '; domain=' + location.hostname]) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
}

let current = getConsent();

export function setConsent(state) {
  current = state;
  try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, analytics: state, at: new Date().toISOString() })); }
  catch { /* storage blocked: the choice lasts for this page only */ }
  window['ga-disable-' + MEASUREMENT_ID] = state !== 'granted';
  if (state === 'granted') {
    if (!enabled) return;
    if (loaded) gtag('consent', 'update', { analytics_storage: 'granted' });
    else load();
  } else {
    if (loaded) gtag('consent', 'update', { analytics_storage: 'denied' });
    deleteGaCookies();
  }
}

export function track(name, params) {
  if (enabled && loaded && current === 'granted') gtag('event', name, params);
}

export function currentConsent() { return current; }

if (enabled && current === 'granted') load();
