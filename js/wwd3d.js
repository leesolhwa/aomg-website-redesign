/* AOMG Concept Redesign — wwd3d.js (ES module)
 * WHAT WE DO 카드 안 3D 오브제 (20차, 22차 재질 변경).
 * 사이트 앞에서 나온 모티프 4개: 두꺼운 CD · 유리 지구본 · 반짝임(히어로 스파크) · 매끈한 유리 덩어리.
 * 재질: 매끈한 투명 유리. 몸통은 비치고(검정), 유리 안에 주황 네온관이 비치듯 가장자리 곡선을 따라 주황 빛이 흐름.
 *       무지개 분산 없음, 흰 빛 없음. 둘레의 은은한 번짐은 CSS drop-shadow (캔버스가 투명이라 빛난 곳만 번짐).
 * 렌더러 하나로 화면에 보이는 카드만 차례로 그려 각 카드의 2D 캔버스에 복사 (WebGL 컨텍스트 1개).
 * 실패하거나 동작 줄이기·1024px 미만이면 아무것도 하지 않음 → 카드의 미리 렌더한 이미지가 그대로 보임. */
import * as THREE from 'three';

const NEON = [0xFF5A1F, 0xFF6A2A, 0xFF7A35]; // #FF3B1F보다 살짝 노랗게: 어두운 유리 위에서 빨강이 아니라 주황으로 보이게

/* 환경: 거의 검정 + 화면 둘레에 가지런히 놓인 주황 네온 띠 12개. 유리가 이 띠를 굴절·반사할 때만 빛남 */
function buildEnvCube(renderer) {
  const strip = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 8;
    const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, 'rgba(255,255,255,0.6)'); g.addColorStop(0.5, '#fff');
    g.addColorStop(0.55, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 8);
    return new THREE.CanvasTexture(c);
  })();
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x020202);
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 12; i++) {
    const th = i / 12 * Math.PI * 2 + rnd() * 0.2, ph = (rnd() - 0.5) * 0.5, d = 12;
    const w = 0.25 + rnd() * 0.35, h = 6 + rnd() * 8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 3, h), new THREE.MeshBasicMaterial({ map: strip, color: new THREE.Color(NEON[i % 3]).multiplyScalar(1.6 + rnd() * 1.2), side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending }));
    m.position.set(d * Math.cos(ph) * Math.cos(th), d * Math.sin(ph), d * Math.cos(ph) * Math.sin(th));
    m.lookAt(0, 0, 0); if (i % 3 === 0) m.rotateZ(Math.PI / 2);
    scene.add(m);
  }
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(30, 16, 8), new THREE.MeshBasicMaterial({ color: 0x0a0302, side: THREE.BackSide })));
  const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  new THREE.CubeCamera(0.1, 100, rt).update(renderer, scene);
  return rt.texture;
}

