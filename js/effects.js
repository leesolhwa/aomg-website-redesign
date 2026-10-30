/* AOMG Concept Redesign — effects.js
 * KODE 레퍼런스 인터랙션의 AOMG 버전
 * 1) 인트로: 카운터 + 커서 → "ABOVE ORDINARY MUSIC GROUP" 타이핑 → A·O·M·G가 모여 로고 조각(img/logo/*.svg)으로 맞물림 → [ ENTER ]
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
    const actions = $('.intro__actions', intro);
    const pieces = Object.fromEntries([...intro.querySelectorAll('.intro__piece')].map((p) => [p.dataset.piece, p]));
    const TEXT = 'ABOVE ORDINARY MUSIC GROUP';
    const INITIAL = { 0: 'a', 6: 'o', 15: 'm', 21: 'g' };   // 각 단어 첫 글자 → 로고 조각
    const EASE = 'cubic-bezier(0.76, 0, 0.24, 1)';
    document.documentElement.classList.add('is-intro');
    intro.hidden = false;

    typedText.innerHTML = [...TEXT].map((c, i) => `<span class="intro__ch${i in INITIAL ? ' is-initial' : ''}" data-i="${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    const chars = [...typedText.children];
    const initials = chars.filter((c) => c.classList.contains('is-initial'));

    const showActions = () => {
      // 버튼 자리는 처음부터 비워 둠(로고가 밀리지 않게). 로고가 다 맞춰진 뒤 아래에서 올라오며 나타남 (24차)
      requestAnimationFrame(() => { intro.classList.add('is-ready'); $('button', actions).focus({ preventScroll: true }); });
    };
    const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const wait = (a) => a.finished.catch(() => {});

    // 타이핑 이후 연출
    async function assemble() {
      cursor.hidden = true;
      // 1) 나머지 글자는 위로 흐려지며 사라지고, A·O·M·G는 가운데로 모여 한 단어가 됨 (동시에)
      const others = chars.filter((c) => !c.classList.contains('is-initial'));
      others.forEach((c, i) => c.animate(
        [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(-0.35em)', filter: 'blur(6px)' }],
        { duration: 520, delay: (i % 7) * 25, easing: 'ease-out', fill: 'forwards' }));
      const gap = parseFloat(getComputedStyle(typedText).fontSize) * 0.08;
      const widths = initials.map((c) => c.getBoundingClientRect().width);
      const total = widths.reduce((s, w) => s + w, 0) + gap * 3;
      const mid = center(typed.getBoundingClientRect()).x;
      let cursorX = mid - total / 2;
      const gather = initials.map((c, k) => {
        const r = c.getBoundingClientRect();
        const dx = cursorX - r.left; cursorX += widths[k] + gap;
        return c.animate([{ transform: 'none' }, { transform: `translateX(${dx}px)` }], { duration: 820, delay: 120, easing: EASE, fill: 'forwards' });
      });
      await Promise.all(gather.map(wait));

      // 2) 같은 자리에서 글자 → 로고 조각으로 바뀜 (조각을 글자 크기·위치에 맞춰 놓고 교차 페이드)
      const inverse = {};
      initials.forEach((c) => {
        const piece = pieces[INITIAL[c.dataset.i]];
        const pr = piece.getBoundingClientRect(), cr = c.getBoundingClientRect();
        const cap = parseFloat(getComputedStyle(c).fontSize) * 0.72;
        const sc = (INITIAL[c.dataset.i] === 'o' ? cap * 1.08 : cap) / pr.height;
        const pc = center(pr), cc = center(cr);
        inverse[c.dataset.i] = `translate(${cc.x - pc.x}px, ${cc.y - pc.y}px) scale(${sc})`;
        piece.style.transform = inverse[c.dataset.i];
        c.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(3px)' }], { duration: 360, easing: 'ease-out', fill: 'forwards' });
        piece.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: 'ease-out', fill: 'forwards' });
      });
      await new Promise((r) => setTimeout(r, 300));

      // 3) 조각이 커지며 로고 속 제자리로 맞물림 (지구본은 회전하며 들어옴), 살짝 지나쳤다가 안착
      const moves = initials.map((c, k) => {
        const key = INITIAL[c.dataset.i];
        const piece = pieces[key];
        const from = inverse[c.dataset.i];
        const spin = key === 'o' ? ' rotate(-120deg)' : '';
        const anim = piece.animate([
          { transform: from + spin },
          { transform: 'scale(1.035)', offset: 0.82 },
          { transform: 'none' },
        ], { duration: 1100, delay: k * 70, easing: EASE, fill: 'forwards' });
        anim.finished.then(() => { piece.style.transform = 'none'; }).catch(() => {});
        return anim;
      });
      await Promise.all(moves.map(wait));
      typed.hidden = true;
      setTimeout(showActions, 300);
    }

    if (reduceMotion) { counter.textContent = '100'; intro.classList.add('is-static'); typed.hidden = true; showActions(); }
    else {
      // 카운터 000 → 100 = 로딩 진행 표시 (KODE 프리로더). 최소 2.4초 타이핑,
      // 페이지(3D 파일 포함) 로딩이 끝나기 전에는 99에서 대기
      let loaded = document.readyState === 'complete';
      addEventListener('load', () => { loaded = true; }, { once: true });
      const start = performance.now(), dur = 2400;
      let typedN = -1, idleT = 0;
      typedText.insertBefore(cursor, chars[0]);
      const tick = (now) => {
        const p = Math.min(loaded ? 1 : 0.99, (now - start) / dur);
        counter.textContent = String(Math.round(p * 100)).padStart(3, '0');
        const n = Math.round(p * TEXT.length);
        if (n !== typedN) {
          typedN = n;
          chars.forEach((c, i) => c.classList.toggle('is-on', i < n));
          // 커서는 방금 친 글자 바로 뒤로 (타자 치는 느낌). 치는 동안은 깜빡이지 않음
          typedText.insertBefore(cursor, chars[n] || null);
          cursor.classList.add('is-typing');
          clearTimeout(idleT); idleT = setTimeout(() => cursor.classList.remove('is-typing'), 450);
        }
        if (p < 1) requestAnimationFrame(tick);
        else setTimeout(assemble, 900); // 다 친 뒤 커서가 두어 번 깜빡이고 넘어감
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
