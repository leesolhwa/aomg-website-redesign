// #crowd 3D 공연장 로더: 사이트의 Three.js(r160) 하나만 쓰고, 공연장 근처에 오면 사진과 스크립트를 불러옴
import * as THREE from 'three';

const track = document.getElementById('crowd-track');
if (track) {
  globalThis.THREE = THREE;                         // js/crowd/*.js는 전역 THREE를 씀
  const version = new URL(import.meta.url).search;
  const files = ['print', 'exit', 'venue', 'scene'];
  const load = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.body.append(s);
  });
  const start = async () => {
    track.querySelectorAll('img[data-src]').forEach((img) => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
    try {
      for (const f of files) await load(new URL(`./crowd/${f}.js${version}`, import.meta.url));
    } catch (e) { console.warn('공연장 스크립트를 불러오지 못했어요.', e); }
  };
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { io.disconnect(); start(); }
  }, { rootMargin: '150% 0px' });
  io.observe(track);
}
