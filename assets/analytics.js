// servi.im — Google Analytics 4 (gtag.js), loaded as an external file so the CSP needs no 'unsafe-inline'.
// Sends only on the production host: local previews and forks of this repository do not report.
// Cookie consent handling is undecided (see the run record); do not deploy until it is decided.

const MEASUREMENT_ID = 'G-L2JC38M4HL';
const enabled = location.hostname === 'servi.im';

window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); } // gtag.js reads the arguments object, not an array

if (enabled) {
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID);
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
  document.head.appendChild(s);
}

export function track(name, params) {
  if (enabled) gtag('event', name, params);
}
