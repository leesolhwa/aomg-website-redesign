/* AOMG Concept Redesign — sound3d.js (ES module)
 * FROM IDENTITY TO SOUND: 히어로 지구본 → 유리 파편 → 매끄럽게 흐르는 파편의 물결 → CD 5장 → 스크롤로 CD 넘기기
 * - 모든 형태는 스크롤 진행도 p(0~1)의 함수 → 위로 스크롤하면 그대로 되돌아감
 * - p는 섹션 고정(sticky) + 스크롤 위치로 계산하고 부드럽게 따라감 (Pinning + Scrub)
 * - 단계: 01 Hero 0–8% · 02 파편 8–18% · 03 흐름 18–32% · 04 CD로 모임 32–46% · 05 원판 46–58%
 *         06 CD 5장 58–60% · 07 스크롤로 CD 넘기기 60–96% · 08 다음 섹션
 * - 파편 하나하나의 위치·회전·크기를 셰이더에서 p로 계산 (지구본 → 흐름 → CD 자리)
 */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

// logo3d.js는 푸터가 같은 버전(?v=)으로 불러오므로 같은 주소로 받아 한 번만 로드되게 함
const L3 = await import(new URL('./logo3d.js' + new URL(import.meta.url).search, import.meta.url).href);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mixc = (c1, c2, t) => c1.clone().lerp(c2, t);

const CAM_Z = 8, FOV = 30;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const CELL = 0.3;               // 파편 크기 (로고 로컬 단위)
const P_CD = 0.6, P_END = 0.96; // CD 넘기기 구간

/* ---------- CD 텍스처 ----------
 * 공식 커버가 있으면 그대로, 없으면 아티스트 사진(흑백) 위에 앨범명을 얹은 CD 라벨을 만듦 */
function loadImage(src) {
  return new Promise((res) => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}
async function makeCdTexture(rel, artist) {
  const N = 1024, cnv = document.createElement('canvas'); cnv.width = cnv.height = N;
  const g = cnv.getContext('2d');
  const cover = await loadImage(rel.cover);
  const photo = cover ? null : await loadImage(artist && artist.image);
  const draw = (im, filter) => {
    const s = Math.max(N / im.width, N / im.height);
    g.filter = filter || 'none';
    g.drawImage(im, (N - im.width * s) / 2, (N - im.height * s) / 2, im.width * s, im.height * s);
    g.filter = 'none';
  };
  g.fillStyle = '#141414'; g.fillRect(0, 0, N, N);
  if (cover) draw(cover);
  else {
    if (photo) draw(photo, 'grayscale(1) contrast(1.08) brightness(0.72)');
    const serif = css('--font-display-en') || 'serif', sans = css('--font-sans-en') || 'sans-serif';
    g.fillStyle = '#f2f2f2'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    let fs = 150; g.font = `400 ${fs}px ${serif}`;
    while (g.measureText(rel.title).width > N * 0.62 && fs > 60) { fs -= 6; g.font = `400 ${fs}px ${serif}`; }
    g.fillText(rel.title, N / 2, N * 0.8);
    g.font = `500 30px ${sans}`;
    g.fillText(`${rel.artist}  ·  ${rel.type}  ·  ${rel.year}`, N / 2, N * 0.87);
    g.font = `400 34px ${serif}`; g.fillText('AOMG', N / 2, N * 0.18);
  }
  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

/* 원판이 테두리에서 안쪽으로 차오르며 생기게: rN(0~1) < 1 - uForm 인 부분은 아직 없음 */
function revealMaterial(mat, uForm) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uForm = uForm;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vRN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRN = length(position.xy);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vRN; uniform float uForm;')
      .replace('void main() {', 'void main() {\n  if (vRN < 1.0 - uForm * 1.04) discard;');
  };
  return mat;
}

function cdBodyGeometry(hole, thick) {
  const e = thick * 0.45, pts = [
    new THREE.Vector2(hole, -thick / 2), new THREE.Vector2(1 - e, -thick / 2), new THREE.Vector2(1, -thick / 2 + e),
    new THREE.Vector2(1, thick / 2 - e), new THREE.Vector2(1 - e, thick / 2), new THREE.Vector2(hole, thick / 2), new THREE.Vector2(hole, -thick / 2),
  ];
  const g = new THREE.LatheGeometry(pts, 128);
  g.rotateX(Math.PI / 2); // 회전축 y → z (원판 정면이 +z)
  return g;
}

const HUB_N = 0.3; // 투명 허브 바깥 반지름 (CD 반지름 1 기준)

/* 긴 삼각형 쪼개기: 압출 단면은 도형을 가로지르는 가늘고 긴 삼각형이 많아 그대로 묶으면 파편이 가시처럼 됨
 * → 가장 긴 변이 maxLen 이하가 될 때까지 반으로 나눈 뒤 묶어서 덩어리 파편으로 */
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

