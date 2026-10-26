/* AOMG Concept Redesign — logo3d.js (ES module)
 * KODE 히어로의 3D 오브제를 AOMG 오브제(img/obj-bold.svg, 사용자 제공)로 재구성
 * - 드래그: 회전 (관성)
 * - 마우스를 올리면 두꺼운 조각으로 묵직하게 깨지며 흩어지고, 흩어진 조각이 AOMG 글자 배치로 모임
 *   (커서 주변은 조금 더 밀려남) → 벗어나면 다시 오브제로 모임
 * - 미니 플레이어 비트(--beat)에 맞춰 조각이 미세하게 반응 (깜빡임 없음)
 * - 히어로: 문장 텍스트를 같은 장면의 평면에 그려 유리(transmission) 굴절이 보이게 함
 * - WebGL 실패 시 html에 .no-webgl → HTML 텍스트가 그대로 보임
 */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { SVGLoader } from './vendor/SVGLoader.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

let shapePromise = null;
// SVG 경로 → 구멍(holes)을 포함한 Shape 목록 + 정규화 정보 (폭 3.2 단위)
const loadShapes = () => (shapePromise ||= fetch(new URL('../img/obj-bold.svg', import.meta.url)).then((r) => r.text()).then((txt) => {
  const data = new SVGLoader().parse(txt);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const box = new THREE.Box2();
  shapes.forEach((sh) => sh.getPoints().forEach((pt) => box.expandByPoint(pt)));
  return { shapes, scale: 3.2 / (box.max.x - box.min.x), cx: (box.min.x + box.max.x) / 2, cy: (box.min.y + box.max.y) / 2 };
}));

/* ---------- AOMG 글자 배치 (흩어진 조각이 모일 자리) ----------
 * 사용자 제공 글자 SVG(img/logo/*.svg)를 로고 실측 위치(인트로와 같은 값)에 그려 마스크를 만들고,
 * 글자 안쪽에 고르게 점을 뽑는다. 좌표는 폭 1 단위, 가운데 기준 */
const WORD_ASPECT = 1004 / 348;
const LETTERS = [
  ['a', 0.37, 18.05, 26.48, 69.66], ['o', 20.91, 0.78, 33.29, 98.99],
  ['m', 49.84, 19.02, 27.34, 68.28], ['g', 74.88, 17.59, 25.66, 70.83],
];
let wordPromise = null;
const loadWordMask = () => (wordPromise ||= Promise.all(LETTERS.map(([id]) => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => res(img); img.onerror = rej;
  img.src = new URL(`../img/logo/${id}.svg`, import.meta.url).href;
}))).then((imgs) => {
  const W = 480, H = Math.round(W / WORD_ASPECT);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  imgs.forEach((img, i) => { const [, x, y, w, h] = LETTERS[i]; ctx.drawImage(img, (x / 100) * W, (y / 100) * H, (w / 100) * W, (h / 100) * H); });
  const a = ctx.getImageData(0, 0, W, H).data;
  return { W, H, filled: (x, y) => a[(Math.round(y) * W + Math.round(x)) * 4 + 3] > 140 };
}));

function wordTargets(mask, n) {
  const { W, H, filled } = mask;
  const grid = (sp) => {
    const pts = [];
    for (let y = sp / 2; y < H; y += sp * 0.866) {
      const off = (Math.round(y / (sp * 0.866)) % 2) * sp / 2; // 육각 배치: 빈틈 없이 고르게
      for (let x = sp / 2 + off; x < W; x += sp) if (filled(x, y)) pts.push([x, y]);
    }
    return pts;
  };
  let lo = 1, hi = 60;   // 점 개수가 조각 수 이상이 되는 가장 큰 간격
  for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (grid(mid).length >= n) lo = mid; else hi = mid; }
  let pts = grid(lo);
  while (pts.length > n) pts.splice(Math.floor(Math.random() * pts.length), 1);
  while (pts.length < n) pts.push(pts[Math.floor(Math.random() * pts.length)]);
  const out = pts.map(([x, y]) => [x / W - 0.5, -(y / H - 0.5) / WORD_ASPECT, (Math.random() - 0.5) * 0.06]);
  out.spacing = lo / W; // 점 간격 (글자 폭 1 기준)
  return out;
}