/* 유리 셰이더: 굴절(몸통) + 프레넬 반사(가장자리). 출력 알파 = 밝기 → 어두운 몸통은 투명, 빛난 곳만 보임 */
const glassMat = (env) => new THREE.ShaderMaterial({
  uniforms: { env: { value: env } },
  transparent: true,
  vertexShader: /* glsl */`
    varying vec3 vN; varying vec3 vW;
    void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */`
    uniform samplerCube env; varying vec3 vN; varying vec3 vW;
    void main() {
      vec3 N = normalize(vN), V = normalize(vW - cameraPosition);
      if (dot(N, V) > 0.0) N = -N;
      vec3 refr = textureCube(env, refract(V, N, 1.0 / 1.45)).rgb;
      float fr = pow(1.0 - max(dot(-V, N), 0.0), 3.0);
      vec3 refl = textureCube(env, reflect(V, N)).rgb;
      vec3 o = clamp((refr * 0.85 + refl * 0.9 * fr) * 1.3, 0.0, 1.0);
      gl_FragColor = vec4(o, max(o.r, max(o.g, o.b)));
    }`,
});

const geos = {
  // MUSIC PRODUCTION: 도넛처럼 두꺼운 CD
  cd() {
    const R = 1.35, r = 0.36, T = 0.62, b = 0.26, pts = [];
    const arc = (cx, cy, rad, a0, a1, n) => { for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(new THREE.Vector2(cx + rad * Math.cos(a), cy + rad * Math.sin(a))); } };
    arc(r + b, -T / 2 + b, b, Math.PI, 1.5 * Math.PI, 16); arc(R - b, -T / 2 + b, b, 1.5 * Math.PI, 2 * Math.PI, 16);
    arc(R - b, T / 2 - b, b, 0, 0.5 * Math.PI, 16); arc(r + b, T / 2 - b, b, 0.5 * Math.PI, Math.PI, 16); pts.push(pts[0].clone());
    const g = new THREE.LatheGeometry(pts, 160); g.computeVertexNormals();
    return g;
  },
  // ARTIST MANAGEMENT: 유리 지구본 (구 + 경선 고리 3개는 아래에서 추가)
  globe() { return new THREE.SphereGeometry(1.15, 96, 64); },
  // LIVE & EVENTS: 반짝임 (히어로 유리가 깨질 때 튀는 스파크)
  spark() {
    const sh = new THREE.Shape(), n = 4, ro = 1.45, ri = 0.32;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + Math.PI / 2, a2 = a + Math.PI / n, a3 = a + 2 * Math.PI / n;
      if (i === 0) sh.moveTo(Math.cos(a) * ro, Math.sin(a) * ro);
      sh.quadraticCurveTo(Math.cos(a2) * ri, Math.sin(a2) * ri, Math.cos(a3) * ro, Math.sin(a3) * ro);
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.14, bevelSegments: 12, curveSegments: 40 });
    g.center(); g.computeVertexNormals();
    return g;
  },
  // CONTENTS & BRAND: 매끈한 유리 덩어리 (조약돌)
  crystal() {
    const g = new THREE.SphereGeometry(1.1, 96, 64), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = 1 + 0.18 * Math.sin(v.x * 2.2 + 1.0) * Math.cos(v.y * 1.8) + 0.1 * Math.sin(v.z * 3.0);
      p.setXYZ(i, v.x * 1.05 * n, v.y * 1.2 * n, v.z * 0.8 * n);
    }
    g.computeVertexNormals();
    return g;
  },
};

export function initWwd3D(section) {
  if (!section) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(min-width: 1024px)').matches) return;
  const cards = [...section.querySelectorAll('[data-obj]')];
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
  renderer.setClearColor(0x000000, 0);
  const env = buildEnvCube(renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50); camera.position.set(0, 0, 6.6);
  const items = cards.map((card) => {
    const box = card.querySelector('.wwd__obj');
    const canvas = document.createElement('canvas'); canvas.className = 'wwd__canvas'; canvas.setAttribute('aria-hidden', 'true');
    box.appendChild(canvas);
    const scene = new THREE.Scene();
    const mat = glassMat(env);
    const obj = new THREE.Mesh(geos[card.dataset.obj](), mat);
    if (card.dataset.obj === 'globe') for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.045, 24, 200), mat); t.rotation.y = i * Math.PI / 3; obj.add(t); }
    scene.add(obj);
    return { card, box, canvas, ctx: canvas.getContext('2d'), scene, obj, ready: false };
  });
  let W = 0, H = 0;
  const fit = () => {
    const r = items[0].box.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
    items.forEach((it) => { it.canvas.width = W; it.canvas.height = H; });
  };
  fit(); addEventListener('resize', fit);
  let raf = 0, on = false;
  const t0 = performance.now();
  const loop = (now) => {
    raf = 0; if (!on) return;
    const t = (now - t0) / 1000;
    items.forEach((it, i) => {
      const r = it.card.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;            // 화면 밖 카드는 그리지 않음
      // 한 바퀴 약 9초로 천천히 돌면서 네온 빛이 곡선을 따라 흐름
      it.obj.rotation.set(0.35 + Math.sin(t * 0.7 + i) * 0.25, t * 0.7 + i * 1.3, 0.15);
      renderer.render(it.scene, camera);
      it.ctx.clearRect(0, 0, W, H); it.ctx.drawImage(renderer.domElement, 0, 0);
      if (!it.ready) { it.ready = true; it.box.classList.add('is-3d'); }
    });
    raf = requestAnimationFrame(loop);
  };
  new IntersectionObserver(([en]) => {
    on = en.isIntersecting;
    if (on && !raf) raf = requestAnimationFrame(loop);
  }).observe(section);
}