/* 지구본 파편 지오메트리: 격자 셀마다 한 파편 (앞·뒤·옆면이 함께 움직임) */
function buildShards({ shapes, scale, cx, cy }, cell) {
  const k = 1 / scale;
  let geo = new THREE.ExtrudeGeometry(shapes, { depth: 0.34 * k, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.06 * k, bevelSize: 0.03 * k, bevelSegments: 3 });
  geo.translate(-cx, -cy, 0); geo.scale(scale, scale, scale); geo.rotateX(Math.PI);
  geo.computeBoundingBox();
  const c = new THREE.Vector3(); geo.boundingBox.getCenter(c); geo.translate(-c.x, -c.y, -c.z);
  geo = tessellate(geo, cell * 0.45);
  const pos = geo.attributes.position, triCount = pos.count / 3;
  const clusters = new Map(), v = new THREE.Vector3(), tmp = new THREE.Vector3();
  let sd = 3; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let t = 0; t < triCount; t++) {
    v.set(0, 0, 0); for (let j = 0; j < 3; j++) v.add(tmp.fromBufferAttribute(pos, t * 3 + j)); v.divideScalar(3);
    // 셀 경계를 조금 비틀어 파편 모양이 바둑판처럼 반듯하지 않게
    const jx = Math.sin(v.y * 9.1) * cell * 0.22, jy = Math.sin(v.x * 7.7) * cell * 0.22;
    const key = Math.floor((v.x + jx) / cell) + ',' + Math.floor((v.y + jy) / cell);
    (clusters.get(key) || clusters.set(key, []).get(key)).push(t);
  }
  const center = new Float32Array(pos.count * 3), dir = new Float32Array(pos.count * 3), rand = new Float32Array(pos.count * 4);
  clusters.forEach((tris) => {
    const cc = new THREE.Vector3();
    tris.forEach((t) => { for (let j = 0; j < 3; j++) cc.add(tmp.fromBufferAttribute(pos, t * 3 + j)); });
    cc.divideScalar(tris.length * 3);
    const d = new THREE.Vector3(cc.x, cc.y, (rnd() - 0.3) * 1.6).normalize();
    const axis = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), speed = 0.6 + rnd() * 0.8;
    tris.forEach((t) => { for (let j = 0; j < 3; j++) { const i = t * 3 + j; center.set([cc.x, cc.y, cc.z], i * 3); dir.set([d.x, d.y, d.z], i * 3); rand.set([axis.x, axis.y, axis.z, speed], i * 4); } });
  });
  geo.setAttribute('aCenter', new THREE.BufferAttribute(center, 3));
  geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
  geo.computeBoundingSphere();
  return geo;
}

/* ---------- 파편 경로 (메시·잔상 셰이더가 함께 씀) ----------
 * A 지구본(+마우스 깨짐) → B 금이 가며 벌어짐 → C 화면을 가로지르는 매끄러운 흐름(비틀리는 띠 모양으로 흩어짐)
 * → D 보이는 CD 5장 각자의 자리로 날아가 원판 모양으로 깔림 → 원판이 차오르면 작아지며 사라짐 */