/* 긴 삼각형 쪼개기: 압출 단면의 삼각분할은 도형을 가로지르는 가늘고 긴 삼각형이 많아
 * 그대로 묶으면 조각이 가시처럼 길어짐 → 가장 긴 변이 maxLen 이하가 될 때까지 반으로 나눔 */
function tessellate(geo, maxLen) {
  const names = Object.keys(geo.attributes);
  const src = names.map((n) => geo.attributes[n]);
  const out = names.map(() => []);
  const P = geo.attributes.position;
  const vert = (i) => src.map((a) => Array.from({ length: a.itemSize }, (_, k) => a.array[i * a.itemSize + k]));
  const mid = (a, b) => a.map((arr, j) => arr.map((v, k) => (v + b[j][k]) / 2));
  const len = (a, b) => Math.hypot(a[0][0] - b[0][0], a[0][1] - b[0][1]); // 앞면 기준 길이 (옆면을 깊이 방향으로 쪼개지 않게)
  const stack = [];
  for (let t = 0; t < P.count / 3; t++) stack.push([vert(t * 3), vert(t * 3 + 1), vert(t * 3 + 2)]);
  while (stack.length) {
    const [a, b, c] = stack.pop();
    const ab = len(a, b), bc = len(b, c), ca = len(c, a), m = Math.max(ab, bc, ca);
    if (m <= maxLen) { [a, b, c].forEach((v) => v.forEach((arr, j) => out[j].push(...arr))); continue; }
    if (m === ab) { const d = mid(a, b); stack.push([a, d, c], [d, b, c]); }
    else if (m === bc) { const d = mid(b, c); stack.push([a, b, d], [a, d, c]); }
    else { const d = mid(c, a); stack.push([a, b, d], [d, b, c]); }
  }
  const g = new THREE.BufferGeometry();
  names.forEach((n, j) => g.setAttribute(n, new THREE.Float32BufferAttribute(out[j], src[j].itemSize)));
  return g;
}

