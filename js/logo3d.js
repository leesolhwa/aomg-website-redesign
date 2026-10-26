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

// 고정 시드 난수: 깨지는 모양·흩어지는 배치가 매번 같게 (확인한 배치 그대로 보이도록)
let rnd = null;
const seedRandom = (seed) => { let t = seed >>> 0; rnd = () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };
seedRandom(5);

/* ---------- AOMG 배치 (흩어진 조각이 놓일 자리) ----------
 * 글자 모양을 그대로 만들지 않는다. 큰 조각 약 20개가 A·O·M·G 네 덩어리로 느슨하게 흩어져
 * 흐린 눈으로 보면 AOMG 같은 정도. 사용자 제공 글자 SVG(img/logo/*.svg)를 로고 실측 위치(인트로와 같은 값)에 놓고
 * 글자마다 안쪽 점을 뽑아 둔다. 좌표는 로고 폭 1 단위, 가운데 기준 */
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
  const W = 360, H = Math.round(W / WORD_ASPECT);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  return imgs.map((img, i) => {   // 글자별 안쪽 점 (3px 간격)
    const [, x, y, w, h] = LETTERS[i];
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, (x / 100) * W, (y / 100) * H, (w / 100) * W, (h / 100) * H);
    const a = ctx.getImageData(0, 0, W, H).data, pts = [];
    for (let py = 1; py < H; py += 3) for (let px = 1; px < W; px += 3) if (a[(py * W + px) * 4 + 3] > 140) pts.push([px / W - 0.5, -(py / H - 0.5) / WORD_ASPECT]);
    return pts;
  });
}));

// 점 집합에서 서로 가장 멀리 떨어진 n개 (글자 전체에 고르게 퍼짐)
function spreadPick(pts, n) {
  if (!pts.length) return Array.from({ length: n }, () => [0, 0]);
  const out = [pts[Math.floor(rnd() * pts.length)]];
  const d = pts.map((p) => Math.hypot(p[0] - out[0][0], p[1] - out[0][1]));
  while (out.length < n) {
    let bi = 0; d.forEach((v, i) => { if (v > d[bi]) bi = i; });
    out.push(pts[bi]);
    pts.forEach((p, i) => { d[i] = Math.min(d[i], Math.hypot(p[0] - pts[bi][0], p[1] - pts[bi][1])); });
  }
  return out;
}

/* ---------- 조각 윤곽 추적 ----------
 * 지구본을 격자에 그린 뒤 조각별 영역의 경계선을 따라가 닫힌 선(바깥선·구멍)을 만들고 계단을 펴서 단순화.
 * 이 선으로 조각마다 따로 입체화 → 갈라진 면이 깔끔하고 두툼함 */
function traceLoops(mask, W, H) {
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? mask[y * W + x] : 0);
  const ex = [], out = new Map(); // 변 목록 (시계 방향: 채워진 칸이 오른쪽)
  const add = (x0, y0, x1, y1) => { const k = y0 * (W + 1) + x0; (out.get(k) || out.set(k, []).get(k)).push(ex.length); ex.push([x0, y0, x1, y1]); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue;
    if (!at(x, y - 1)) add(x, y, x + 1, y);
    if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!at(x - 1, y)) add(x, y + 1, x, y);
  }
  const used = new Uint8Array(ex.length), loops = [];
  for (let s = 0; s < ex.length; s++) {
    if (used[s]) continue;
    const pts = []; let e = s;
    while (e !== undefined && !used[e]) {
      used[e] = 1; const [x0, y0, x1, y1] = ex[e]; pts.push([x0, y0]);
      const cand = (out.get(y1 * (W + 1) + x1) || []).filter((i) => !used[i]);
      if (cand.length > 1) { // 대각선으로만 닿은 칸: 오른쪽으로 꺾어 영역을 나눔
        const dx = x1 - x0, dy = y1 - y0;
        cand.sort((a, b) => { const ta = (ex[a][2] - ex[a][0]) * dy - (ex[a][3] - ex[a][1]) * dx, tb = (ex[b][2] - ex[b][0]) * dy - (ex[b][3] - ex[b][1]) * dx; return ta - tb; });
      }
      e = cand[0];
    }
    if (pts.length >= 8) loops.push(pts);
  }
  return loops;
}
function simplify(pts, tol) { // 닫힌 선 Ramer–Douglas–Peucker
  const rdp = (a) => {
    if (a.length < 3) return a;
    const [x0, y0] = a[0], [x1, y1] = a[a.length - 1]; const L = Math.hypot(x1 - x0, y1 - y0) || 1;
    let bi = 0, bd = 0;
    for (let i = 1; i < a.length - 1; i++) { const d = Math.abs((a[i][0] - x0) * (y1 - y0) - (a[i][1] - y0) * (x1 - x0)) / L; if (d > bd) { bd = d; bi = i; } }
    return bd > tol ? rdp(a.slice(0, bi + 1)).slice(0, -1).concat(rdp(a.slice(bi))) : [a[0], a[a.length - 1]];
  };
  const h = Math.floor(pts.length / 2);
  return rdp(pts.slice(0, h + 1)).slice(0, -1).concat(rdp(pts.slice(h).concat([pts[0]])).slice(0, -1));
}
const loopArea = (p) => p.reduce((s, [x, y], i) => { const [u, v] = p[(i + 1) % p.length]; return s + x * v - u * y; }, 0) / 2;
const inside = ([x, y], p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };

/* ---------- 조각난 로고 지오메트리 ----------
 * 지구본을 큰 조각 약 20개로 가름. 씨앗점을 고르게 뿌려 가장 가까운 씨앗끼리 묶되(보로노이),
 * 거리에 물결을 더해 갈라진 선이 자연스럽게 구불구불하게 함 */
function buildShardGeometry({ shapes, scale, cx, cy }, { depth = 0.34, pieces = 20, letters = null, seed = 5 }) {
  seedRandom(seed);
  // 1) 지구본을 격자에 그림 (로컬 좌표: 폭 3.2, 가운데 0, y 위쪽)
  const box = new THREE.Box2(); shapes.forEach((sh) => sh.getPoints().forEach((p) => box.expandByPoint(p)));
  const halfW = ((box.max.x - box.min.x) * scale) / 2, halfH = ((box.max.y - box.min.y) * scale) / 2;
  const RES = 300, s = (2 * halfW) / (RES - 8), W = RES, H = Math.ceil((2 * halfH) / s) + 8;
  const x0 = -halfW - 4 * s, y0 = halfH + 4 * s;               // 격자 (0,0) = 로컬 (x0, y0)
  const cnv = document.createElement('canvas'); cnv.width = W; cnv.height = H;
  const ctx = cnv.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(scale / s, 0, 0, scale / s, (-cx * scale - x0) / s, (-cy * scale + y0) / s);
  shapes.forEach((sh) => {
    const { shape, holes } = sh.extractPoints(24);
    ctx.beginPath();
    [shape, ...holes].forEach((pts) => { pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); });
    ctx.fill('evenodd');
  });
  const img = ctx.getImageData(0, 0, W, H).data;
  const filled = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) filled[i] = img[i * 4 + 3] > 127 ? 1 : 0;
  const toLocal = (px, py) => [x0 + px * s, y0 - py * s];

  // 2) 씨앗 → 조각 나누기
  const samples = []; for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (filled[y * W + x]) samples.push(toLocal(x, y));
  let seeds = spreadPick(samples, pieces).map((p) => p.slice());
  const wobble = (x, y) => 0.5 * Math.sin(x * 7.1 + Math.sin(y * 5.3) * 1.7) + 0.3 * Math.sin(y * 9.7 + Math.sin(x * 6.1) * 1.3) + 0.2 * Math.sin((x - y) * 17.3);
  const nearest = (x, y, wob = 0) => { let bi = 0, bd = Infinity; for (let i = 0; i < seeds.length; i++) { const d = Math.hypot(seeds[i][0] - x, seeds[i][1] - y) + wob * wobble(x + i * 3.1, y - i * 1.7); if (d < bd) { bd = d; bi = i; } } return bi; };
  for (let it = 0; it < 3; it++) {
    const acc = seeds.map(() => [0, 0, 0]);
    samples.forEach(([x, y]) => { const i = nearest(x, y); acc[i][0] += x; acc[i][1] += y; acc[i][2]++; });
    seeds = seeds.map((sd, i) => (acc[i][2] ? [acc[i][0] / acc[i][2], acc[i][1] / acc[i][2]] : sd));
  }
  const owner = new Int16Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (filled[y * W + x]) { const [lx, ly] = toLocal(x + 0.5, y + 0.5); owner[y * W + x] = nearest(lx, ly, 0.06); }

  // 3) 조각마다 윤곽 → Shape → 입체화
  const parts = [], info = [];
  const m = new Uint8Array(W * H);
  for (let pi = 0; pi < seeds.length; pi++) {
    let n = 0, sx = 0, sy = 0;
    for (let i = 0; i < W * H; i++) { m[i] = owner[i] === pi ? 1 : 0; if (m[i]) { n++; sx += i % W; sy += Math.floor(i / W); } }
    if (n < 30) continue;
    const loops = traceLoops(m, W, H).map((l) => simplify(l, 0.9)).filter((l) => l.length >= 3 && Math.abs(loopArea(l)) > 8);
    const outers = loops.filter((l) => loopArea(l) > 0), holes = loops.filter((l) => loopArea(l) < 0);
    const toV = (l) => l.map(([px, py]) => new THREE.Vector2(...toLocal(px, py)));
    const shapesP = outers.map((o) => { const sh = new THREE.Shape(toV(o)); holes.filter((h) => inside(h[0], o)).forEach((h) => sh.holes.push(new THREE.Path(toV(h)))); return sh; });
    if (!shapesP.length) continue;
    const g = new THREE.ExtrudeGeometry(shapesP, { depth, curveSegments: 1, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.012, bevelSegments: 1 });
    g.translate(0, 0, -depth / 2);
    const [cxl, cyl] = toLocal(sx / n, sy / n);
    parts.push(g); info.push({ cc: new THREE.Vector3(cxl, cyl, 0), i: info.length });
  }

  // 조각 → AOMG 배치. AOMG 로고의 O는 지구본이므로:
  //  - 테두리 조각은 O 자리로 가서 느슨한 고리(살짝 벌어진 지구본 윤곽)가 되고
  //  - 안쪽 조각은 A·M·G 자리로 흩어져 글자 덩어리를 이룸 (왼쪽 조각부터 A→M→G, 글자 면적 비율로 개수 배분)
  // 글자 모양 자체를 만들지 않고 네 덩어리의 실루엣만 AOMG를 떠올리게 함
  if (letters) {
    const R = Math.max(...info.map((f) => Math.hypot(f.cc.x, f.cc.y)));
    // 테두리 조각: 원을 7칸으로 나눠 칸마다 가장 바깥 조각 하나 → O 고리가 끊기지 않게
    const SECT = Math.round(pieces * 0.35), rim = [];
    for (let k = 0; k < SECT; k++) {
      const inSect = info.filter((f) => !rim.includes(f) && Math.floor(((Math.atan2(f.cc.y, f.cc.x) + Math.PI) / (2 * Math.PI)) * SECT) % SECT === k);
      if (inSect.length) rim.push(inSect.sort((p, q) => Math.hypot(q.cc.x, q.cc.y) - Math.hypot(p.cc.x, p.cc.y))[0]);
    }
    const inner = info.filter((f) => !rim.includes(f));
    const oPts = letters[1];
    const oc = oPts.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]).map((v) => v / oPts.length);
    const oH = Math.max(...oPts.map((p) => p[1])) - Math.min(...oPts.map((p) => p[1]));
    // 원래 각도 그대로 O의 획 위에 놓음 → 테두리 조각의 호가 이어져 O(지구본 윤곽)로 보임
    const rO = (oH / 2) * 0.74;
    rim.forEach((f) => { const th = Math.atan2(f.cc.y, f.cc.x); f.tg = [oc[0] + Math.cos(th) * rO, oc[1] + Math.sin(th) * rO, (rnd() - 0.5) * 0.04]; });
    const L = [0, 2, 3]; // A, M, G
    const area = L.map((li) => letters[li].length), total = area.reduce((s, v) => s + v, 0);
    const counts = area.map((a) => Math.max(2, Math.round((a / total) * inner.length)));
    while (counts.reduce((s, v) => s + v, 0) > inner.length) counts[counts.indexOf(Math.max(...counts))]--;
    while (counts.reduce((s, v) => s + v, 0) < inner.length) counts[counts.indexOf(Math.min(...counts))]++;
    const byX = inner.slice().sort((p, q) => p.cc.x - q.cc.x);
    let at = 0;
    counts.forEach((cnt, gi) => {
      const li = L[gi];
      const group = byX.slice(at, at + cnt).sort((p, q) => q.cc.y - p.cc.y); at += cnt;
      const spots = spreadPick(letters[li], cnt).sort((p, q) => q[1] - p[1]);
      const lc = letters[li].reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]).map((v) => v / letters[li].length);
      const shift = li === 0 ? -0.03 : 0.03; // O와 겹치지 않게 살짝 바깥으로
      group.forEach((f, j) => { const [sx, sy] = spots[j]; f.tg = [sx + (lc[0] - sx) * 0.2 + shift, sy + (lc[1] - sy) * 0.2, (rnd() - 0.5) * 0.1]; });
    });
    info.forEach((f) => { f.rim = rim.includes(f); });
  }
  // 4) 합치기 + 조각별 값
  const nAll = parts.reduce((t, g) => t + g.attributes.position.count, 0);
  const P = new Float32Array(nAll * 3), N = new Float32Array(nAll * 3), UV = new Float32Array(nAll * 2);
  const center = new Float32Array(nAll * 3), dir = new Float32Array(nAll * 3), rand = new Float32Array(nAll * 4), target = new Float32Array(nAll * 3);
  let o = 0;
  parts.forEach((g, k) => {
    const f = info[k], cnt = g.attributes.position.count;
    P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) UV.set(g.attributes.uv.array, o * 2);
    const d = new THREE.Vector3(f.cc.x, f.cc.y, 0.6 + rnd() * 0.8).normalize();
    const axis = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() * 0.4).normalize();
    const r = f.rim ? rnd() * 0.25 : 0.25 + rnd() * 0.75; // 테두리 조각은 덜 기울어 고리가 보이게
    const tg = f.tg || [f.cc.x * 0.4, f.cc.y * 0.4, 0];
    for (let i = o; i < o + cnt; i++) {
      center.set([f.cc.x, f.cc.y, 0], i * 3); dir.set([d.x, d.y, d.z], i * 3);
      rand.set([axis.x, axis.y, axis.z, r], i * 4); target.set(tg, i * 3);
    }
    o += cnt; g.dispose();
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  out.setAttribute('aCenter', new THREE.BufferAttribute(center, 3));
  out.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  out.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
  out.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
  out.computeBoundingBox(); out.computeBoundingSphere();
  return out;
}