const SHARD_GLSL = /* glsl */`
  uniform float uP; uniform float uTime; uniform mat4 uGlobeM; uniform float uS;
  uniform vec3 uHover; uniform float uHoverAmt; uniform float uHoverR;
  uniform mat4 uCdM[5]; uniform float uCdR[5]; uniform float uCdForm[5]; uniform float uHH; uniform float uAspect;
  attribute vec3 aCenter; attribute vec3 aDir; attribute vec4 aRand; attribute vec4 aSlot; attribute vec4 aFlow;
  float sm(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
  mat3 rotAxis(vec3 a, float r) { a = normalize(a); float s = sin(r), c = cos(r), o = 1.0 - c;
    return mat3(o*a.x*a.x + c, o*a.x*a.y + a.z*s, o*a.z*a.x - a.y*s, o*a.x*a.y - a.z*s, o*a.y*a.y + c, o*a.y*a.z + a.x*s,
                o*a.z*a.x + a.y*s, o*a.y*a.z - a.x*s, o*a.z*a.z + c); }
  mat3 mixm(mat3 a, mat3 b, float t) { return mat3(mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)); }
  mat3 ortho(mat3 m) { vec3 x = normalize(m[0]); vec3 y = normalize(m[1] - dot(m[1], x) * x); return mat3(x, y, cross(x, y)); }
  vec3 sp(float fx, float fy, float z) { float k = (${CAM_Z.toFixed(1)} - z) / ${CAM_Z.toFixed(1)}; return vec3(fx * uHH * k * uAspect, fy * uHH * k, z); }
  // 흐름 곡선: 왼쪽 위 → 가운데 → 오른쪽 아래 (CD가 놓일 대각선과 가운데서 엇갈림)
  vec3 flowAt(float u, out vec3 T) {
    vec3 a = sp(-1.15, 0.85, -1.8), b = sp(-0.30, 0.95, 0.6), c = sp(0.25, -0.95, 0.6), d = sp(1.15, -0.75, -1.8);
    float v = 1.0 - u;
    T = normalize(3.0 * v * v * (b - a) + 6.0 * v * u * (c - b) + 3.0 * u * u * (d - c));
    return v * v * v * a + 3.0 * v * v * u * b + 3.0 * v * u * u * c + u * u * u * d;
  }
  void cdPick(int k, out mat4 M, out float R, out float F) {
    if (k == 0) { M = uCdM[0]; R = uCdR[0]; F = uCdForm[0]; }
    else if (k == 1) { M = uCdM[1]; R = uCdR[1]; F = uCdForm[1]; }
    else if (k == 2) { M = uCdM[2]; R = uCdR[2]; F = uCdForm[2]; }
    else if (k == 3) { M = uCdM[3]; R = uCdR[3]; F = uCdForm[3]; }
    else { M = uCdM[4]; R = uCdR[4]; F = uCdForm[4]; }
  }
  void shardXf(float p, out vec3 C, out mat3 R, out float scl) {
    // A·B: 지구본 위 (마우스 깨짐 + 스크롤로 금이 가며 벌어짐)
    float hd = distance(aCenter.xy, uHover.xy);
    float g = uHoverAmt * aRand.w;
    float hov = (1.0 - smoothstep(uHoverR * 0.2, uHoverR, hd)) * g;
    float spread = 0.42 * g;
    float tB = sm(0.075 + aFlow.y * 0.04, 0.17 + aFlow.y * 0.03, p);
    mat3 Rl = rotAxis(aRand.xyz, hov * 1.55 + spread * 0.75 + tB * (0.8 + aRand.w * 0.7));
    vec3 away = normalize(vec3(aCenter.xy - uHover.xy, 0.0) + vec3(0.0, 0.0, 0.5) + aDir * 0.35);
    vec3 outward = vec3(aCenter.xy * (0.55 + 0.45 * aRand.w), aDir.z * 0.6);
    vec3 cl = aCenter + away * hov * 1.3 + outward * spread * 1.15 + aDir * spread * 0.9
            + (aDir * 0.7 + vec3(aCenter.xy * 0.3, 0.0)) * tB;
    mat3 G = mat3(uGlobeM) / uS;
    vec3 C0 = (uGlobeM * vec4(cl, 1.0)).xyz;
    mat3 R0 = G * Rl;
    // C: 매끄러운 흐름. 파편마다 흐름 위 위치·폭 위치가 다르고, 띠가 천천히 비틀림
    float u = clamp(clamp((p - 0.14) / 0.24, 0.0, 1.0) * 0.8 + aFlow.y * 0.36 - 0.1, 0.0, 1.0);
    vec3 T; vec3 B = flowAt(u, T);
    vec3 N = normalize(vec3(-T.y, T.x, 0.0)), Z = normalize(cross(T, N));
    float tw = u * 3.4 + aFlow.z * 0.6;
    vec3 C1 = B + (N * cos(tw) + Z * sin(tw)) * aFlow.x * (0.25 + 0.35 * sin(u * 3.14159));
    mat3 R1 = rotAxis(T, tw) * rotAxis(aRand.xyz, p * 3.0 * aRand.w);
    float tF = sm(0.12 + aFlow.y * 0.04, 0.22 + aFlow.y * 0.05, p);
    // D: CD 자리 (원판 모양으로 깔림), 원판이 차오르면 작아지며 사라짐
    int k = int(aSlot.x + 0.5);
    mat4 M; float Rk; float Fk; cdPick(k, M, Rk, Fk);
    float dk = k == 2 ? 0.0 : ((k == 1 || k == 3) ? 0.025 : 0.05);
    float tC = sm(0.30 + dk + aFlow.y * 0.05, 0.42 + dk + aFlow.y * 0.05, p);
    float th = aSlot.z;
    vec3 C2 = (M * vec4(aSlot.y * cos(th), aSlot.y * sin(th), 0.03, 1.0)).xyz;
    mat3 R2 = (mat3(M) / max(Rk, 1e-4)) * rotAxis(vec3(0.0, 0.0, 1.0), th + aFlow.z * 0.4);
    float s2 = aSlot.w * Rk / ${CELL.toFixed(2)} * (1.0 - sm(0.3, 0.92, Fk));
    C = mix(mix(C0, C1, tF), C2, tC) + vec3(0.0, 0.0, 0.9) * sin(3.14159 * tC);
    R = ortho(mixm(mixm(R0, R1, tF), R2, tC));
    scl = mix(mix(uS, uS * 0.85, tF), s2, tC);
  }`;

const TRAIL_VS = /* glsl */`
  ${SHARD_GLSL}
  varying float vA;
  void main() {
    vec3 C, Cb; mat3 R, Rb; float s, sb;
    shardXf(uP, C, R, s); shardXf(uP - 0.018, Cb, Rb, sb);
    vec3 d = C - Cb; float L = length(d);
    vec3 D = L > 1e-4 ? d / L : vec3(1.0, 0.0, 0.0);
    vec3 up = abs(D.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 Y = normalize(cross(up, D)), Zz = cross(D, Y);
    float show = sm(0.12, 0.17, uP) * (1.0 - sm(0.40, 0.47, uP));
    float w = 0.0045 * show;
    vec3 mid = (C + Cb) * 0.5;
    vec3 world = mid + D * position.x * L + Y * position.y * w + Zz * position.z * w;
    vA = show * clamp(L * 2.0, 0.0, 1.0);
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }`;
const TRAIL_FS = /* glsl */`
  uniform vec3 uCol; varying float vA;
  void main() { if (vA < 0.01) discard; gl_FragColor = vec4(uCol * vA, 1.0); }`;