/* ---------- 조각난 로고 지오메트리 ---------- */
function buildShardGeometry({ shapes, scale, cx, cy }, { depth = 0.34, cell = 0.22, mask = null }) {
  // SVG 좌표 그대로 입체화한 뒤 한 번에 정규화 (깊이·베벨은 SVG 단위로 환산)
  const k = 1 / scale;
  let geo = new THREE.ExtrudeGeometry(shapes, {
    depth: depth * k, curveSegments: 8, bevelEnabled: true, bevelThickness: 0.09 * k, bevelSize: 0.035 * k, bevelSegments: 3,
  }); // ExtrudeGeometry는 이미 non-indexed
  geo.translate(-cx, -cy, 0);
  geo.scale(scale, scale, scale);
  geo.rotateX(Math.PI); // SVG y축(아래로 증가)을 위로 — 뒤집기(scale -1) 대신 회전이라 면 방향이 유지됨
  geo.computeBoundingBox();
  const c = new THREE.Vector3(); geo.boundingBox.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z);
  geo = tessellate(geo, cell * 0.55);

  const pos = geo.attributes.position;
  const triCount = pos.count / 3;
  const clusters = new Map(); // 격자 셀 → 삼각형 목록 (같은 셀의 앞·뒤·옆면이 한 조각으로 움직임)
  const v = new THREE.Vector3();
  for (let t = 0; t < triCount; t++) {
    v.set(0, 0, 0);
    for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(pos, t * 3 + k));
    v.divideScalar(3);
    const key = `${Math.floor(v.x / cell)},${Math.floor(v.y / cell)}`;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(t);
  }
  const center = new Float32Array(pos.count * 3);
  const dir = new Float32Array(pos.count * 3);
  const rand = new Float32Array(pos.count * 4);
  const target = new Float32Array(pos.count * 3);
  const tmp = new THREE.Vector3();
  // 조각 ↔ 글자 자리 짝짓기: 둘 다 x로 정렬해 세로 띠로 나눈 뒤, 띠 안에서 y로 정렬 (왼쪽 조각은 A로, 오른쪽은 G로)
  const list = [...clusters.values()].map((tris) => {
    const cc = new THREE.Vector3();
    tris.forEach((t) => { for (let k = 0; k < 3; k++) cc.add(tmp.fromBufferAttribute(pos, t * 3 + k)); });
    return { tris, cc: cc.divideScalar(tris.length * 3) };
  });
  if (mask) {
    const tg = wordTargets(mask, list.length);
    geo.userData.spacing = tg.spacing; geo.userData.cell = cell;
    const band = 6;
    const byX = (arr, f) => arr.slice().sort((p, q) => f(p)[0] - f(q)[0]);
    const sl = byX(list, (o) => [o.cc.x]), tl = byX(tg, (t) => t);
    for (let i = 0; i < sl.length; i += band) {
      const ss = sl.slice(i, i + band).sort((p, q) => q.cc.y - p.cc.y);
      const ts = tl.slice(i, i + band).sort((p, q) => q[1] - p[1]);
      ss.forEach((o, j) => { o.tg = ts[j]; });
    }
  }
  list.forEach(({ tris, tg = [0, 0, 0] }) => {
    const cc = new THREE.Vector3();
    tris.forEach((t) => { for (let k = 0; k < 3; k++) cc.add(tmp.fromBufferAttribute(pos, t * 3 + k)); });
    cc.divideScalar(tris.length * 3);
    const d = new THREE.Vector3(cc.x, cc.y, (Math.random() - 0.3) * 1.6).normalize();
    d.x += (Math.random() - 0.5) * 0.6; d.y += (Math.random() - 0.5) * 0.6; d.normalize();
    const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    const speed = 0.6 + Math.random() * 0.8;
    tris.forEach((t) => {
      for (let k = 0; k < 3; k++) {
        const i = t * 3 + k;
        target.set(tg, i * 3);
        center.set([cc.x, cc.y, cc.z], i * 3);
        dir.set([d.x, d.y, d.z], i * 3);
        rand.set([axis.x, axis.y, axis.z, speed], i * 4);
      }
    });
  });
  geo.setAttribute('aCenter', new THREE.BufferAttribute(center, 3));
  geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
  geo.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
  geo.computeBoundingSphere();
  return geo;
}

