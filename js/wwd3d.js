/* AOMG Concept Redesign — wwd3d.js (ES module)
 * WHAT WE DO 카드 안 3D 오브제 (20차).
 * 사이트 앞에서 나온 모티프 4개: 두꺼운 CD · 유리 지구본 · 반짝임(히어로 스파크) · 깎인 유리 덩어리.
 * 재질: 은색 금속 몸통 + 조명은 주황(#FF3B1F) 하나뿐 (흰 빛 없음).
 * 렌더러 하나로 화면에 보이는 카드만 차례로 그려 각 카드의 2D 캔버스에 복사 (WebGL 컨텍스트 1개).
 * 실패하거나 동작 줄이기면 아무것도 하지 않음 → 카드의 미리 렌더한 이미지가 그대로 보임. */
import * as THREE from 'three';

const ORANGE = 0xFF3B1F;

function buildEnv(renderer) {
  const scene = new THREE.Scene();
  // 하늘: 어두운 은색 → 밝은 은색 결 (무채색). 은색 몸통이 이 결을 반사
  const sg = new THREE.SphereGeometry(20, 64, 32), cols = [], pp = sg.attributes.position;
  for (let i = 0; i < pp.count; i++) {
    const y = pp.getY(i) / 20, x = pp.getX(i) / 20;
    let c;
    if (y > 0.15) c = 0.25 + 1.6 * Math.pow(y, 1.5);
    else if (y > -0.05) c = 0.9 + (0.15 - y) * 2.0 * Math.max(0, Math.cos(x * 3.0));
    else c = 0.03;
    const t = Math.min(1, Math.max(0, c / 2.0));
    const g = 0.015 + 0.55 * Math.pow(t, 1.4) * (0.75 + 0.25 * Math.cos(x * 9));
    cols.push(g, g, g);
  }
  sg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  scene.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  // 조명 판: 전부 주황
  const panel = (w, h, x, y, z, ry, rx, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(ORANGE).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); scene.add(m);
  };
  panel(16, 2.5, 0, 7, -3, 0, Math.PI / 2, 2.2);
  panel(4, 12, -9, 1, 2, Math.PI / 2, 0, 2.4);
  panel(4, 12, 9, 1, -2, -Math.PI / 2, 0, 2.0);
  panel(10, 1.2, 0, -2, -9, 0, 0, 1.6);
  panel(10, 1.2, 0, -2, 9, Math.PI, 0, 1.4);
  panel(2.5, 2.5, -5, 5, 7, Math.PI - 0.6, 0.5, 2.2);
  panel(2.5, 2.5, 6, -1, 6, Math.PI + 0.7, 0, 1.8);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(scene, 0.01).texture;
  pm.dispose();
  return tex;
}

const chrome = () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02 });
const glass = () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.6, ior: 1.5, envMapIntensity: 1.6, clearcoat: 1, transparent: true });

const makers = {
  // MUSIC PRODUCTION: 도넛처럼 두꺼운 CD (RELEASES의 CD)
  cd() {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 64;
    const x = cv.getContext('2d'), lg = x.createLinearGradient(0, 0, 1024, 0);
    ['#f4f4f4', '#cfd8e6', '#ffffff', '#e9d6ef', '#bfc4cc', '#ffffff', '#d6efe9', '#c9ccd2', '#f4f4f4'].forEach((c, i, a) => lg.addColorStop(i / (a.length - 1), c));
    x.fillStyle = lg; x.fillRect(0, 0, 1024, 64);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const R = 1.35, r = 0.36, T = 0.62, b = 0.26, pts = [];
    const arc = (cx, cy, rad, a0, a1, n) => { for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(new THREE.Vector2(cx + rad * Math.cos(a), cy + rad * Math.sin(a))); } };
    arc(r + b, -T / 2 + b, b, Math.PI, 1.5 * Math.PI, 12); arc(R - b, -T / 2 + b, b, 1.5 * Math.PI, 2 * Math.PI, 12);
    arc(R - b, T / 2 - b, b, 0, 0.5 * Math.PI, 12); arc(r + b, T / 2 - b, b, 0.5 * Math.PI, Math.PI, 12); pts.push(pts[0].clone());
    const o = new THREE.Mesh(new THREE.LatheGeometry(pts, 200), new THREE.MeshPhysicalMaterial({ map: tex, metalness: 1, roughness: 0.04, envMapIntensity: 1.2 }));
    o.rotation.set(1.05, 0.2, -0.35);
    return o;
  },
  // ARTIST MANAGEMENT: 유리 지구본 (히어로 메인 오브제 · 로고의 지구)
  globe() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.15, 96, 64), glass()));
    for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.014, 16, 200), chrome()); t.rotation.y = i * Math.PI / 3; g.add(t); }
    [-0.55, 0, 0.55].forEach((y) => { const t = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(1.16 * 1.16 - y * y), 0.014, 16, 200), chrome()); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); });
    g.rotation.set(0.35, 0.4, -0.3);
    return g;
  },
  // LIVE & EVENTS: 반짝임 (히어로 유리가 깨질 때 튀는 스파크)
  spark() {
    const sh = new THREE.Shape(), n = 4, ro = 1.45, ri = 0.32;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + Math.PI / 2, a2 = a + Math.PI / n, a3 = a + 2 * Math.PI / n;
      if (i === 0) sh.moveTo(Math.cos(a) * ro, Math.sin(a) * ro);
      sh.quadraticCurveTo(Math.cos(a2) * ri, Math.sin(a2) * ri, Math.cos(a3) * ro, Math.sin(a3) * ro);
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.28, bevelSize: 0.16, bevelSegments: 10, curveSegments: 32 }); g.center();
    const o = new THREE.Mesh(g, chrome()); o.rotation.set(0.25, -0.5, 0.15);
    return o;
  },
  // CONTENTS & BRAND: 깎인 유리 덩어리 (히어로 유리 조각)
  crystal() {
    const g = new THREE.DodecahedronGeometry(1.1, 0), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); p.setXYZ(i, v.x * 1.15, v.y * 0.8, v.z * 0.7); }
    g.computeVertexNormals();
    const o = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.03, flatShading: true }));
    o.rotation.set(-0.35, 0.95, 0.55);
    return o;
  },
};

export function initWwd3D(section) {
  if (!section) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(min-width: 768px)').matches) return;
  const cards = [...section.querySelectorAll('[data-obj]')];
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) { return; }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const env = buildEnv(renderer);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50); camera.position.set(0, 0, 6.2);
  const items = cards.map((card) => {
    const box = card.querySelector('.wwd__obj');
    const canvas = document.createElement('canvas'); canvas.className = 'wwd__canvas'; canvas.setAttribute('aria-hidden', 'true');
    box.appendChild(canvas);
    const scene = new THREE.Scene(); scene.environment = env;
    const obj = makers[card.dataset.obj](); scene.add(obj);
    return { card, box, canvas, ctx: canvas.getContext('2d'), scene, obj, base: obj.rotation.clone(), ready: false };
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
      // 천천히 돌면서 주황 하이라이트가 표면을 따라 흐름
      it.obj.rotation.set(it.base.x + Math.sin(t * 0.5 + i) * 0.18, it.base.y + t * 0.35, it.base.z + Math.cos(t * 0.4 + i) * 0.08);
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
