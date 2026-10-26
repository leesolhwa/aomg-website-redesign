/* AOMG Concept Redesign — script.js
 * GNB · 섹션 렌더링 · 상세페이지 · 등장 효과 (docs/prd.md 8장)
 * 데이터: js/data.js / 카피: docs/copy-strategy.md
 */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const artistById = (id) => ARTISTS.find((a) => a.id === id);
  const isArtistPage = document.body.classList.contains('page-artist');
  const cta = (label, attrs = '') => `<a class="cta" ${attrs}><span class="cta__label">${esc(label)}</span></a>`;
  const ext = (url, label) => `href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(label)}, 새 창"`;

  /* ---------- GNB: 모바일 메뉴 ---------- */
  const gnb = $('#gnb');
  const toggle = $('.gnb__toggle');
  function setMenu(open) {
    gnb.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    $('.cta__label', toggle).textContent = open ? 'CLOSE' : 'MENU';
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) $('.gnb__menu a').focus();
  }
  toggle.addEventListener('click', () => setMenu(!gnb.classList.contains('is-open')));
  $$('.gnb__menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && gnb.classList.contains('is-open')) { setMenu(false); toggle.focus(); } });

  /* ---------- 같은 페이지 앵커: 부드러운 이동 ----------
   * CSS scroll-behavior: smooth는 다른 페이지에서 #섹션으로 넘어올 때도 적용돼
   * 페이지 전환(View Transition)과 겹치므로, 같은 페이지 안의 클릭에만 JS로 적용 */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    history.pushState(null, '', a.getAttribute('href'));
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------- GNB: 배경에 따라 글자색 / 현재 섹션 표시 ---------- */
  const toned = $$('[data-tone]').filter((el) => el !== gnb);
  function updateTone() {
    const probe = gnb.offsetHeight / 2;
    const hit = toned.find((el) => { const r = el.getBoundingClientRect(); return r.top <= probe && r.bottom > probe; });
    if (hit) gnb.dataset.tone = hit.dataset.tone;
    if (!isArtistPage) {
      $$('.gnb__menu a').forEach((a) => a.toggleAttribute('aria-current', false));
      const link = hit && $(`.gnb__menu a[href="#${hit.id}"]`);
      if (link) link.setAttribute('aria-current', 'true');
    }
  }
  window.addEventListener('scroll', updateTone, { passive: true });
  window.addEventListener('resize', updateTone);

  /* ---------- 카드 템플릿 ---------- */
  const releaseCard = (r, { withPlay = false } = {}) => `
    <li class="card" data-reveal>
      <div class="card__frame">${r.cover
        ? `<img class="card__media card__media--square" src="${esc(r.cover)}" alt="${esc(r.title)} 앨범 커버" loading="lazy" width="1200" height="1200">`
        : `<div class="card__text-cover" aria-hidden="true">${esc(r.title)}</div>`}</div>
      <p class="card__title t-body-4">[${esc(r.title)}]</p>
      <p class="card__meta">${esc(r.artist)} · ${esc(r.type)} · ${esc(r.date)}</p>
      ${(withPlay && r.trackId) || r.listen ? `<div class="card__actions">
        ${withPlay && r.trackId ? `<button class="cta" type="button" data-action="play-track" data-track="${esc(r.trackId)}" aria-label="${esc(r.title)} 데모 재생"><span class="cta__label">PLAY</span></button>` : ''}
        ${r.listen ? cta('LISTEN', ext(r.listen, `${r.title} 스트리밍에서 듣기`)) : ''}
      </div>` : ''}
    </li>`;
  const newsCard = (n) => `
    <li class="card" data-reveal>
      <a class="card__link" ${ext(n.url, `${n.title} 원문 보기`)}>
        <div class="card__frame"><img class="card__media card__media--poster" src="${esc(n.image)}" alt="${esc(n.title)}" loading="lazy" width="800" height="1000"></div>
        <p class="card__meta">${esc(n.category)} · ${esc(n.date)}</p>
        <p class="card__title">${esc(n.title)}</p>
      </a>
    </li>`;
  const artistName = (a) => `
    <li><a href="artist.html?id=${esc(a.id)}" data-artist="${esc(a.id)}" aria-label="${esc(a.name)} (${esc(a.nameKo)})">
      <img class="artist-names__thumb" src="${esc(a.image)}" alt="" loading="lazy" width="1200" height="1200">
      <span>${esc(a.name)}</span>
    </a></li>`;
  const eventRow = (ev) => `
    <li class="event">
      <span>${esc(ev.date || 'TBA')}</span><span>${esc(ev.city || '')}</span><span>${esc(ev.venue || '')}</span><span>${esc(ev.status || '')}</span>
      <span>${ev.ticketUrl ? cta('TICKETS', ext(ev.ticketUrl, `${ev.title} 예매`)) : ''}</span>
    </li>`;
  function renderEvents(list, key) {
    const ul = $(`[data-render="${key}"]`);
    if (!ul) return;
    ul.innerHTML = list.map(eventRow).join('');
    const empty = $(`[data-empty="${key}"]`);
    if (empty) empty.hidden = list.length > 0;
  }

  /* ---------- Artist Universe: hover/focus 프로필 ---------- */
  function bindArtistPreview(root) {
    const preview = $('.artist-preview');
    if (!preview) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    $$('a[data-artist]', root).forEach((link) => {
      const a = artistById(link.dataset.artist);
      const show = (x, y) => {
        if (preview.getAttribute('src') !== a.image) preview.src = a.image;
        const w = preview.offsetWidth || 240;
        preview.style.transform = `translate(${Math.min(x + 24, innerWidth - w - 16)}px, ${Math.max(16, y - w / 2)}px)`;
        preview.classList.add('is-visible');
      };
      if (fine) link.addEventListener('mousemove', (e) => show(e.clientX, e.clientY));
      link.addEventListener('focus', () => { const r = link.getBoundingClientRect(); show(r.right, r.top + r.height / 2); });
      link.addEventListener('mouseleave', () => preview.classList.remove('is-visible'));
      link.addEventListener('blur', () => preview.classList.remove('is-visible'));
      // View Transition: 미리보기 이미지가 상세 히어로 이미지로 이어짐
      link.addEventListener('click', () => {
        if (preview.classList.contains('is-visible')) preview.style.viewTransitionName = 'artist-photo';
        else { const th = $('.artist-names__thumb', link); if (th && th.offsetParent) th.style.viewTransitionName = 'artist-photo'; }
      });
    });
    window.addEventListener('pageshow', () => { preview.style.viewTransitionName = ''; $$('.artist-names__thumb').forEach((t) => (t.style.viewTransitionName = '')); preview.classList.remove('is-visible'); });
  }

  /* ---------- Discography Wall: 연도 전환 ---------- */
  function initDiscography() {
    const section = $('#discography');
    const panel = $('[data-render="discography"]');
    if (!panel) return;
    const years = [...new Set(RELEASES.map((r) => r.year))].sort((a, b) => b - a);
    const count = $('[data-render="year-count"]');
    const wall = (y) => `<div class="discography__wall grid">
        <p class="discography__year" aria-label="${y}년 발매">${y}</p>
        <ul class="discography__list">${RELEASES.filter((r) => r.year === y).map((r) => releaseCard(r, { withPlay: true })).join('').replaceAll(' data-reveal', '')}</ul>
      </div>`;
    let idx = -1;
    function paint(i) {
      if (i === idx) return;
      const first = idx === -1; idx = i;
      const draw = () => { panel.innerHTML = wall(years[idx]); count.textContent = `${idx + 1} / ${years.length}`; };
      if (first || reduceMotion) return draw();
      panel.classList.add('is-leaving');
      setTimeout(() => { draw(); panel.classList.remove('is-leaving'); }, 150);
    }
    // 동작 줄이기: 고정 해제 + 전체 연도 목록 (prd 4-1)
    if (reduceMotion) {
      section.classList.add('is-static');
      panel.classList.add('discography__all');
      panel.innerHTML = years.map(wall).join('');
      $('.discography__controls').hidden = true;
      return;
    }
    // 스크롤 고정: 섹션 안 스크롤 진행도 → 연도 (reference: services 섹션)
    const sticky = $('.discography__sticky');
    const progressOf = () => {
      const r = section.getBoundingClientRect();
      const range = section.offsetHeight - innerHeight;
      return range > 0 ? Math.min(1, Math.max(0, -r.top / range)) : 0;
    };
    function onScroll() {
      if (section.classList.contains('is-static')) return;
      const p = progressOf();
      section.style.setProperty('--disco-progress', p.toFixed(3));
      paint(Math.min(years.length - 1, Math.floor(p * years.length)));
    }
    // 고정된 화면에 내용이 다 안 들어가면(작은 화면 높이) 고정 해제
    function checkFit() {
      section.classList.remove('is-static');
      paint(Math.max(0, idx));
      if (sticky.scrollHeight > innerHeight + 2) section.classList.add('is-static');
      onScroll();
    }
    const goTo = (i) => {
      i = (i + years.length) % years.length;
      if (section.classList.contains('is-static')) return paint(i);
      const range = section.offsetHeight - innerHeight;
      const top = section.getBoundingClientRect().top + scrollY + range * ((i + 0.5) / years.length);
      scrollTo({ top, behavior: 'smooth' });
    };
    $('[data-action="year-prev"]').addEventListener('click', () => goTo(idx - 1));
    $('[data-action="year-next"]').addEventListener('click', () => goTo(idx + 1));
    section.addEventListener('keydown', (e) => {
      if (e.target.closest('a, button:not([data-action^="year"])')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(idx - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(idx + 1); }
    });
    paint(0);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', checkFit);
    checkFit();
  }

  /* ---------- index 렌더링 ---------- */
  function renderHome() {
    $('[data-render="tracks"]').innerHTML = TRACKS.map((t, i) => `
      <li class="track" data-track-row="${esc(t.id)}">
        <span class="track__no">[ ${String(i + 1).padStart(2, '0')} ]</span>
        <span class="track__title">${esc(t.title)}</span>
        <button class="cta" type="button" data-action="play-track" data-track="${esc(t.id)}" aria-label="${esc(t.title)} 재생"><span class="cta__label">PLAY</span></button>
      </li>`).join('');
    const names = $('[data-render="artists"]');
    names.innerHTML = ARTISTS.map(artistName).join('');
    bindArtistPreview(names);
    initDiscography();
    renderEvents(EVENTS, 'events');
    $('[data-render="news"]').innerHTML = NEWS.map(newsCard).join('');
  }

  /* ---------- artist.html 렌더링 ---------- */
  function renderArtist() {
    const params = new URLSearchParams(location.search);
    let a = artistById(params.get('id'));
    if (!a) {
      if (params.get('id')) {
        const msg = document.createElement('p');
        msg.className = 't-ko-caption detail-hero__notice'; msg.setAttribute('role', 'status');
        msg.textContent = '찾는 아티스트가 없어요. 키비츠 페이지를 대신 보여드려요.';
        $('.detail-hero__body').prepend(msg); // 고정 GNB에 가리지 않도록 히어로 본문 안에
      }
      a = artistById('keyveatz');
    }
    const theme = a.theme;
    if (theme) {
      const root = document.documentElement.style;
      root.setProperty('--artist-accent', theme.accent);
      root.setProperty('--artist-bg', theme.bg);
      root.setProperty('--artist-text', theme.text);
    }
    document.title = `${a.name} / ${a.nameKo} — AOMG`;
    $('meta[name="description"]').setAttribute('content', `${a.tagline} 음악, 영상, 공연, 공식 채널을 한 페이지에서. (비공식 컨셉 리디자인)`);
    const img = $('[data-render="artist-image"]');
    img.src = a.image; img.alt = `${a.nameKo} 프로필 사진`;
    $('[data-render="artist-name"]').textContent = a.name;
    $('[data-render="artist-name-ko"]').textContent = a.nameKo;
    $('[data-render="artist-tagline"]').textContent = a.tagline;

    const hide = (key, empty) => { const s = $(`[data-section="${key}"]`); if (s) s.hidden = empty; };
    $('[data-render="bio-ko"]').textContent = a.bio.ko || '';
    const en = $('[data-render="bio-en"]'); en.textContent = a.bio.en || ''; en.hidden = !a.bio.en;
    hide('bio', !a.bio.ko && !a.bio.en);

    const rel = RELEASES.filter((r) => r.artistId === a.id);
    $('[data-render="artist-releases"]').innerHTML = rel.map((r) => releaseCard(r, { withPlay: true })).join('');
    hide('releases', !rel.length);

    const vids = VIDEOS.filter((v) => v.artistId === a.id);
    $('[data-render="artist-videos"]').innerHTML = vids.map((v, i) => `
      <li class="card" data-reveal>
        <div class="card__frame"><img class="card__media card__media--video" src="${esc(v.thumb)}" alt="${esc(v.title || `${a.nameKo} 영상 썸네일 ${i + 1}`)}" loading="lazy" width="480" height="360"></div>
        ${v.title ? `<p class="card__title">${esc(v.title)}</p>` : ''}
        <div class="card__actions">${cta('WATCH', ext(v.url, `${v.title || `${a.nameKo} 영상 ${i + 1}`} 유튜브에서 보기`))}</div>
      </li>`).join('');
    hide('videos', !vids.length);

    const evs = EVENTS.filter((e) => (e.artistIds || []).includes(a.id));
    renderEvents(evs, 'artist-events');
    const ig = a.links.find((l) => l.label === 'INSTAGRAM');
    if (ig) $('[data-render="artist-instagram"]').href = ig.url;
    // 공연은 Keyveatz(전체 데이터)만 빈 상태 표시, 나머지는 섹션 숨김 (prd 4-2)
    hide('events', !evs.length && a.id !== 'keyveatz');

    const news = NEWS.filter((n) => n.artistIds.includes(a.id));
    $('[data-render="artist-news"]').innerHTML = news.map(newsCard).join('');
    hide('news', !news.length);

    const related = $('[data-render="related"]');
    related.innerHTML = a.related.map(artistById).filter(Boolean).map(artistName).join('');

    $('[data-render="artist-links"]').innerHTML = a.links.map((l) => `<li>${cta(l.label, ext(l.url, l.label))}</li>`).join('');
    hide('links', !a.links.length);
  }

  /* ---------- 플레이어 UI 연결 ---------- */
  function bindPlayer() {
    if (!window.Player) return;
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const act = btn.dataset.action;
      if (act === 'audio-toggle' || act === 'play-toggle') Player.toggle();
      if (act === 'play-track') {
        const s = Player.state;
        if (s.playing && s.trackId === btn.dataset.track) Player.pause(); else Player.play(btn.dataset.track);
      }
    });
    const titleEl = $('[data-render="player-title"]');
    const bar = $('.player__progress');
    const current = $('[data-render="current-track"]');
    let first = true;
    Player.subscribe((s) => {
      $$('[data-action="audio-toggle"]').forEach((b) => {
        b.setAttribute('aria-pressed', String(s.playing));
        b.setAttribute('aria-label', s.playing ? '소리 끄기' : '소리 켜기');
        $('.cta__label', b).textContent = s.playing ? 'AUDIO OFF' : 'AUDIO ON';
      });
      const pt = $('[data-action="play-toggle"]');
      pt.setAttribute('aria-label', `${s.title} ${s.playing ? '정지' : '재생'}`);
      $('.cta__label', pt).textContent = s.playing ? 'PAUSE' : 'PLAY';
      $$('[data-action="play-track"]').forEach((b) => {
        const on = s.playing && b.dataset.track === s.trackId;
        $('.cta__label', b).textContent = on ? 'PAUSE' : 'PLAY';
      });
      $$('[data-track-row]').forEach((r) => r.classList.toggle('is-current', r.dataset.trackRow === s.trackId));
      if (current) current.textContent = s.title;
      const restoredIdle = first && Player.restored && !s.playing;
      if (s.playing || !first || Player.restored) titleEl.textContent = restoredIdle ? `${s.title} · 이어서 들으려면 [ PLAY ]를 눌러 주세요.` : `${s.title} · DEMO`;
      first = false;
      const pct = Math.round(s.progress * 100);
      bar.firstElementChild.style.width = `${pct}%`;
      bar.setAttribute('aria-valuenow', String(pct));
    });
  }

  /* ---------- 등장 효과 ---------- */
  function initReveal() {
    const items = $$('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -10% 0px' });
    items.forEach((el) => io.observe(el));
  }

  if (isArtistPage) renderArtist(); else renderHome();
  bindPlayer();
  initReveal();
  updateTone();
})();