function shatterMaterial(params, uniforms) {
  const mat = new THREE.MeshPhysicalMaterial(params);
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aCenter; attribute vec3 aDir; attribute vec4 aRand; attribute vec3 aTarget;
        uniform float uBeat; uniform float uTime; uniform vec3 uHover; uniform float uHoverAmt; uniform float uHoverR;
        uniform mat3 uRot; uniform mat3 uInvRot; uniform vec4 uRotQ; uniform float uWordW; uniform float uFit;
        mat3 rotAxis(vec3 a, float r) { a = normalize(a); float s = sin(r), c = cos(r), o = 1.0 - c;
          return mat3(o*a.x*a.x + c, o*a.x*a.y + a.z*s, o*a.z*a.x - a.y*s,
                      o*a.x*a.y - a.z*s, o*a.y*a.y + c, o*a.y*a.z + a.x*s,
                      o*a.z*a.x + a.y*s, o*a.y*a.z - a.x*s, o*a.z*a.z + c); }
        mat3 quatMat(vec4 q) { float x = q.x, y = q.y, z = q.z, w = q.w;
          return mat3(1.0 - 2.0*(y*y + z*z), 2.0*(x*y + z*w), 2.0*(x*z - y*w),
                      2.0*(x*y - z*w), 1.0 - 2.0*(x*x + z*z), 2.0*(y*z + x*w),
                      2.0*(x*z + y*w), 2.0*(y*z - x*w), 1.0 - 2.0*(x*x + y*y)); }`)
      .replace('#include <beginnormal_vertex>', `
        // 모든 이동은 '화면 기준 공간'(오브제 회전을 뺀 공간)에서 계산 → 글자 배치가 항상 정면을 봄
        // 1) 깨짐 진행도 m: 조각마다 출발이 조금씩 늦음 → 와르르 무너지는 묵직한 느낌
        float delay = fract(aRand.w * 7.31) * 0.35;
        float m = clamp((uHoverAmt - delay) / 0.65, 0.0, 1.0);
        m = m * m * (3.0 - 2.0 * m);
        float arc = sin(m * 3.14159);                                     // 날아가는 도중에만 커지는 값
        // 2) 자리: 오브제 위 → AOMG 글자 안 (가는 도중 앞으로 크게 튀어나옴)
        vec3 c0 = uRot * aCenter;
        vec3 tgt = vec3(aTarget.xy * uWordW, aTarget.z * uWordW);
        vec3 c = mix(c0, tgt, m) + vec3(aDir.xy * 0.35, 0.9 + aDir.z * 0.6) * arc;
        // 3) 커서 주변은 조금 더 밀려남 (흰 원 범위)
        float hd = distance(c.xy, uHover.xy);
        float hov = (1.0 - smoothstep(uHoverR * 0.25, uHoverR, hd)) * uHoverAmt;
        c += normalize(vec3(c.xy - uHover.xy, 0.0) + vec3(0.0, 0.0, 0.7)) * hov * 0.4;
        // 4) 방향: 출발할 땐 오브제 방향 그대로, 도착하면 정면. 가는 도중에만 크게 한 번 구름 (잘게 돌지 않음)
        vec4 q = normalize(mix(uRotQ, vec4(0.0, 0.0, 0.0, 1.0), m));
        float jitter = uBeat * 0.04 * aRand.w;
        mat3 shardR = quatMat(q) * rotAxis(aRand.xyz, arc * 1.1 + hov * 0.35 + jitter);
        float fit = mix(1.0, uFit, m);   // 도착하면 글자 획 굵기에 맞게 조각 크기를 줄임 (두께는 절반까지만 → 옆면이 글자 윤곽을 흐리지 않게)
        vec3 objectNormal = uInvRot * (shardR * vec3(normal));
        #ifdef USE_TANGENT
          vec3 objectTangent = uInvRot * (shardR * vec3(tangent.xyz));
        #endif`)
      .replace('#include <begin_vertex>', `
        vec3 transformed = uInvRot * (shardR * ((position - aCenter) * vec3(fit, fit, mix(1.0, 0.5, m))) + c);`);
  };
  return mat;
}

/* ---------- 문장 텍스트 평면 (히어로) ---------- */
function drawStatementTexture(canvas, lines, w, h, bg, fg, area) {
  const ctx = canvas.getContext('2d');
  canvas.width = w; canvas.height = h;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const TRACK = -0.045; // 자간 (em). KODE처럼 촘촘하게
  const family = css('--font-display-en') || 'serif';
  // KODE: 3줄이 화면 높이 대부분을 채움. 가장 긴 줄이 폭의 92%를 넘지 않게
  const top0 = area ? area.top : 0, availH = area ? area.bottom - area.top : h;
  let size = availH / (lines.length * 0.9);
  ctx.font = `400 ${size}px ${family}`;
  const lineWidth = (l, sz) => [...l].reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) + TRACK * sz * (l.length - 1);
  const widest = Math.max(...lines.map((l) => lineWidth(l, size)));
  if (widest > w * 0.92) size *= (w * 0.92) / widest;
  ctx.font = `400 ${size}px ${family}`;
  const lh = size * 0.9; // display-0 line-height 0.9
  const top = top0 + availH / 2 - (lh * (lines.length - 1)) / 2;
  lines.forEach((l, i) => {
    let x = w / 2 - lineWidth(l, size) / 2;
    [...l].forEach((ch) => { ctx.fillText(ch, x, top + i * lh); x += ctx.measureText(ch).width + TRACK * size; });
  });
}