function shatterMaterial(params, uniforms) {
  const mat = new THREE.MeshPhysicalMaterial(params);
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aCenter; attribute vec3 aDir; attribute vec4 aRand; attribute vec3 aTarget;
        uniform float uBeat; uniform float uTime; uniform vec3 uHover; uniform float uHoverAmt; uniform float uHoverR;
        uniform mat3 uRot; uniform mat3 uInvRot; uniform vec4 uRotQ; uniform float uWordW;
        mat3 rotAxis(vec3 a, float r) { a = normalize(a); float s = sin(r), c = cos(r), o = 1.0 - c;
          return mat3(o*a.x*a.x + c, o*a.x*a.y + a.z*s, o*a.z*a.x - a.y*s,
                      o*a.x*a.y - a.z*s, o*a.y*a.y + c, o*a.y*a.z + a.x*s,
                      o*a.z*a.x + a.y*s, o*a.y*a.z - a.x*s, o*a.z*a.z + c); }
        mat3 quatMat(vec4 q) { float x = q.x, y = q.y, z = q.z, w = q.w;
          return mat3(1.0 - 2.0*(y*y + z*z), 2.0*(x*y + z*w), 2.0*(x*z - y*w),
                      2.0*(x*y - z*w), 1.0 - 2.0*(x*x + z*z), 2.0*(y*z + x*w),
                      2.0*(x*z + y*w), 2.0*(y*z - x*w), 1.0 - 2.0*(x*x + y*y)); }`)
      .replace('#include <beginnormal_vertex>', `
        // 모든 이동은 '화면 기준 공간'(오브제 회전을 뺀 공간)에서 계산 → 흩어진 배치가 항상 정면을 봄
        // 0) 먼저 금이 가며 살짝 벌어지고
        float crack = smoothstep(0.0, 0.18, uHoverAmt);
        // 1) 조각마다 조금씩 늦게, 천천히 떨어져 나감 (uHoverAmt는 약 2.6초에 걸쳐 0→1)
        float delay = aRand.w * 0.32;
        float m = clamp((uHoverAmt - 0.12 - delay) / 0.56, 0.0, 1.0);
        m = m * m * m * (m * (m * 6.0 - 15.0) + 10.0);                  // 부드럽게 출발·도착
        float arc = sin(m * 3.14159);
        // 2) 자리: 지구본 → A·O·M·G 네 덩어리로 느슨하게 (가는 도중 살짝 앞으로)
        vec3 c0 = uRot * aCenter;
        vec3 tgt = vec3(aTarget.xy * uWordW, aTarget.z * uWordW);
        vec3 c = mix(c0, tgt, m) + vec3(aDir.xy * 0.25, 0.45 + aDir.z * 0.35) * arc;
        c += uRot * vec3(normalize(aCenter.xy + 1e-4) * 0.07 * crack * (1.0 - m), 0.0);
        // 3) 커서 주변은 조금 더 밀려남 (흰 원 범위)
        float hd = distance(c.xy, uHover.xy);
        float hov = (1.0 - smoothstep(uHoverR * 0.25, uHoverR, hd)) * m;
        c += normalize(vec3(c.xy - uHover.xy, 0.0) + vec3(0.0, 0.0, 0.8)) * hov * 0.15;
        // 4) 방향: 오브제 방향에서 대체로 정면 쪽으로, 조각마다 기울기가 남아 '대놓고' 정렬되지 않게
        vec4 q = normalize(mix(uRotQ, vec4(0.0, 0.0, 0.0, 1.0), m * 0.9));
        float jitter = uBeat * 0.03 * aRand.w;
        mat3 shardR = quatMat(q) * rotAxis(aRand.xyz, arc * 0.9 + m * (0.12 + 0.22 * aRand.w) + hov * 0.3 + jitter);
        vec3 objectNormal = uInvRot * (shardR * vec3(normal));
        #ifdef USE_TANGENT
          vec3 objectTangent = uInvRot * (shardR * vec3(tangent.xyz));
        #endif`)
      .replace('#include <begin_vertex>', `
        vec3 transformed = uInvRot * (shardR * ((position - aCenter) * mix(1.0, 0.8, m)) + c); // 도착하면 조금 작아져 글자 덩어리 사이가 벌어짐`);
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

  const [svg, letters] = await Promise.all([loadShapes(), loadWordMask().catch(() => null)]);
  const accent = new THREE.Color(css('--color-accent') || '#FF3B1F');
  const uniforms = { uBeat: { value: 0 }, uTime: { value: 0 }, uHover: { value: new THREE.Vector3(99, 99, 0) }, uHoverAmt: { value: 0 }, uHoverR: { value: 0.75 },
    uRot: { value: new THREE.Matrix3() }, uInvRot: { value: new THREE.Matrix3() }, uRotQ: { value: new THREE.Vector4(0, 0, 0, 1) }, uWordW: { value: 5 } };
  const useTransmission = mode === 'hero' && finePointer; // 모바일은 성능 때문에 굴절 끔
  const material = shatterMaterial(mode === 'hero' ? {
    // 둔탁한 질감: 얇은 유리처럼 반짝이지 않게 투과·광택을 낮추고 두껍게
    // 배경과 같은 빨강이면 글자가 안 읽혀서 한 톤 어둡게
    color: accent.clone().multiplyScalar(0.5), metalness: 0.0, roughness: 0.45, clearcoat: 0.12, clearcoatRoughness: 0.5,
    transmission: useTransmission ? 0.22 : 0, thickness: 1.6, ior: 1.4, attenuationColor: accent, attenuationDistance: 0.6,
    envMapIntensity: 1.0, side: THREE.DoubleSide,
  } : {
    color: 0x8a8a8a, metalness: 1, roughness: 0.3, envMapIntensity: 0.45, // 푸터: 글자 뒤 배경으로 물러나도록 어두운 크롬
  }, uniforms);

  const logo = new THREE.Mesh(buildShardGeometry(svg, { depth: 0.5, pieces: 20, letters } /* 큰 덩어리 약 20개 */), material);
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
    const wordW = Math.min((w < 768 ? 0.96 : 0.9) * viewW, ((textArea ? (textArea().bottom - textArea().top) / h : 0.6) * viewH) * WORD_ASPECT * 0.95);
    uniforms.uWordW.value = wordW / s;
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
    // 천천히: 깨질 때 약 2.6초, 다시 모일 때 약 2초 (일정한 속도, 조각별 완급은 셰이더에서)
    uniforms.uHoverAmt.value = hoverOn > ha ? Math.min(1, ha + dt / 2.6) : Math.max(0, ha - dt / 2.0);
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
    if (veil) veil.material.opacity = 0.3 * uniforms.uHoverAmt.value; // 뒤 문장은 살짝만 흐리게
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
export { buildShardGeometry, loadShapes, loadWordMask }; // 배치 확인용
