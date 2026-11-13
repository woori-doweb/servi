// servi.im — cookie consent banner. Shown until the visitor chooses; reopened by any [data-consent-open] button.
// [data-consent-state] elements show the current choice (privacy page).

import { currentConsent, setConsent } from './analytics.js';

const LABEL = { granted: '동의함', denied: '거부함', null: '아직 선택하지 않음' };
let banner;

function render() {
  for (const el of document.querySelectorAll('[data-consent-state]')) el.textContent = LABEL[currentConsent()];
}

function choose(state) {
  setConsent(state);
  banner.hidden = true;
  render();
}

function build() {
  banner = document.createElement('section');
  banner.className = 'consent';
  banner.setAttribute('aria-label', '쿠키 동의');
  banner.hidden = true;
  banner.innerHTML = `
    <div class="wrap">
      <p>방문 통계(Google 애널리틱스)를 위해 쿠키를 써도 될까요? 동의한 경우에만 불러오며, 거부해도 모든 기능을 그대로 쓸 수 있습니다.
        <a href="/privacy/">개인정보처리방침</a></p>
      <p class="consent-state" hidden>현재 선택: <span data-consent-state></span></p>
      <div class="consent-actions">
        <button type="button" class="btn ghost" data-choice="denied">거부</button>
        <button type="button" class="btn ghost" data-choice="granted">동의</button>
      </div>
    </div>`;
  for (const b of banner.querySelectorAll('[data-choice]')) b.addEventListener('click', () => choose(b.dataset.choice));
  document.body.appendChild(banner);
}

function open() {
  banner.querySelector('.consent-state').hidden = currentConsent() === null;
  banner.hidden = false;
  banner.querySelector('[data-choice]').focus();
}

build();
render();
if (currentConsent() === null) banner.hidden = false;
for (const b of document.querySelectorAll('[data-consent-open]')) b.addEventListener('click', open);