/* ---------- 장면 ---------- */
export async function createLogoScene(canvas, opts = {}) {
  const {
    mode = 'hero',            // 'hero' | 'footer'
    statement = null,         // ['INTERACT', 'WITH THE', 'BEAT']
    interactive = true,
    textArea = null,          // () => ({ top, bottom }) 캔버스 기준 px. 문장·로고를 이 영역 안에 배치
    onRing = null,            // ({ x, y, r, visible }) 커서 영역 표시용 (KODE 'HOLD AND DRAG' 원)
  } = opts;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: mode !== 'hero', powerPreference: 'high-performance' });
  } catch (e) { document.documentElement.classList.add('no-webgl'); return null; }
  const dpr = Math.min(window.devicePixelRatio || 1, finePointer ? 2 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  const [svg, mask] = await Promise.all([loadShapes(), loadWordMask().catch(() => null)]);
  const accent = new THREE.Color(css('--color-accent') || '#FF3B1F');
  const uniforms = { uBeat: { value: 0 }, uTime: { value: 0 }, uHover: { value: new THREE.Vector3(99, 99, 0) }, uHoverAmt: { value: 0 }, uHoverR: { value: 0.75 },
    uRot: { value: new THREE.Matrix3() }, uInvRot: { value: new THREE.Matrix3() }, uRotQ: { value: new THREE.Vector4(0, 0, 0, 1) }, uWordW: { value: 5 }, uFit: { value: 1 } };
  const useTransmission = mode === 'hero' && finePointer; // 모바일은 성능 때문에 굴절 끔
  const material = shatterMaterial(mode === 'hero' ? {
    // 둔탁한 질감: 얇은 유리처럼 반짝이지 않게 투과·광택을 낮추고 두껍게
    // 배경과 같은 빨강이면 글자가 안 읽혀서 한 톤 어둡게
    color: accent.clone().multiplyScalar(0.5), metalness: 0.0, roughness: 0.38, clearcoat: 0.3, clearcoatRoughness: 0.4,
    transmission: useTransmission ? 0.22 : 0, thickness: 1.6, ior: 1.4, attenuationColor: accent, attenuationDistance: 0.6,
    envMapIntensity: 1.0, side: THREE.DoubleSide,
  } : {
    color: 0x8a8a8a, metalness: 1, roughness: 0.3, envMapIntensity: 0.45, // 푸터: 글자 뒤 배경으로 물러나도록 어두운 크롬
  }, uniforms);

  const logo = new THREE.Mesh(buildShardGeometry(svg, { cell: 0.15, depth: 0.5, mask } /* 두꺼운 덩어리 조각, 글자가 읽힐 만큼의 개수 */), material);
  const pivot = new THREE.Group(); pivot.add(logo); scene.add(pivot);
  // 면마다 밝기 차이가 나도록 위쪽 조명 하나 (덩어리 느낌, 글자 윤곽)
  if (mode === 'hero') { const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-3, 5, 6); scene.add(key); }

  // 문장 평면 (히어로만): 같은 장면에 있어야 유리 굴절에 비침
  let plane = null, veil = null, textCanvas = null;
  if (mode === 'hero' && statement) {
    textCanvas = document.createElement('canvas');
    const tex = new THREE.CanvasTexture(textCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    // 조각이 AOMG로 모이는 동안 뒤 문장을 배경색 막으로 흐리게 → 글자 배치가 읽힘
    veil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(css('--color-bg-accent') || '#FF3B1F'), transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
    plane.add(veil); veil.position.z = 0.01;
    plane.position.z = -2.5;
    scene.add(plane);
  }

  function fit() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // 로고가 화면 폭의 약 46% (모바일 78%)를 차지하도록
    const dist = camera.position.z;
    const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    const viewW = viewH * camera.aspect;
    logo.geometry.computeBoundingBox();
    const bb = logo.geometry.boundingBox;
    const logoW = bb.max.x - bb.min.x, logoH = bb.max.y - bb.min.y;
    const target = (mode === 'hero' ? (w < 768 ? 0.78 : 0.46) : (w < 768 ? 0.7 : 0.4)) * viewW;
    const maxH = (textArea ? (textArea().bottom - textArea().top) / h : 0.6) * viewH * 0.8; // 문장 영역 높이의 80% 이내
    const s = Math.min(target / logoW, maxH / logoH);
    pivot.scale.setScalar(s);
    // 흩어졌을 때 AOMG 글자 폭: 화면 폭의 76% (모바일 92%), 문장 영역 높이 안
    const wordW = Math.min((w < 768 ? 0.94 : 0.86) * viewW, ((textArea ? (textArea().bottom - textArea().top) / h : 0.6) * viewH) * WORD_ASPECT * 0.95);
    uniforms.uWordW.value = wordW / s;
    const ud = logo.geometry.userData;
    if (ud.spacing) uniforms.uFit.value = Math.min(1, Math.max(0.25, (1.0 * ud.spacing * uniforms.uWordW.value) / ud.cell));
    // 로고를 문장 영역의 세로 중앙에
    baseY = 0;
    if (textArea) { const a = textArea(); baseY = -(((a.top + a.bottom) / 2) / h - 0.5) * viewH; }
    if (plane) {
      const pd = dist - plane.position.z;
      const ph = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * pd;
      plane.scale.set(ph * camera.aspect, ph, 1);
      const pw = Math.round(w * dpr), phx = Math.round(h * dpr);
      const a = textArea ? textArea() : null;
      drawStatementTexture(textCanvas, statement, pw, phx, css('--color-bg-accent'), css('--color-text-on-accent'), a && { top: a.top * dpr, bottom: a.bottom * dpr });
      plane.material.map.needsUpdate = true;
    }
  }

  /* ---------- 조작 ---------- */
  const rot = { x: 0.15, y: -0.35, vx: 0, vy: 0 };
  let baseY = 0;
  const pointer = { x: 0, y: 0 };
  let dragging = false, down = false, startX = 0, startY = 0, lastX = 0, lastY = 0;
  // 커서 위치 → 오브제 로컬 좌표의 중앙 평면(z=0)과의 교점 = 깨질 지점
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hoverPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  const hoverTarget = new THREE.Vector3(99, 99, 0);
  let hoverOn = 0, lastPX = 0, lastPY = 0;
  function updateHover(e) {
    if (reduceMotion) return;
    const r = canvas.getBoundingClientRect();
    lastPX = e.clientX - r.left; lastPY = e.clientY - r.top;
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    // 오브제 중심을 지나는 화면 평행 평면과의 교점 → 오브제 크기 단위 (셰이더의 '화면 기준 공간'과 같음)
    hoverPlane.set(new THREE.Vector3(0, 0, 1), -pivot.position.z);
    if (!raycaster.ray.intersectPlane(hoverPlane, hit)) { hoverOn = 0; return; }
    hit.sub(pivot.position).divideScalar(pivot.scale.x); hit.z = 0;
    const W = uniforms.uWordW.value, spreadOut = uniforms.uHoverAmt.value > 0.2;
    // 오브제 위에서 시작, 흩어진 뒤에는 글자 영역 전체에서 유지
    if (Math.hypot(hit.x, hit.y) < 1.7 || (spreadOut && Math.abs(hit.x) < W * 0.56 && Math.abs(hit.y) < W * 0.22)) {
      if (hoverOn === 0) uniforms.uHover.value.copy(hit); // 처음 들어올 때는 그 자리에서 시작
      hoverTarget.copy(hit); hoverOn = 1;
    } else hoverOn = 0;
  }
  if (interactive) {
    canvas.addEventListener('pointerdown', (e) => {
      down = true; dragging = false;
      startX = lastX = e.clientX; startY = lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      updateHover(e);
    });
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (e.pointerType === 'mouse' || down) updateHover(e);
      if (!down) return;
      if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) > 6) dragging = true;
      if (dragging) {   // 누르고 드래그 = 회전
        rot.vy = (e.clientX - lastX) * 0.008; rot.vx = (e.clientY - lastY) * 0.006;
        rot.y += rot.vy; rot.x += rot.vx;
      }
      lastX = e.clientX; lastY = e.clientY;
    });
    const end = (e) => { down = false; dragging = false; if (e.pointerType !== 'mouse') hoverOn = 0; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', () => { if (!down) hoverOn = 0; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // 길게 누르기 메뉴 방지
  }

  /* ---------- 루프 ---------- */
  let visible = true, raf = 0, last = performance.now();
  const _m4 = new THREE.Matrix4();
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }, { threshold: 0 });
  io.observe(canvas);
  function loop(now) {
    raf = 0;
    const dt = Math.min(0.25, (now - last) / 1000); last = now;
    uniforms.uTime.value += dt;
    // 깨질 지점은 커서를 부드럽게 따라가고, 세기는 빠르게 켜지고 천천히 복원
    const ease = (k) => 1 - Math.pow(1 - k, dt * 60); // 60fps 기준 비율 → 프레임 속도와 무관하게 같은 시간
    uniforms.uHover.value.lerp(hoverTarget, ease(0.22));
    const ha = uniforms.uHoverAmt.value;
    // 묵직하게: 깨질 때 약 0.7초, 다시 모일 때 약 1.2초
    uniforms.uHoverAmt.value += (hoverOn - ha) * ease(hoverOn > ha ? 0.07 : 0.04);
    const beat = parseFloat(css('--beat')) || 0;
    uniforms.uBeat.value += (beat - uniforms.uBeat.value) * 0.3;

    if (!dragging) {
      rot.vx *= 0.94; rot.vy *= 0.94;
      rot.x += rot.vx; rot.y += rot.vy;
      if (!reduceMotion) rot.y += dt * (mode === 'hero' ? 0.12 : 0.25); // 천천히 자동 회전
      rot.x += ((pointer.y * 0.25 + 0.1) - rot.x) * 0.02;              // 포인터 방향으로 살짝 기울기
    }
    pivot.rotation.set(rot.x, rot.y, Math.sin(uniforms.uTime.value * 0.5) * 0.04);
    pivot.position.y = baseY + (reduceMotion ? 0 : Math.sin(uniforms.uTime.value * 0.8) * 0.05);
    // 셰이더용 회전값 (흩어진 조각을 화면 정면 기준으로 배치)
    const q = pivot.quaternion; if (q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w);
    uniforms.uRotQ.value.set(q.x, q.y, q.z, q.w);
    _m4.makeRotationFromQuaternion(q); uniforms.uRot.value.setFromMatrix4(_m4);
    uniforms.uInvRot.value.copy(uniforms.uRot.value).transpose();
    if (onRing) {
      // 깨지는 반경(uHoverR, 오브제 로컬 단위) → 화면 px
      const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      const rpx = (uniforms.uHoverR.value * pivot.scale.x / viewH) * canvas.clientHeight;
      onRing({ x: lastPX, y: lastPY, r: rpx, visible: hoverOn === 1 && finePointer && !reduceMotion });
    }
    // 인트로가 화면을 덮고 있는 동안은 그리지 않음 (보이지 않는 프레임에 GPU를 쓰지 않게)
    if (veil) veil.material.opacity = 0.72 * Math.min(1, uniforms.uHoverAmt.value * 1.2);
    if (!document.documentElement.classList.contains('is-intro')) renderer.render(scene, camera);
    if (visible && !(reduceMotion && !down)) raf = requestAnimationFrame(loop);
  }

  const ro = new ResizeObserver(() => { fit(); if (!raf) raf = requestAnimationFrame(loop); });
  ro.observe(canvas);
  if (document.fonts) await document.fonts.ready;
  fit();
  raf = requestAnimationFrame(loop);
  canvas.classList.add('is-ready');
  return { renderer, uniforms };
}
