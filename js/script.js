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
    let id = a.getAttribute('href').slice(1);
    // NOW PLAYING: 3D가 없으면 대체 섹션으로
    if (id === 'now-playing' && document.documentElement.classList.contains('no-webgl')) id = 'now-playing-fallback';
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    history.pushState(null, '', a.getAttribute('href'));
    if (target.classList.contains('sound__anchor')) return; // 고정 무대의 끝 지점(표시 요소 아님)
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
      const link = hit && $(`.gnb__menu a[href="#${hit.dataset.section || hit.id}"]`);
      if (link) link.setAttribute('aria-current', 'true');
    }
  }
  window.addEventListener('scroll', updateTone, { passive: true });
  window.addEventListener('resize', updateTone);
  window.addEventListener('sound:tone', updateTone); // 고정 무대의 배경이 레드 ↔ 검정으로 바뀔 때

  /* ---------- 카드 템플릿 ---------- */
  const releaseCard = (r, { withPlay = false } = {}) => `
    <li class="card" data-reveal>
      <div class="card__frame">${r.cover
        ? `<img class="card__media card__media--square" src="${esc(r.cover)}" alt="${esc(r.title)} 앨범 커버" loading="lazy" width="1200" height="1200">`
        : `<div class="card__text-cover" aria-hidden="true">${esc(r.title)}</div>`}</div>
      <p class="card__title t-body-4">[${esc(r.title)}]</p>
      <p class="card__meta">${esc(r.artist)} · ${esc(r.type)} · ${esc(r.date)}</p>
      <div class="card__actions">${withPlay && r.trackId ? `<button class="cta" type="button" data-action="play-track" data-track="${esc(r.trackId)}" aria-label="${esc(r.title)} 데모 재생"><span class="cta__label">PLAY</span></button>` : ''}${r.listen ? cta('LISTEN', ext(r.listen, `${r.title} 스트리밍에서 듣기`)) : ''}</div>
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
    // 25차: 카드 4개 뒤 5번째 칸 = 뉴스 더 보기 (이탤릭 More + 넓은 고딕 News, 얇은 선 테두리). 누르면 인스타그램
    const newsList = $('[data-render="news"]');   // 11/09: 메인 NEWS 섹션 삭제(인스타그램과 겹침) — 다시 넣으면 그대로 그려짐
    if (newsList) newsList.innerHTML = NEWS.map(newsCard).join('') +
      `<li class="news-more"><a href="${AOMG.social.instagram}" target="_blank" rel="noopener" aria-label="뉴스 더 보기, 인스타그램 새 창"><span class="news-more__text" aria-hidden="true"><em>More</em><span>News</span></span></a></li>`;
  }

  /* ---------- artist.html 렌더링 ---------- */
  function renderArtist() {
    const params = new URLSearchParams(location.search);
    let a = artistById(params.get('id'));
    if (!a) {
      if (params.get('id')) {
        const msg = document.createElement('p');
        msg.className = 't-ko-caption detail-hero__notice'; msg.setAttribute('role', 'status');
        msg.textContent = '찾는 아티스트가 없어요. KEYVEATZ 페이지를 대신 보여드려요.';
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
        $('.cta__label', b).textContent = s.playing ? 'SOUND OFF' : 'SOUND ON';
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

  /* ---------- NOW PLAYING (CD 컬렉션) 정보 패널 ----------
   * sound3d.js가 선택된 CD가 바뀔 때 show(i, release)를 부름. 트랙·재생은 기존 Player 사용.
   * 데모 트랙이 없는 앨범은 아무것도 재생하지 않고 안내 문구 없이 비워 두고, 스트리밍 링크가 있으면 LISTEN만 보여 줌 */
  function initNowPlaying() {
    const np = $('#np');
    if (!np || !window.Player) return;
    const LOOP = 30;
    const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
    let rel = null;
    $('[data-render="np-total"]').textContent = String(RELEASES.length).padStart(2, '0');
    function show(i, r) {
      rel = r;
      $('[data-render="np-title"]').textContent = r.title;
      $('[data-render="np-artist"]').textContent = r.artist;
      $('[data-render="np-type"]').textContent = r.type;
      $('[data-render="np-date"]').textContent = r.date;
      $('[data-render="np-index"]').textContent = String(i + 1).padStart(2, '0');
      const t = r.trackId && TRACKS.find((x) => x.id === r.trackId);
      const list = $('[data-render="np-tracks"]');
      if (t) {
        const no = TRACKS.indexOf(t) + 1;
        list.innerHTML = `<li class="np__track" data-track-row="${esc(t.id)}">
          <span class="np__no">DEMO ${String(no).padStart(2, '0')}</span>
          <span class="np__name">${esc(t.title)}</span>
          <button class="cta" type="button" data-action="play-track" data-track="${esc(t.id)}" aria-label="${esc(t.title)} 재생"><span class="cta__label">PLAY</span></button>
        </li>`;
      } else {
        // 데모가 없는 앨범: 안내 문구 없이 비워 둠 (스트리밍 링크가 있으면 LISTEN만)
        list.innerHTML = r.listen ? `<li class="np__track is-empty">${cta('LISTEN', ext(r.listen, `${r.title} 스트리밍에서 듣기`))}</li>` : '';
      }
      np.classList.toggle('has-track', !!t);
      paint(Player.state);
    }
    function paint(s) {
      const mine = rel && rel.trackId && s.trackId === rel.trackId;
      const prog = mine ? s.progress : 0;
      $('.np__progress span').style.width = `${Math.round(prog * 100)}%`;
      $('.np__progress').setAttribute('aria-valuenow', String(Math.round(prog * 100)));
      $('[data-render="np-time"]').textContent = fmt(prog * LOOP);
      $('[data-render="np-dur"]').textContent = rel && rel.trackId ? fmt(LOOP) : '—';
      $$('[data-track-row]', np).forEach((row) => {
        const on = s.playing && row.dataset.trackRow === s.trackId;
        const b = $('[data-action="play-track"]', row);
        if (b) { $('.cta__label', b).textContent = on ? 'PAUSE' : 'PLAY'; b.setAttribute('aria-label', `${$('.np__name', row).textContent} ${on ? '정지' : '재생'}`); }
        row.classList.toggle('is-current', on);
      });
    }
    Player.subscribe(paint);
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action="cd-prev"], [data-action="cd-next"]');
      if (!b || !window.SoundScene) return;
      b.dataset.action === 'cd-next' ? SoundScene.next() : SoundScene.prev();
    });
    np.addEventListener('keydown', (e) => {
      if (!window.SoundScene) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); SoundScene.next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); SoundScene.prev(); }
    });
    window.NowPlaying = { show };
    show(0, RELEASES[0]);
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

  /* ---------- 접히는 플레이어: 평소엔 작은 PLAYER 버튼, 누르거나 곡을 재생하면 바가 열림 ---------- */
  function initPlayerDock() {
    const bar = $('#player'), pill = $('.player-pill');
    if (!bar || !pill) return;
    const set = (open) => {
      bar.classList.toggle('is-collapsed', !open); pill.hidden = open;
      pill.setAttribute('aria-expanded', String(open));
      if (open) bar.removeAttribute('inert'); else bar.setAttribute('inert', '');
    };
    set(false);
    pill.addEventListener('click', () => { set(true); const b = bar.querySelector('[data-action="play-toggle"]'); b && b.focus({ preventScroll: true }); });
    bar.addEventListener('click', (e) => { if (e.target.closest('[data-action="player-close"]')) { set(false); pill.focus({ preventScroll: true }); } });
    if (window.Player) window.Player.subscribe((st) => { if (st.playing) set(true); });   // 어디서든 재생이 시작되면 열림
  }

  /* ---------- 푸터 (11/09): 맨 밑에서 플레이어 숨김 + 꾹 누르기 돋보기 ---------- */
  function initFooter() {
    const ft = $('#contact'); if (!ft) return;
    // 푸터가 화면 대부분을 채우면 PLAYER 버튼·바를 숨김 (html.at-footer)
    new IntersectionObserver(([en]) => document.documentElement.classList.toggle('at-footer', en.isIntersecting), { threshold: 0.6 }).observe(ft);
    // 돋보기: 마우스(정밀 포인터)에서만. 글을 '검사 모드'로 복제해 원 안에서만 보여 줌
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const body = ft.querySelector('.footer__body'); if (!body) return;
    const insp = document.createElement('div');
    insp.className = 'footer__insp'; insp.setAttribute('aria-hidden', 'true'); insp.inert = true;
    const skel = document.createElement('canvas'); skel.className = 'footer__canvas footer__skel';   // 엠블럼 뼈대 (logo3d.js가 그려 줌)
    insp.append(skel, body.cloneNode(true));
    const lens = document.createElement('div');
    lens.className = 'footer__lens'; lens.setAttribute('aria-hidden', 'true');
    let ticks = '';
    for (let i = 0; i < 72; i++) {
      const a = i * 5 * Math.PI / 180, r1 = i % 6 ? 150 : 146, r2 = i % 6 ? 158 : 162;
      ticks += `<line x1="${(160 + Math.cos(a) * r1).toFixed(1)}" y1="${(160 + Math.sin(a) * r1).toFixed(1)}" x2="${(160 + Math.cos(a) * r2).toFixed(1)}" y2="${(160 + Math.sin(a) * r2).toFixed(1)}"/>`;
    }
    lens.innerHTML = `<svg viewBox="0 0 320 320" fill="none" stroke="#ff3b1f" stroke-width="1"><circle cx="160" cy="160" r="150" stroke-width="1.5"/>${ticks}<line x1="160" y1="0" x2="160" y2="320"/><line x1="0" y1="160" x2="320" y2="160"/><circle cx="160" cy="160" r="3" fill="#ff3b1f" stroke="none"/></svg><span></span>`;
    ft.append(insp, lens);
    ft.classList.add('has-loupe');
    const xy = lens.querySelector('span');
    const sizes = () => insp.querySelectorAll('h2, p, a, ul').forEach((el) => { const r = el.getBoundingClientRect(); el.dataset.sz = `${Math.round(r.width)}×${Math.round(r.height)}`; });
    sizes(); addEventListener('resize', sizes);
    if (document.fonts) document.fonts.ready.then(sizes);
    const move = (e) => {
      const r = ft.getBoundingClientRect();
      ft.style.setProperty('--lx', `${e.clientX - r.left}px`); ft.style.setProperty('--ly', `${e.clientY - r.top}px`);
      xy.textContent = `x ${Math.round(e.clientX)}   y ${Math.round(e.clientY + scrollY)}`;
    };
    ft.addEventListener('pointermove', move);
    ft.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('a, button')) return;   // 링크·버튼은 평소처럼 누름
      move(e); ft.classList.add('is-holding');
      ft.dispatchEvent(new CustomEvent('footer-inspect', { detail: { on: true, canvas: skel } }));   // 엠블럼: 그 자리에 멈추고, 뼈대 사진을 돋보기 층에 (logo3d.js)
    });
    const end = () => {
      if (!ft.classList.contains('is-holding')) return;
      ft.classList.remove('is-holding');
      ft.dispatchEvent(new CustomEvent('footer-inspect', { detail: { on: false } }));
    };
    addEventListener('pointerup', end); addEventListener('pointercancel', end); ft.addEventListener('pointerleave', end);
  }

  /* ---------- REEL: 스크롤에 따라 정사각형 영상 → 화면 100%, 문구가 한 줄씩. 보일 때만 재생 ---------- */
  function initReel() {
    const sec = $('#reel'); if (!sec) return;
    const video = sec.querySelector('video');
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    let ticking = false;
    const update = () => {
      ticking = false;
      if (reduceMotion) return;
      const r = sec.getBoundingClientRect(), span = sec.offsetHeight - innerHeight;
      const t = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      const g = sm(0, 0.45, t);
      const set = (k, v) => sec.style.setProperty(k, v.toFixed(3));
      set('--g', g); set('--t1', sm(0.25, 0.5, t)); set('--t2', sm(0.35, 0.6, t)); set('--t3', sm(0.45, 0.7, t));
      set('--out', sm(0.72, 0.85, t)); set('--info', sm(0.8, 0.95, t)); set('--zoom', 1.12 - 0.12 * t);
      const tone = g > 0.85 ? 'on-dark' : 'on-light';   // 영상이 화면을 채우면 헤더 글자 흰색
      if (sec.dataset.tone !== tone) { sec.dataset.tone = tone; updateTone(); }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
    if (!video) return;
    if (reduceMotion) { video.removeAttribute('autoplay'); return; }   // 동작 줄이기: 자동 재생 안 함 (포스터만)
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting) video.play().catch(() => {}); else video.pause();
    }, { threshold: 0.05 }).observe(video);
  }

  /* WHAT WE DO (11/07): 화면 고정, 문장 → 유리 카드 4장이 가로로 지나감.
   * 데스크톱 + 동작 허용일 때만 (그 외에는 CSS가 일반 목록으로 보여줌) */
  function initWhatWeDo() {
    // 11/07: 화면 고정 + 가로 스크롤 — 섹션 안에서 내린 만큼 트랙(문장 → 카드 4장)을 왼쪽으로
    const sec = $('#what-we-do'); if (!sec) return;
    const track = sec.querySelector('.wwd__track'); if (!track) return;
    const mq = matchMedia('(min-width: 1024px)');
    let dist = 0;
    const on = () => mq.matches && !reduceMotion;
    const size = () => {
      if (!on()) { sec.style.removeProperty('--wwd-h'); track.style.removeProperty('--wwd-x'); return; }
      dist = Math.max(0, track.scrollWidth - innerWidth);
      sec.style.setProperty('--wwd-h', `${dist + innerHeight}px`);
    };
    const cardsEl = track.querySelector('.wwd__cards'), cards = [...track.querySelectorAll('.wwd__card')];
    const run = () => {
      if (!on()) { cards.forEach((c) => ['--s', '--o', '--px'].forEach((n) => c.style.removeProperty(n))); return; }
      const p = Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / Math.max(1, dist)));
      const x = -p * dist, half = innerWidth / 2;
      track.style.setProperty('--wwd-x', `${x.toFixed(1)}px`);
      // 11/08: 화면 가운데에 가까운 카드일수록 크고 또렷, 오브제는 반대로 살짝 (패럴랙스)
      cards.forEach((c) => {
        const d = (cardsEl.offsetLeft + c.offsetLeft + c.offsetWidth / 2 + x - half) / half, a = Math.min(1, Math.abs(d));
        c.style.setProperty('--s', (0.86 + 0.3 * (1 - a)).toFixed(3));   // 가운데 1.16 · 가장자리 0.86
        c.style.setProperty('--o', (0.22 + 0.78 * (1 - a) ** 1.5).toFixed(2));   // 가운데 또렷 · 나머지 어둡게
        c.style.setProperty('--bd', (0.1 + 0.45 * (1 - a) ** 2).toFixed(2));   // 가운데만 밝은 테두리
        c.style.setProperty('--px', `${(-d * 30).toFixed(1)}px`);
      });
    };
    size(); run();
    addEventListener('scroll', run, { passive: true });
    addEventListener('resize', () => { size(); run(); });
    addEventListener('load', () => { size(); run(); });
    mq.addEventListener?.('change', () => { size(); run(); });
  }

  if (isArtistPage) renderArtist(); else renderHome();
  bindPlayer();
  initPlayerDock();
  initFooter();
  if (!isArtistPage) { initNowPlaying(); initReel(); initWhatWeDo(); }
  initReveal();
  updateTone();
})();