/* 파편 재질: 처음엔 히어로 유리 빨강, 흩어지면서 은은하게 빛나는 실버로 (색·금속감은 매 프레임 바꿈) */
function shardMaterial(uniforms) {
  const mat = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${SHARD_GLSL}\nvec3 gC; mat3 gR; float gS;`)
      .replace('#include <beginnormal_vertex>', `shardXf(uP, gC, gR, gS);\nvec3 objectNormal = gR * vec3(normal);\n#ifdef USE_TANGENT\nvec3 objectTangent = gR * vec3(tangent.xyz);\n#endif`)
      .replace('#include <begin_vertex>', 'vec3 transformed = gR * ((position - aCenter) * gS) + gC;');
  };
  return mat;
}

/* ---------- 장면 ---------- */
export async function createSoundScene(opts) {
  const { canvas, section, stage, statement, textArea, onRing, onProgress, onSelect } = opts;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { document.documentElement.classList.add('no-webgl'); return null; }
  const lite = !finePointer;
  const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);
  const BG = [new THREE.Color(css('--color-bg-accent') || '#FF3B1F'), new THREE.Color('#5e0c06'), new THREE.Color('#0e0201'), new THREE.Color('#000000')];
  scene.background = BG[0].clone();

  /* --- 지구본 = 파편 묶음 --- */
  const svg = await L3.loadShapes();
  const accent = new THREE.Color(css('--color-accent') || '#FF3B1F');
  const SILVER = new THREE.Color('#e6e9ee');
  const geo = buildShards(svg, CELL);
  geo.computeBoundingBox();
  const bbox = geo.boundingBox.clone();
  // 파편 목록 (같은 aCenter = 한 파편)
  const cen = geo.attributes.aCenter, nV = cen.count;
  const shardOf = new Int32Array(nV), keyToId = new Map(), shards = [];
  for (let i = 0; i < nV; i++) {
    const key = `${cen.getX(i).toFixed(4)},${cen.getY(i).toFixed(4)},${cen.getZ(i).toFixed(4)}`;
    let id = keyToId.get(key);
    if (id === undefined) { id = shards.length; keyToId.set(key, id); shards.push({ c: new THREE.Vector3(cen.getX(i), cen.getY(i), cen.getZ(i)), first: i }); }
    shardOf[i] = id;
  }
  const NS = shards.length;
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // CD 5칸에 파편 나누기: 가운데 30%, 양옆 21%, 바깥 14%. 각 CD 안에서는 해바라기 배치로 원판(구멍 제외)을 고르게 덮음
  const SLOT_W = finePointer || window.innerWidth >= 768 ? [0.14, 0.21, 0.30, 0.21, 0.14] : [0, 0.3, 0.4, 0.3, 0]; // 모바일은 3장
  const order = shards.map((_, i) => i).sort((a, b) => shards[a].c.x - shards[b].c.x); // 왼쪽 파편은 왼쪽 CD로
  const counts = SLOT_W.map((w) => Math.round(w * NS)); counts[2] += NS - counts.reduce((x, y) => x + y, 0);
  const HOLE_N = 0.3;
  let at = 0;
  counts.forEach((n, k) => {
    if (!n) return;
    const side = Math.sqrt(Math.PI * (1 - HOLE_N * HOLE_N) / n) * 0.95;
    for (let m = 0; m < n; m++, at++) {
      const sh = shards[order[at]];
      const r = Math.sqrt(HOLE_N * HOLE_N + ((m + 0.5) / n) * (1 - HOLE_N * HOLE_N)) * 0.97;
      sh.slot = [k, r, m * 2.39996 + rnd() * 0.2, side];
    }
  });
  shards.forEach((sh) => { sh.flow = [rnd() * 2 - 1, rnd(), rnd() * 6.28, rnd()]; });
  const slotA = new Float32Array(nV * 4), flowA = new Float32Array(nV * 4);
  for (let i = 0; i < nV; i++) { const sh = shards[shardOf[i]]; slotA.set(sh.slot, i * 4); flowA.set(sh.flow, i * 4); }
  geo.setAttribute('aSlot', new THREE.BufferAttribute(slotA, 4));
  geo.setAttribute('aFlow', new THREE.BufferAttribute(flowA, 4));
  const cdM = Array.from({ length: 5 }, () => new THREE.Matrix4());
  const U = {
    uP: { value: 0 }, uTime: { value: 0 }, uGlobeM: { value: new THREE.Matrix4() }, uS: { value: 1 },
    uHover: { value: new THREE.Vector3(99, 99, 0) }, uHoverAmt: { value: 0 }, uHoverR: { value: 0.95 },
    uCdM: { value: cdM }, uCdR: { value: [1, 1, 1, 1, 1] }, uCdForm: { value: [0, 0, 0, 0, 0] },
    uHH: { value: TAN * CAM_Z }, uAspect: { value: 1.6 },
  };
  const sMat = shardMaterial(U);
  const shardMesh = new THREE.Mesh(geo, sMat); shardMesh.frustumCulled = false; scene.add(shardMesh);
  const pivot = new THREE.Group(); scene.add(pivot);               // 지구본 위치·회전·크기 (셰이더로 전달)
  const logoRef = new THREE.Object3D(); pivot.add(logoRef);

  // 파편이 흐를 때 남기는 머리카락 같은 잔상 (실버, 더하기 합성)
  const tGeo = new THREE.InstancedBufferGeometry();
  const box = new THREE.BoxGeometry(1, 1, 1);
  tGeo.index = box.index; tGeo.setAttribute('position', box.attributes.position); tGeo.instanceCount = NS;
  const iA = (n, fill) => { const a = new Float32Array(NS * n); shards.forEach((sh, i) => fill(a, i, sh)); return new THREE.InstancedBufferAttribute(a, n); };
  tGeo.setAttribute('aCenter', iA(3, (a, i, sh) => a.set([sh.c.x, sh.c.y, sh.c.z], i * 3)));
  tGeo.setAttribute('aDir', iA(3, (a, i, sh) => { const j = sh.first * 3; a.set(geo.attributes.aDir.array.slice(j, j + 3), i * 3); }));
  tGeo.setAttribute('aRand', iA(4, (a, i, sh) => { const j = sh.first * 4; a.set(geo.attributes.aRand.array.slice(j, j + 4), i * 4); }));
  tGeo.setAttribute('aSlot', iA(4, (a, i, sh) => a.set(sh.slot, i * 4)));
  tGeo.setAttribute('aFlow', iA(4, (a, i, sh) => a.set(sh.flow, i * 4)));
  const trails = new THREE.Mesh(tGeo, new THREE.ShaderMaterial({ uniforms: { ...U, uCol: { value: new THREE.Color('#cfd6de') } }, vertexShader: TRAIL_VS, fragmentShader: TRAIL_FS, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  trails.frustumCulled = false; scene.add(trails);

  // 문장 평면: 같은 장면에 있어야 유리 굴절에 비침. 배경은 투명(장면 배경색이 바뀜)
  const textCanvas = document.createElement('canvas');
  const tTex = new THREE.CanvasTexture(textCanvas); tTex.colorSpace = THREE.SRGBColorSpace;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tTex, transparent: true, toneMapped: false, depthWrite: false }));
  plane.position.z = -2.5; scene.add(plane);

  /* --- CD 9장 (발매 기록) --- */
  const RELS = typeof RELEASES !== 'undefined' ? RELEASES : [];
  const ARTS = typeof ARTISTS !== 'undefined' ? ARTISTS : [];
  const NC = RELS.length;
  const HOLE = 0.125, THICK = 0.035;
  const bodyGeo = cdBodyGeometry(HOLE, THICK);
  const faceGeo = new THREE.RingGeometry(HUB_N, 0.985, 128, 1); faceGeo.translate(0, 0, THICK / 2 + 0.0015);
  const hubGeo = new THREE.RingGeometry(HOLE, HUB_N, 96, 1); hubGeo.translate(0, 0, THICK / 2 + 0.001);
  // 뒷면 = 은색 데이터면 (돌렸을 때 보이는 면, 기울이면 무지개 빛)
  const backGeo = new THREE.RingGeometry(HOLE + 0.02, 0.985, 128, 1); backGeo.rotateY(Math.PI); backGeo.translate(0, 0, -THICK / 2 - 0.0015);
  const cds = await Promise.all(RELS.map(async (rel, i) => {
    const uForm = { value: 0 };
    const tex = await makeCdTexture(rel, ARTS.find((a) => a.id === rel.artistId));
    const face = new THREE.Mesh(faceGeo, revealMaterial(new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.38, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.9 }), uForm));
    const body = new THREE.Mesh(bodyGeo, revealMaterial(new THREE.MeshPhysicalMaterial({ color: 0xd9d9d9, metalness: 1, roughness: 0.22, iridescence: 0.7, iridescenceIOR: 1.6, envMapIntensity: 1.3 }), uForm));
    const hub = new THREE.Mesh(hubGeo, revealMaterial(new THREE.MeshPhysicalMaterial({ color: 0x6f757b, metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.6, envMapIntensity: 1.1 }), uForm));
    const back = new THREE.Mesh(backGeo, revealMaterial(new THREE.MeshPhysicalMaterial({ color: 0xe3e7ec, metalness: 0.9, roughness: 0.3, iridescence: 0.22, iridescenceIOR: 1.5, iridescenceThicknessRange: [260, 420], envMapIntensity: 2.4 }), uForm));
    back.userData.cd = i;
    const spin = new THREE.Group(); spin.add(body, face, hub, back);
    const g = new THREE.Group(); g.add(spin); scene.add(g);
    face.userData.cd = i; body.userData.cd = i; hub.userData.cd = i;
    return { rel, g, spin, face, body, hub, uForm, hover: 0, user: new THREE.Quaternion(), vel: new THREE.Vector2(), tilt: [(rnd() - 0.5) * 0.16, (rnd() - 0.5) * 0.16, (rnd() - 0.5) * 0.12], phase: rnd() * 6.28 };
  }));

  /* --- 배치 --- */
  let W = 1, H = 1, aspect = 1.6, viewH = 2 * TAN * CAM_Z, baseY = 0, mobile = false;
  function fit() {
    W = canvas.clientWidth; H = canvas.clientHeight; if (!W || !H) return;
    mobile = W < 768;
    renderer.setSize(W, H, false);
    aspect = W / H; camera.aspect = aspect; camera.updateProjectionMatrix();
    viewH = 2 * TAN * CAM_Z; const viewW = viewH * aspect;
    const logoW = bbox.max.x - bbox.min.x, logoH = bbox.max.y - bbox.min.y;
    const a = textArea ? textArea() : null;
    const maxH = (a ? (a.bottom - a.top) / H : 0.6) * viewH * 0.8;
    pivot.scale.setScalar(Math.min((mobile ? 0.78 : 0.46) * viewW / logoW, maxH / logoH));
    baseY = a ? -(((a.top + a.bottom) / 2) / H - 0.5) * viewH : 0;
    const ph = 2 * TAN * (CAM_Z - plane.position.z);
    plane.scale.set(ph * aspect, ph, 1);
    L3.drawStatementTexture(textCanvas, statement, Math.round(W * dpr), Math.round(H * dpr), null, css('--color-text-on-accent'), a && { top: a.top * dpr, bottom: a.bottom * dpr });
    tTex.needsUpdate = true;
    U.uAspect.value = aspect;
  }
  // 왼쪽 아래 → 오른쪽 위 대각선. 가운데가 가장 크고 바깥으로 갈수록 작아지며, 5장 모두 화면 안
  function layout(o) {
    const a = Math.abs(o), m = mobile;
    const out = m ? smooth(1.15, 1.6, a) : smooth(2.05, 2.7, a);       // 들어오고 나가는 CD: 화면 안에서 작아지며 사라짐 (모바일은 3장)
    return {
      x: m ? o * 0.5 : 0.2 + o * 1.45,
      y: m ? -0.02 + o * 0.74 : 0.08 + o * 0.72,
      z: -a * (m ? 0.4 : 0.7),
      s: (m ? 1 - 0.24 * Math.min(a, 1) : 1 - 0.16 * Math.min(a, 2)) * (1 - out),
      rx: -0.42, ry: 0.5, rz: 0.22,
    };
  }
  const R_CD = () => (mobile ? 0.5 : 1.12);
  const wrapO = (d) => { let o = ((d % NC) + NC) % NC; if (o > NC / 2) o -= NC; return o; };
  const selFromP = (pp) => (pp < P_CD ? 0 : clamp01((pp - P_CD) / (P_END - P_CD)) * (NC - 1));
  const pForIndex = (i) => P_CD + (Math.min(NC - 1, Math.max(0, i)) / (NC - 1)) * (P_END - P_CD);

  /* --- 스크롤 진행도 (고정 + 스크럽) --- */
  let pTarget = 0, p = 0;
  const span = () => section.offsetHeight - window.innerHeight;
  function readScroll() {
    const r = section.getBoundingClientRect();
    const raw = span() > 0 ? clamp01(-r.top / span()) : 0;
    pTarget = reduceMotion ? (raw < 0.3 ? 0 : Math.max(raw, P_CD)) : raw;     // 동작 줄이기: 형태 변화 없이 히어로 → CD
    if (navIdx !== null && Math.abs(raw - pForIndex(navIdx)) < 0.002) navIdx = null; // 도착
  }
  addEventListener('scroll', readScroll, { passive: true });
  function scrollToP(pp) {
    const top = section.getBoundingClientRect().top + window.scrollY + pp * span();
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* --- 상호작용: CD 드래그 = 제자리 회전(놓은 각도 유지), 클릭 = 그 CD로 스크롤 --- */
  const interactive = () => p > 0.56;
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hoverCd = -1, dragCd = -1, moved = false, lx = 0, ly = 0, downX = 0, downY = 0;
  const ptr = { x: 0, y: 0 };
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(cds.filter((c) => c.g.visible).flatMap((c) => [c.face, c.body, c.hub]), false)[0];
    return hit ? hit.object.userData.cd : -1;
  }
  const qa = new THREE.Quaternion(), ax = new THREE.Vector3();
  function rotateCd(cd, dx, dy) {
    qa.setFromAxisAngle(ax.set(0, 1, 0), dx * 0.012); cd.user.premultiply(qa);
    qa.setFromAxisAngle(ax.set(1, 0, 0), dy * 0.012); cd.user.premultiply(qa);
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (!interactive()) return;
    dragCd = pick(e); moved = false; lx = downX = e.clientX; ly = downY = e.clientY;
    if (dragCd >= 0) { canvas.setPointerCapture(e.pointerId); cds[dragCd].vel.set(0, 0); }
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1; ptr.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (interactive() && e.pointerType === 'mouse' && dragCd < 0) hoverCd = pick(e);
    if (dragCd < 0) return;
    const dx = e.clientX - lx, dy = e.pointerType === 'mouse' ? e.clientY - ly : 0; // 터치는 가로만 (세로는 페이지 스크롤)
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) moved = true;
    if (moved) { const cd = cds[dragCd]; rotateCd(cd, dx, dy); cd.vel.set(dx, dy); }
    lx = e.clientX; ly = e.clientY;
  });
  const endDrag = (e) => {
    if (dragCd < 0) return;
    const i = dragCd; dragCd = -1;
    if (!moved) api.goTo(i);           // 누르기만 하면 그 CD로 스크롤
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', () => { dragCd = -1; });
  canvas.addEventListener('pointerleave', () => { hoverCd = -1; });

  /* --- 히어로: 지구본 회전·마우스 깨짐·드래그 회전 (01 단계에서만) --- */
  const rot = { x: 0.15, y: -0.35 };
  const hoverTarget = new THREE.Vector3(99, 99, 0), hHit = new THREE.Vector3(), inv = new THREE.Matrix4(), localRay = new THREE.Ray();
  const hPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  let hoverOn = 0, lastPX = 0, lastPY = 0, gDrag = false, gx = 0, gy = 0;
  canvas.addEventListener('pointerdown', (e) => { if (p < 0.06) { gDrag = true; gx = e.clientX; gy = e.clientY; } });
  addEventListener('pointerup', () => { gDrag = false; });
  canvas.addEventListener('pointermove', (e) => {
    if (gDrag && p < 0.06) { rot.y += (e.clientX - gx) * 0.008; rot.x += (e.clientY - gy) * 0.006; gx = e.clientX; gy = e.clientY; }
    if (reduceMotion || p > 0.06) { hoverOn = 0; return; }
    const r = canvas.getBoundingClientRect(); lastPX = e.clientX - r.left; lastPY = e.clientY - r.top;
    ndc.set((lastPX / r.width) * 2 - 1, -(lastPY / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    inv.copy(logoRef.matrixWorld).invert(); localRay.copy(raycaster.ray).applyMatrix4(inv);
    if (localRay.intersectPlane(hPlane, hHit) && Math.hypot(hHit.x, hHit.y) < 1.9) { if (!hoverOn) U.uHover.value.copy(hHit); hoverTarget.copy(hHit); hoverOn = 1; } else hoverOn = 0;
  });
  canvas.addEventListener('pointerleave', () => { hoverOn = 0; });

  // 이전/다음으로 이동 중이면(도착 전) 그 목표에서 한 칸 더. 직접 스크롤하면 목표를 버림
  let navIdx = null, navT = 0;
  const baseIndex = () => (navIdx !== null && performance.now() - navT < 6000 ? navIdx : Math.round(selFromP(p)));
  addEventListener('wheel', () => { navIdx = null; }, { passive: true });
  addEventListener('touchstart', () => { navIdx = null; }, { passive: true });
  const go = (i) => { navIdx = Math.min(NC - 1, Math.max(0, i)); navT = performance.now(); scrollToP(pForIndex(navIdx)); };
  const api = {
    // 이동 중에 다시 누르면 진행 중인 목표에서 한 칸 더
    next() { go(baseIndex() + 1); },
    prev() { go(baseIndex() - 1); },
    goTo(i) { const cur = baseIndex(); go(Math.round(cur + wrapO(i - cur))); },
    get index() { return ((Math.round(selFromP(p)) % NC) + NC) % NC; },
    get progress() { return p; },
    get count() { return NC; },
    pForIndex,
    pickAt(x, y) { return pick({ clientX: x, clientY: y }); }, // QA: 화면 좌표 아래의 CD
    // 보이는 CD들의 화면 사각형 (QA: 화면 밖으로 잘리는지 확인)
    cdRects() {
      const v = new THREE.Vector3(), out = [];
      cds.forEach((cd, i) => {
        if (!cd.g.visible || cd.g.scale.x < 0.05) return;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (let k = 0; k < 32; k++) {
          const a = (k / 32) * Math.PI * 2;
          v.set(Math.cos(a), Math.sin(a), 0).applyMatrix4(cd.g.matrixWorld).project(camera);
          const px = (v.x * 0.5 + 0.5) * W, py = (1 - (v.y * 0.5 + 0.5)) * H;
          x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
        }
        out.push({ i, title: cd.rel.title, x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1) });
      });
      return out;
    },
  };

  /* --- 루프 --- */
  let visible = true, raf = 0, last = performance.now(), t = 0, lastCur = -1;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); });
  io.observe(stage);
  const tmpE = new THREE.Euler(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();
  function loop(now) {
    raf = 0;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
    const ease = (k) => 1 - Math.pow(1 - k, dt * 60);
    p += (pTarget - p) * (reduceMotion ? 1 : ease(0.1)); if (Math.abs(pTarget - p) < 1e-4) p = pTarget;

    // 배경: 레드 → 다크 레드(20%) → 거의 검정(30%) → 완전한 검정(36%)
    const bg = p < 0.2 ? mixc(BG[0], BG[1], smooth(0.1, 0.2, p)) : p < 0.3 ? mixc(BG[1], BG[2], smooth(0.2, 0.3, p)) : mixc(BG[2], BG[3], smooth(0.3, 0.36, p));
    scene.background.copy(bg);

    // 지구본 (회전·마우스 깨짐)
    U.uTime.value = t;
    U.uHover.value.lerp(hoverTarget, ease(0.22));
    const on = hoverOn && p < 0.06 ? 1 : 0, ha = U.uHoverAmt.value;
    U.uHoverAmt.value += (on - ha) * ease(on > ha ? 0.18 : 0.06);
    if (!reduceMotion) rot.y += dt * 0.12;
    rot.x += ((ptr.y * 0.25 + 0.1) - rot.x) * ease(0.02);
    pivot.rotation.set(rot.x, rot.y, Math.sin(t * 0.5) * 0.04);
    pivot.position.y = baseY + (reduceMotion ? 0 : Math.sin(t * 0.8) * 0.05);
    pivot.updateMatrixWorld(true);
    U.uGlobeM.value.copy(logoRef.matrixWorld); U.uS.value = pivot.scale.x; U.uP.value = p;
    // 파편 재질: 유리 빨강 → 은은하게 빛나는 실버
    const sv = smooth(0.12, 0.3, p);
    sMat.color.copy(accent).lerp(SILVER, sv);
    sMat.metalness = 0.05 + 0.9 * sv; sMat.roughness = 0.08 + 0.14 * sv;
    sMat.transmission = lite ? 0 : Math.max(0.01, 0.92 * (1 - sv)); sMat.thickness = 0.9; sMat.ior = 1.45;
    sMat.attenuationColor.copy(accent).lerp(SILVER, sv); sMat.attenuationDistance = 0.8;
    sMat.clearcoat = 1; sMat.clearcoatRoughness = 0.05;
    sMat.emissive.copy(SILVER); sMat.emissiveIntensity = 0.22 * sv * (1 - smooth(0.5, 0.58, p));
    sMat.envMapIntensity = 1.4 + 0.6 * sv;
    shardMesh.visible = p < 0.58;
    trails.visible = p > 0.11 && p < 0.48;
    plane.material.opacity = 1 - smooth(0.08, 0.2, p);
    plane.visible = plane.material.opacity > 0.001;

    // CD: 스크롤 위치 = 가운데 CD (내리면 CD 줄이 왼쪽 아래로, 다음 CD가 오른쪽 위에서)
    const selF = selFromP(p), R = R_CD();
    const sel0 = 0;                                                    // 형성 단계의 가운데 CD (OXY_GEN)
    cds.forEach((cd, i) => {
      const o = wrapO(i - selF);
      const L = layout(o);
      const slot = Math.round(wrapO(i - sel0)) + 2;
      const formSlot = slot >= 0 && slot <= 4 ? slot : -1;
      const dk = formSlot === 2 ? 0 : (formSlot === 1 || formSlot === 3) ? 0.025 : 0.05;
      cd.uForm.value = formSlot >= 0 ? smooth(0.44 + dk, 0.56 + dk * 0.5, p) : smooth(0.56, 0.6, p);
      const bob = reduceMotion ? 0 : Math.sin(t * 0.7 + cd.phase) * 0.04;
      const hv = cd.hover += ((hoverCd === i && interactive() ? 1 : 0) - cd.hover) * ease(0.12);
      // 드래그 관성 (놓은 뒤 조금 더 돌다가 그 각도에 멈춤)
      if (dragCd !== i && cd.vel.lengthSq() > 0.01) { rotateCd(cd, cd.vel.x, cd.vel.y); cd.vel.multiplyScalar(Math.pow(0.9, dt * 60)); }
      tmpE.set(L.rx + cd.tilt[0] + hv * ptr.y * 0.1, L.ry + cd.tilt[1] + hv * ptr.x * 0.12, L.rz + cd.tilt[2]);
      tmpQ.setFromEuler(tmpE).premultiply(cd.user);
      const Rs = R * L.s;
      tmpV.set(L.x, L.y + bob, L.z + hv * 0.12);
      cd.g.position.copy(tmpV); cd.g.quaternion.copy(tmpQ);
      cd.g.scale.set(Rs, Rs, Rs * (0.15 + 0.85 * smooth(0.2, 0.8, cd.uForm.value)));
      cd.g.visible = cd.uForm.value > 0.001 && L.s > 0.18;
      cd.face.material.envMapIntensity = 0.9 + hv * 0.5;
      const playing = window.Player && window.Player.state.playing && cd.rel.trackId === window.Player.state.trackId;
      if (playing && !reduceMotion) cd.spin.rotation.z -= dt * 0.9;
      // 파편이 모일 자리 (형성 단계 배치)
      if (formSlot >= 0) {
        const L0 = layout(formSlot - 2);
        tmpE.set(L0.rx + cd.tilt[0], L0.ry + cd.tilt[1], L0.rz + cd.tilt[2]);
        cdM[formSlot].compose(tmpV.set(L0.x, L0.y, L0.z), tmpQ.setFromEuler(tmpE), tmpS.setScalar(R * L0.s));
        U.uCdR.value[formSlot] = R * L0.s; U.uCdForm.value[formSlot] = cd.uForm.value;
      }
    });
    const cur = api.index;
    if (cur !== lastCur) { lastCur = cur; onSelect && onSelect(cur, RELS[cur], { first: Math.round(selF) <= 0, last: Math.round(selF) >= NC - 1 }); }
    onProgress && onProgress(p, bg);
    if (onRing) {
      const rpx = (U.uHoverR.value * pivot.scale.x / viewH) * H;
      onRing({ x: lastPX, y: lastPY, r: rpx, visible: hoverOn === 1 && p < 0.06 && finePointer && !reduceMotion });
    }
    canvas.style.cursor = interactive() ? (dragCd >= 0 ? 'grabbing' : hoverCd >= 0 ? 'grab' : '') : '';
    if (!document.documentElement.classList.contains('is-intro')) renderer.render(scene, camera);
    if (visible) raf = requestAnimationFrame(loop);
  }

  const ro = new ResizeObserver(() => { fit(); readScroll(); if (!raf) raf = requestAnimationFrame(loop); });
  ro.observe(canvas);
  if (document.fonts) await document.fonts.ready;
  fit(); readScroll(); p = pTarget;
  raf = requestAnimationFrame(loop);
  canvas.classList.add('is-ready');
  return api;
}
