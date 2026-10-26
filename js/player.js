/* AOMG Concept Redesign — player.js
 * 오디오 엔진 · 미니 플레이어 · 비주얼라이저 (docs/prd.md 8장)
 * - 무음 기본값. [ AUDIO ON ] / [ PLAY ] 클릭(사용자 동작) 후에만 AudioContext 생성
 * - audio/track-0N.mp3가 없으면 Web Audio로 합성한 데모 비트 재생
 * - 비트 반응은 --beat(0~1)로 크기만 변경. 밝기·색 깜빡임 없음 (WCAG 2.3.1)
 * - 페이지 이동 시 sessionStorage에 트랙·재생 위치 저장 → 다음 페이지에서 일시정지 상태로 복원
 */
(() => {
  const STORE_KEY = 'aomg-player';
  const LOOP_SEC = 30; // 데모 트랙 길이 (진행바 기준)
  const PATTERNS = { // 합성 비트 패턴 (16스텝): k=킥, s=스네어, h=하이햇
    'demo-01': { bpm: 90, k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    'demo-02': { bpm: 96, k: 'x..x..x...x..x..', s: '....x.......x..x', h: 'xxx.xxx.xxx.xxx.' },
    'demo-03': { bpm: 84, k: 'x.......x.x.....', s: '....x.......x...', h: '..x...x...x...x.' },
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let ctx = null, master = null, analyser = null, freqData = null, noiseBuf = null;
  let mediaEl = null, mediaSrc = null;
  // data.js의 const 선언은 window 속성이 아니므로 typeof로 확인
  let currentId = (typeof TRACKS !== 'undefined' && TRACKS.length) ? TRACKS[0].id : null;
  let playing = false, useSynth = true;
  let startedAt = 0, offset = 0;         // 재생 위치 계산
  let schedTimer = null, nextTime = 0, step = 0;
  const listeners = new Set();

  const track = (id) => TRACKS.find((t) => t.id === id);
  const elapsed = () => (playing && ctx ? offset + (ctx.currentTime - startedAt) : offset) % LOOP_SEC;
  const emit = () => listeners.forEach((fn) => fn(state()));
  const state = () => ({ trackId: currentId, title: track(currentId)?.title, playing, progress: elapsed() / LOOP_SEC });

  function ensureContext() {
    if (ctx) return ctx.resume();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { document.documentElement.classList.add('no-webaudio'); return Promise.reject(new Error('no webaudio')); }
    ctx = new AC();
    master = ctx.createGain();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    master.connect(analyser).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    return ctx.resume();
  }

  // ---- 합성 드럼 ----
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.36);
  }
  function noise(t, dur, type, freq, vol) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.01);
  }
  function schedule() {
    const p = PATTERNS[currentId] || PATTERNS['demo-01'];
    const stepDur = 60 / p.bpm / 4;
    while (nextTime < ctx.currentTime + 0.12) {
      const i = step % 16;
      if (p.k[i] === 'x') kick(nextTime);
      if (p.s[i] === 'x') noise(nextTime, 0.18, 'bandpass', 1800, 0.5);
      if (p.h[i] === 'x') noise(nextTime, 0.05, 'highpass', 7000, 0.18);
      nextTime += stepDur; step++;
    }
  }

  // ---- 파일 재생 시도 → 실패 시 합성 ----
  function tryFile(t) {
    return new Promise((resolve) => {
      if (!t.src) return resolve(false);
      const el = new Audio();
      el.crossOrigin = 'anonymous';
      el.loop = true;
      el.preload = 'auto';
      const done = (ok) => { el.oncanplay = el.onerror = null; resolve(ok ? el : false); };
      el.oncanplay = () => done(true);
      el.onerror = () => done(false);
      el.src = t.src;
      setTimeout(() => done(false), 1500);
    });
  }

  function stopSources() {
    clearInterval(schedTimer); schedTimer = null;
    if (mediaEl) { mediaEl.pause(); }
  }

  async function start() {
    await ensureContext();
    stopSources();
    const t = track(currentId);
    const el = await tryFile(t);
    if (el) {
      useSynth = false;
      if (mediaSrc) mediaSrc.disconnect();
      mediaEl = el; mediaSrc = ctx.createMediaElementSource(el); mediaSrc.connect(master);
      el.currentTime = offset; await el.play();
    } else {
      useSynth = true; mediaEl = null;
      nextTime = ctx.currentTime + 0.05; step = 0;
      schedule(); schedTimer = setInterval(schedule, 25);
    }
    startedAt = ctx.currentTime; playing = true;
    document.documentElement.classList.add('is-audio-on');
    emit();
  }

  function pause() {
    if (!playing) return;
    offset = elapsed(); playing = false;
    stopSources();
    document.documentElement.classList.remove('is-audio-on');
    document.documentElement.style.setProperty('--beat', 0);
    emit();
  }

  const api = {
    play(id) { if (id && id !== currentId) { currentId = id; offset = 0; } return start().catch(onError); },
    pause,
    toggle() { return playing ? (pause(), Promise.resolve()) : api.play(); },
    get state() { return state(); },
    subscribe(fn) { listeners.add(fn); fn(state()); return () => listeners.delete(fn); },
  };
  function onError() {
    const title = document.querySelector('[data-render="player-title"]');
    if (title) title.textContent = '이 브라우저에서는 소리에 반응하는 화면을 볼 수 없어요. 발매 정보는 그대로 볼 수 있어요.';
  }

  // ---- 비주얼라이저 ----
  const canvas = document.getElementById('visualizer');
  const c2d = canvas ? canvas.getContext('2d') : null;
  function draw() {
    if (c2d) {
      const w = canvas.width, h = canvas.height;
      const color = getComputedStyle(canvas).color;
      c2d.clearRect(0, 0, w, h);
      c2d.fillStyle = color;
      const bars = 48, gap = w / bars, bw = gap * 0.5;
      if (playing && analyser && !reduceMotion.matches) {
        analyser.getByteFrequencyData(freqData);
        for (let i = 0; i < bars; i++) {
          const v = freqData[Math.floor((i / bars) * freqData.length * 0.75)] / 255;
          const bh = Math.max(2, v * h * 0.9);
          c2d.fillRect(i * gap + (gap - bw) / 2, (h - bh) / 2, bw, bh);
        }
      } else {
        // 정적 파형 (무음·동작 줄이기)
        for (let i = 0; i < bars; i++) {
          const bh = Math.max(2, (Math.sin(i * 0.55) * 0.5 + 0.5) * h * 0.25 + 2);
          c2d.fillRect(i * gap + (gap - bw) / 2, (h - bh) / 2, bw, bh);
        }
      }
    }
    if (playing && analyser && !reduceMotion.matches) {
      analyser.getByteFrequencyData(freqData);
      const low = (freqData[1] + freqData[2] + freqData[3]) / (3 * 255);
      document.documentElement.style.setProperty('--beat', low.toFixed(3));
    }
    if (playing) emitProgress();
    requestAnimationFrame(draw);
  }
  let lastP = 0;
  function emitProgress() { const now = performance.now(); if (now - lastP > 250) { lastP = now; emit(); } }
  requestAnimationFrame(draw);

  // ---- 페이지 이동 시 저장 / 복원 ----
  window.addEventListener('pagehide', () => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ trackId: currentId, offset: elapsed(), wasPlaying: playing })); } catch (e) { /* storage 불가 환경 */ }
  });
  let restored = null;
  try { restored = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null'); } catch (e) { restored = null; }
  if (restored && track(restored.trackId)) { currentId = restored.trackId; offset = restored.offset || 0; }
  api.restored = restored;

  window.Player = api;
})();
