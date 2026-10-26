/* AOMG Concept Redesign — effects.js
 * KODE 레퍼런스 인터랙션의 AOMG 버전
 * 1) 인트로: 카운터 + 커서 → "ABOVE ORDINARY MUSIC GROUP" 타이핑 → A·O·M·G가 모여 로고(img/logo-white.png) → [ ENTER ]
 * 2) 긁어서 드러나는 포스터 (Live Pulse)
 * 3) 마우스 트레일 (마우스 사용 환경만)
 * 모든 효과는 prefers-reduced-motion에서 끄거나 즉시 결과만 보여줌
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  /* ---------- 1. 인트로 ---------- */
  function initIntro() {
    const intro = $('#intro');
    if (!intro) return;
    let seen = false;
    try { seen = sessionStorage.getItem('aomg-entered') === '1'; } catch (e) { /* storage 불가 */ }
    if (seen) { intro.remove(); return; }

    const counter = $('.intro__counter', intro);
    const typed = $('.intro__typed', intro);
    const typedText = $('.intro__text', intro);
    const cursor = $('.intro__cursor', intro);
    const logo = $('.intro__logo', intro);
    const actions = $('.intro__actions', intro);
    const TEXT = 'ABOVE ORDINARY MUSIC GROUP';
    // 로고(img/logo-white.png) 안에서 A·O·M·G 각 글자의 중심과 높이 (로고 폭·높이 대비 비율, 실측)
    const SLOT = { 0: [0.1125, 0.530, 0.69], 6: [0.3795, 0.500, 1.0], 15: [0.6355, 0.530, 0.69], 21: [0.8845, 0.530, 0.69] };
    document.documentElement.classList.add('is-intro');
    intro.hidden = false;

    // 글자마다 span → 타이핑은 span을 하나씩 켜는 방식 (위치 측정 가능)
    typedText.innerHTML = [...TEXT].map((c, i) => `<span class="intro__ch${i in SLOT ? ' is-initial' : ''}" data-i="${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    const chars = [...typedText.children];

    const showActions = () => {
      actions.hidden = false;
      requestAnimationFrame(() => intro.classList.add('is-ready'));
      $('button', actions).focus();
    };
    const showLogoNow = () => { typed.hidden = true; logo.classList.add('is-in'); showActions(); };

    // 타이핑이 끝나면: 첫 글자 A·O·M·G만 남기고 → 로고 속 자리로 모이며 → 실제 로고로 바뀜
    function assemble() {
      cursor.hidden = true;
      intro.classList.add('is-collapsing');                       // 나머지 글자 사라짐 (CSS)
      setTimeout(() => {
        const L = logo.getBoundingClientRect();
        chars.filter((c) => c.classList.contains('is-initial')).forEach((c, k) => {
          const [fx, fy, fh] = SLOT[c.dataset.i];
          const r = c.getBoundingClientRect();
          const cap = parseFloat(getComputedStyle(c).fontSize) * 0.71;  // 대문자 높이
          const sc = (L.height * fh) / cap;
          const dx = L.left + L.width * fx - (r.left + r.width / 2);
          const dy = L.top + L.height * fy - (r.top + r.height / 2);
          c.style.transitionDelay = `${k * 70}ms`;
          c.style.transform = `translate(${dx}px, ${dy}px) scale(${sc})`;
        });
        setTimeout(() => {                                         // 모인 자리에서 로고로 교체
          logo.classList.add('is-in');
          intro.classList.add('is-assembled');
          setTimeout(() => { typed.hidden = true; showActions(); }, 600);
        }, 950);
      }, 450);
    }

    if (reduceMotion) { counter.textContent = '100'; showLogoNow(); }
    else {
      // 카운터 000 → 100 = 로딩 진행 표시 (KODE 프리로더). 최소 2.4초 타이핑,
      // 페이지(3D 파일 포함) 로딩이 끝나기 전에는 99에서 대기
      let loaded = document.readyState === 'complete';
      addEventListener('load', () => { loaded = true; }, { once: true });
      const start = performance.now(), dur = 2400;
      const tick = (now) => {
        const p = Math.min(loaded ? 1 : 0.99, (now - start) / dur);
        counter.textContent = String(Math.round(p * 100)).padStart(3, '0');
        const n = Math.round(p * TEXT.length);
        chars.forEach((c, i) => c.classList.toggle('is-on', i < n));
        if (p < 1) requestAnimationFrame(tick);
        else setTimeout(assemble, 350);
      };
      requestAnimationFrame(tick);
    }

    const enter = () => {
      try { sessionStorage.setItem('aomg-entered', '1'); } catch (e) { /* noop */ }
      intro.classList.add('is-leaving');
      document.documentElement.classList.remove('is-intro');
      const done = () => { intro.remove(); const h = $('#hero'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } };
      reduceMotion ? done() : setTimeout(done, 700);
    };
    $('[data-action="enter"]', intro).addEventListener('click', enter);
    intro.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') enter();
      if (e.key === 'Tab') { // 포커스를 인트로 안에 가둠
        const b = [...intro.querySelectorAll('button:not([hidden])')];
        if (!b.length) return;
        const i = b.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); b[b.length - 1].focus(); }
        else if (!e.shiftKey && i === b.length - 1) { e.preventDefault(); b[0].focus(); }
      }
    });
  }

  /* ---------- 2. 긁어서 드러나는 포스터 ---------- */
  function initScratch() {
    const wrap = $('[data-scratch]');
    if (!wrap) return;
    const canvas = $('.scratch__canvas', wrap);
    const btn = $('[data-action="reveal"]', wrap.parentElement);
    const reveal = () => { wrap.classList.add('is-revealed'); if (btn) btn.hidden = true; };
    if (reduceMotion) { reveal(); return; }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let w = 0, h = 0, drawing = false, last = null, erased = 0;
    function paint() {
      const r = wrap.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.width = Math.round(r.width * dpr); h = canvas.height = Math.round(r.height * dpr);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = css('--color-accent'); ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = css('--color-black');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const fs = Math.round(w / 9);
      ctx.font = `400 ${fs}px ${css('--font-display-en')}`;
      ctx.fillText('SCRATCH', w / 2, h / 2 - fs * 0.45);
      ctx.fillText('TO REVEAL', w / 2, h / 2 + fs * 0.45);
      ctx.globalCompositeOperation = 'destination-out';
      erased = 0;
    }
    const at = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (w / r.width), y: (e.clientY - r.top) * (h / r.height) }; };
    function scratch(p) {
      if (!w || !h) return;
      ctx.lineWidth = w / 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo((last || p).x, (last || p).y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p; erased++;
      if (erased % 20 === 0 && w > 0 && h > 0) {
        // 지워진 비율이 45%를 넘으면 전체 공개
        const d = ctx.getImageData(0, 0, w, h).data; let clear = 0;
        for (let i = 3; i < d.length; i += 64) if (d[i] === 0) clear++;
        if (clear / (d.length / 64) > 0.45) reveal();
      }
    }
    // 마우스는 올리기만 해도, 터치는 누른 채로 긁기
    canvas.addEventListener('pointermove', (e) => { if (finePointer || drawing) scratch(at(e)); });
    canvas.addEventListener('pointerdown', (e) => { drawing = true; last = null; scratch(at(e)); });
    canvas.addEventListener('pointerup', () => { drawing = false; last = null; });
    canvas.addEventListener('pointerleave', () => { last = null; });
    if (btn) btn.addEventListener('click', reveal);
    document.fonts ? document.fonts.ready.then(paint) : paint();
    new ResizeObserver(() => { if (!wrap.classList.contains('is-revealed')) paint(); }).observe(wrap);
  }

  /* ---------- 3. 마우스 트레일 ---------- */
  function initTrail() {
    if (!finePointer || reduceMotion) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'cursor-trail'; canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const pts = []; let dpr = 1;
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; };
    size(); addEventListener('resize', size);
    addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') pts.push({ x: e.clientX, y: e.clientY, t: performance.now() }); }, { passive: true });
    const gnb = $('#gnb');
    (function frame(now) {
      while (pts.length && now - pts[0].t > 450) pts.shift();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (pts.length > 1) {
        // 배경 톤에 맞춰 검정/흰색 (GNB 톤 재사용) — 팔레트 밖 색을 만들지 않음
        const tone = gnb ? gnb.dataset.tone : 'on-dark';
        ctx.strokeStyle = tone === 'on-dark' ? css('--color-white') : css('--color-black');
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 1; i < pts.length; i++) {
          const a = 1 - (now - pts[i].t) / 450;
          ctx.globalAlpha = Math.max(0, a);
          ctx.lineWidth = 2 * dpr * a;
          ctx.beginPath(); ctx.moveTo(pts[i - 1].x * dpr, pts[i - 1].y * dpr); ctx.lineTo(pts[i].x * dpr, pts[i].y * dpr); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      requestAnimationFrame(frame);
    })(performance.now());
  }

  initIntro();
  initScratch();
  initTrail();
})();
