/* AOMG Concept Redesign — sound3d.js (ES module)
 * FROM IDENTITY TO SOUND: 히어로 로고 오브제 → 선으로 풀림 → 공간에 흩어진 선·사운드 파형 → 여러 장의 CD → NOW PLAYING
 * - 모든 형태는 스크롤 진행도 p(0~1)의 함수 → 위로 스크롤하면 CD → 선 → 로고로 그대로 되돌아감
 * - p는 섹션 고정(sticky) + 스크롤 위치로 계산하고 부드럽게 따라감 (Pinning + Scrub)
 * - 한 장면(하나의 WebGL)에 로고·선·CD를 함께 둬서 형태가 끊기지 않음
 * - 단계: 01 Hero 0–15% · 02 Unravel 15–40% · 03 Disperse 40–65% · 04 CD Formation 65–90% · 05 Now Playing 90–100%
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

/* ---------- 로고 윤곽 → 선분 ----------
 * 지구본 SVG의 윤곽(바깥 원·창)을 앞면·뒷면 두 겹으로 따서 같은 길이의 직선 조각으로 나눔.
 * 좌표는 buildShardGeometry와 같은 로컬 좌표 (폭 3.2, 가운데 0, y 위쪽) */
function contourSegments({ shapes, scale, cx, cy }, geoBox, segLen) {
  const c = new THREE.Vector3(); geoBox.getCenter(c);
  const zh = geoBox.max.z - c.z + 0.015; // 앞·뒷면 바로 바깥 (유리에 가려지지 않게)
  const loops = [];
  shapes.forEach((sh) => {
    const { shape, holes } = sh.extractPoints(18);
    [shape, ...holes].forEach((pts) => loops.push(pts.map((p) => new THREE.Vector2((p.x - cx) * scale - c.x, -(p.y - cy) * scale - c.y))));
  });
  const segs = [];
  [zh, -zh].forEach((z, face) => loops.forEach((pts, li) => {
    // 같은 간격으로 다시 찍기
    const out = [pts[0].clone()]; let acc = 0;
    for (let i = 1; i <= pts.length; i++) {
      const a = pts[i - 1], b = pts[i % pts.length]; let d = a.distanceTo(b), t0 = 0;
      while (acc + d * (1 - t0) >= segLen) {
        const need = segLen - acc; t0 += need / d; acc = 0;
        out.push(a.clone().lerp(b, t0));
      }
      acc += d * (1 - t0);
    }
    for (let i = 0; i < out.length - 1; i++) segs.push({ a: out[i], b: out[i + 1], z, face, loop: li });
  }));
  return segs;
}

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

/* ---------- 선 셰이더 ---------- */
const LINE_VS = /* glsl */`
  uniform float uP; uniform float uTime; uniform mat4 uGlobeM; uniform vec3 uGlobeC; uniform float uS;
  uniform float uHH; uniform float uAspect; uniform vec4 uWave[3]; uniform mat4 uCdM[5]; uniform float uThick;
  attribute vec4 aA; attribute vec3 aAd; attribute vec4 aW; attribute vec4 aF; attribute vec4 aFo; attribute vec3 aFax;
  attribute vec4 aC; attribute vec4 aT;
  varying float vFade; varying float vTone;
  float sm(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
  mat3 rotAxis(vec3 a, float r) { a = normalize(a); float s = sin(r), c = cos(r), o = 1.0 - c;
    return mat3(o*a.x*a.x + c, o*a.x*a.y + a.z*s, o*a.z*a.x - a.y*s, o*a.x*a.y - a.z*s, o*a.y*a.y + c, o*a.y*a.z + a.x*s,
                o*a.z*a.x + a.y*s, o*a.y*a.z - a.x*s, o*a.z*a.z + c); }
  float hw(float z) { return uHH * (${CAM_Z.toFixed(1)} - z) / ${CAM_Z.toFixed(1)} * uAspect; }
  float hh(float z) { return uHH * (${CAM_Z.toFixed(1)} - z) / ${CAM_Z.toFixed(1)}; }
  // 사운드 파형: 가운데가 크고 양 끝이 잦아드는 진폭 × 여러 주파수
  vec3 wavePt(vec4 W, float base, float u) {
    float env = pow(sin(3.14159 * u), 0.8) * (0.55 + 0.45 * sin(u * 21.0 + W.w));
    float y = base + W.y * env * (sin(u * W.z * 6.2832 + W.w + uTime * 0.9) * 0.7 + sin(u * W.z * 15.1 + W.w * 2.0 - uTime * 1.3) * 0.3);
    return vec3((u - 0.5) * 2.2 * hw(W.x), y * hh(W.x), W.x);
  }
  void main() {
    float p = uP;
    // 01→02 로고 위의 선 (지구본과 함께 회전)
    vec3 P0 = (uGlobeM * vec4(aA.xyz, 1.0)).xyz;
    vec3 D0 = normalize(mat3(uGlobeM) * aAd);
    float L0 = aA.w * uS;
    float tU = sm(0.15 + aT.y * 0.13, 0.40, p);               // 풀림: 조각마다 출발이 다름
    vec3 outv = normalize(P0 - uGlobeC + vec3(0.0, 0.0, 0.001));
    vec3 Pu = P0 + (outv * 0.55 + vec3(aFo.xyz) * 0.25) * tU * uS;
    vec3 Du = normalize(rotAxis(aFax, aFo.w * 0.35 * tU) * D0);
    // 03 흩어짐: 파형 또는 공간에 떠다님 (깊이에 따라 속도가 다름)
    vec3 P1; vec3 D1; float L1;
    if (aW.w > 0.5) {
      int wi = int(aW.x + 0.5);
      vec4 W = wi == 0 ? uWave[0] : (wi == 1 ? uWave[1] : uWave[2]);
      float base = wi == 0 ? 0.02 : (wi == 1 ? -0.42 : 0.5);
      vec3 e0 = wavePt(W, base, aW.y), e1 = wavePt(W, base, aW.z);
      P1 = (e0 + e1) * 0.5; D1 = normalize(e1 - e0 + vec3(1e-5, 0.0, 0.0)); L1 = length(e1 - e0) * 0.96;
    } else {
      float z = aF.z;
      float drift = (p - 0.52) * aF.w * 2.4 * (1.2 - (z + 7.0) / 12.0);
      mat3 R = rotAxis(aFax, aFo.w);
      P1 = vec3(aF.x * hw(z), aF.y * hh(z) + drift, z) + R * (aFo.xyz * uS * 0.9);
      D1 = normalize(R * aAd); L1 = L0 * (0.8 + aT.z * 0.8);
    }
    if (dot(D1, Du) < 0.0) D1 = -D1;
    float tD = sm(0.24 + aT.z * 0.08, 0.47 + aT.z * 0.04, p);
    // 04 CD: 테두리 → 가운데 구멍 → 표면 링 순서로, 가운데 CD가 먼저
    int k = int(aC.x + 0.5);
    mat4 M = k == 0 ? uCdM[0] : (k == 1 ? uCdM[1] : (k == 2 ? uCdM[2] : (k == 3 ? uCdM[3] : uCdM[4])));
    float th = aC.z + aC.w * 0.5;
    vec3 P2 = (M * vec4(aC.y * cos(th), aC.y * sin(th), 0.03, 1.0)).xyz;
    vec3 D2 = normalize(mat3(M) * vec3(-sin(th), cos(th), 0.0));
    float L2 = aC.y * aC.w * length(M[0].xyz) * 0.9;
    if (dot(D2, D1) < 0.0) D2 = -D2;
    float tF = sm(0.65 + aT.x, 0.65 + aT.x + 0.13, p);
    vec3 P = mix(mix(Pu, P1, tD), P2, tF);
    vec3 D = normalize(mix(mix(Du, D1, tD), D2, tF));
    float Lg = mix(mix(L0, L1, tD), L2, tF);
    // 나타남(풀리기 시작) · 원판이 다 생긴 뒤 사라짐
    float show = sm(0.13, 0.19, p) * (1.0 - sm(0.86, 0.93, p));
    float w = uThick * show * mix(1.0, 0.75, tF) * (1.0 + 0.6 * (1.0 - tD));
    vec3 up = abs(D.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 Y = normalize(cross(up, D)), Z = cross(D, Y);
    vec3 world = P + D * position.x * Lg + Y * position.y * w + Z * position.z * w;
    vFade = show; vTone = tD;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }`;
const LINE_FS = /* glsl */`
  uniform vec3 uCol0; uniform vec3 uCol1; varying float vFade; varying float vTone;
  void main() { if (vFade < 0.01) discard; gl_FragColor = vec4(mix(uCol0, uCol1, vTone), 1.0); }`;

/* ---------- 장면 ---------- */
export async function createSoundScene(opts) {
  const { canvas, section, stage, statement, textArea, onRing, onProgress, onSelect } = opts;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { document.documentElement.classList.add('no-webgl'); return null; }
  const lite = !finePointer;                                  // 터치·저사양: 선 수·해상도·굴절 줄임
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

  /* --- 01 로고 오브제 (기존 히어로와 같은 모양·재질·마우스 깨짐) --- */
  const svg = await L3.loadShapes();
  const accent = new THREE.Color(css('--color-accent') || '#FF3B1F');
  const gU = { uBeat: { value: 0 }, uTime: { value: 0 }, uHover: { value: new THREE.Vector3(99, 99, 0) }, uHoverAmt: { value: 0 }, uHoverR: { value: 0.95 } };
  const uDis = { value: 0 };
  const gMat = L3.shatterMaterial({
    color: accent, metalness: 0.05, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05,
    transmission: lite ? 0 : 0.92, thickness: 0.9, ior: 1.45, attenuationColor: accent, attenuationDistance: 0.8,
    envMapIntensity: 1.4, side: THREE.DoubleSide,
  }, gU);
  // 02 풀림: 오브제 면이 조금씩 비워지고 선만 남음 (가장자리가 잠깐 밝게 빛남)
  const baseCompile = gMat.onBeforeCompile;
  gMat.onBeforeCompile = (sh) => {
    baseCompile(sh);
    sh.uniforms.uDis = uDis;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vDisP;')
      .replace('#include <project_vertex>', 'vDisP = position;\n#include <project_vertex>');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vDisP; uniform float uDis;
      float disN(vec3 q) { // 바깥에서 안쪽으로, 결을 따라 부드럽게 비워짐
        float r = length(q.xy) / 1.7;
        float n = 0.5 + 0.25 * sin(q.x * 4.3 + sin(q.y * 3.1) * 1.6) + 0.25 * sin(q.y * 5.7 - q.x * 2.2);
        return clamp((1.0 - r) * 0.55 + n * 0.45, 0.0, 1.0); }`)
      .replace('void main() {', 'void main() {\n  float dn = disN(vDisP);\n  if (dn < uDis * 1.05) discard;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vec3(1.0, 0.85, 0.8) * (1.0 - smoothstep(0.0, 0.03, dn - uDis * 1.05)) * step(0.001, uDis) * 0.6;');
  };
  const gGeo = L3.buildShardGeometry(svg, { cell: 0.3 });
  gGeo.computeBoundingBox();
  const logo = new THREE.Mesh(gGeo, gMat);
  const pivot = new THREE.Group(); pivot.add(logo); scene.add(pivot);

  // 문장 평면: 같은 장면에 있어야 유리 굴절에 비침. 배경은 투명(장면 배경색이 바뀜)
  const textCanvas = document.createElement('canvas');
  const tTex = new THREE.CanvasTexture(textCanvas); tTex.colorSpace = THREE.SRGBColorSpace;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tTex, transparent: true, toneMapped: false, depthWrite: false }));
  plane.position.z = -2.5; scene.add(plane);

  /* --- 선 (인스턴스) --- */
  const segs = contourSegments(svg, gGeo.boundingBox, lite ? 0.2 : 0.13);
  const N = segs.length;
  const lineGeo = new THREE.InstancedBufferGeometry();
  const box = new THREE.BoxGeometry(1, 1, 1);
  lineGeo.index = box.index; lineGeo.setAttribute('position', box.attributes.position);
  lineGeo.instanceCount = N;
  const A = new Float32Array(N * 4), Ad = new Float32Array(N * 3), Wv = new Float32Array(N * 4), F = new Float32Array(N * 4),
    Fo = new Float32Array(N * 4), Fax = new Float32Array(N * 3), C = new Float32Array(N * 4), T = new Float32Array(N * 4);
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // 꺾인 선(절선): 이어진 2~5개 조각이 한 덩어리로 움직임
  const chains = []; { let i = 0; while (i < N) { const n = 2 + Math.floor(rnd() * 4); chains.push([i, Math.min(N, i + n)]); i += n; } }
  const chainOf = new Int32Array(N);
  chains.forEach(([a, b], ci) => { for (let i = a; i < b; i++) chainOf[i] = ci; });
  const chainFloat = chains.map(() => ({ x: (rnd() * 2 - 1) * 1.15, y: (rnd() * 2 - 1) * 1.1, z: -7 + rnd() * 9.5, speed: 0.4 + rnd() * 1.2, ax: [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5], ang: (rnd() - 0.5) * 2.4 }));
  const chainCenter = chains.map(([a, b]) => { const v = new THREE.Vector3(); for (let i = a; i < b; i++) v.add(new THREE.Vector3((segs[i].a.x + segs[i].b.x) / 2, (segs[i].a.y + segs[i].b.y) / 2, segs[i].z)); return v.divideScalar(b - a); });
  // 파형에 쓸 선: 앞면 윤곽의 연속 구간 (이웃한 선이 파형에서도 이웃)
  const waveIdx = []; for (let i = 0; i < N; i++) if (segs[i].face === 0 && (i % 10) < 6) waveIdx.push(i);
  const WAVES = 3, perWave = Math.floor(waveIdx.length / WAVES);
  const waveOf = new Int32Array(N).fill(-1), waveU = new Float32Array(N * 2);
  for (let w = 0; w < WAVES; w++) for (let j = 0; j < perWave; j++) { const i = waveIdx[w * perWave + j]; waveOf[i] = w; waveU[i * 2] = j / perWave; waveU[i * 2 + 1] = (j + 1) / perWave; }
  // CD 링 배정: 가운데 CD 40%, 양옆 22%, 그 바깥 8%. 테두리 → 구멍 → 표면 링 순서
  const SLOT_W = [0.08, 0.22, 0.4, 0.22, 0.08], SLOT_DELAY = [0.06, 0.03, 0, 0.03, 0.06];
  const RINGS = [{ r: 1.0, o: 0 }, { r: 0.965, o: 0.25 }, { r: 0.125, o: 1 }, { r: 0.3, o: 1.4 }, { r: 0.42, o: 2 }, { r: 0.56, o: 2.4 }, { r: 0.7, o: 2.8 }, { r: 0.84, o: 3.2 }];
  const order = [...waveIdx.slice(0, perWave * WAVES)]; for (let i = 0; i < N; i++) if (waveOf[i] < 0) order.push(i); // 파형 선부터 가운데 CD로
  const slotOrder = [2, 1, 3, 0, 4];
  let at = 0;
  slotOrder.forEach((k) => {
    const cnt = k === 4 ? N - at : Math.round(N * SLOT_W[k]);
    const circ = RINGS.reduce((s, r) => s + r.r, 0);
    let used = 0;
    RINGS.forEach((ring, ri) => {
      const n = ri === RINGS.length - 1 ? cnt - used : Math.max(6, Math.round(cnt * ring.r / circ));
      for (let j = 0; j < n && at < N; j++, at++) {
        const i = order[at];
        const dth = (Math.PI * 2) / n;
        C.set([k, ring.r, j * dth, dth], i * 4);
        T[i * 4] = SLOT_DELAY[k] + ring.o * 0.012 + rnd() * 0.015;
      }
      used += n;
    });
  });
  for (let i = 0; i < N; i++) {
    const s = segs[i], cxs = (s.a.x + s.b.x) / 2, cys = (s.a.y + s.b.y) / 2;
    const d = new THREE.Vector3(s.b.x - s.a.x, s.b.y - s.a.y, 0), len = d.length(); d.normalize();
    A.set([cxs, cys, s.z, len], i * 4); Ad.set([d.x, d.y, d.z], i * 3);
    const ci = chainOf[i], cf = chainFloat[ci], cc = chainCenter[ci];
    Wv.set([Math.max(0, waveOf[i]), waveU[i * 2], waveU[i * 2 + 1], waveOf[i] >= 0 ? 1 : 0], i * 4);
    F.set([cf.x, cf.y, cf.z, cf.speed], i * 4);
    Fo.set([cxs - cc.x, cys - cc.y, s.z - cc.z, cf.ang], i * 4); Fax.set(cf.ax, i * 3);
    T[i * 4 + 1] = clamp01(Math.hypot(cxs, cys) / 1.7 * 0.6 + rnd() * 0.4); // 바깥 윤곽부터 풀림
    T[i * 4 + 2] = rnd(); T[i * 4 + 3] = rnd();
  }
  const ia = (arr, n) => new THREE.InstancedBufferAttribute(arr, n);
  lineGeo.setAttribute('aA', ia(A, 4)); lineGeo.setAttribute('aAd', ia(Ad, 3)); lineGeo.setAttribute('aW', ia(Wv, 4));
  lineGeo.setAttribute('aF', ia(F, 4)); lineGeo.setAttribute('aFo', ia(Fo, 4)); lineGeo.setAttribute('aFax', ia(Fax, 3));
  lineGeo.setAttribute('aC', ia(C, 4)); lineGeo.setAttribute('aT', ia(T, 4));
  const cdM = Array.from({ length: 5 }, () => new THREE.Matrix4());
  const lU = {
    uP: { value: 0 }, uTime: { value: 0 }, uGlobeM: { value: new THREE.Matrix4() }, uGlobeC: { value: new THREE.Vector3() }, uS: { value: 1 },
    uHH: { value: TAN * CAM_Z }, uAspect: { value: 1.6 }, uThick: { value: lite ? 0.016 : 0.012 },
    uWave: { value: [new THREE.Vector4(0.6, 0.34, 2.2, 0.3), new THREE.Vector4(-1.2, 0.26, 3.1, 2.1), new THREE.Vector4(-3.0, 0.2, 1.6, 4.0)] },
    uCdM: { value: cdM }, uCol0: { value: new THREE.Color('#ffe9e2') }, uCol1: { value: new THREE.Color('#f4f4f4') },
  };
  const lines = new THREE.Mesh(lineGeo, new THREE.ShaderMaterial({ uniforms: lU, vertexShader: LINE_VS, fragmentShader: LINE_FS }));
  lines.frustumCulled = false; scene.add(lines);

  /* --- CD --- */
  const RELS = typeof RELEASES !== 'undefined' ? RELEASES : [];
  const ARTS = typeof ARTISTS !== 'undefined' ? ARTISTS : [];
  const NC = RELS.length;
  const HOLE = 0.125, HUB = 0.3, THICK = 0.035;
  const bodyGeo = cdBodyGeometry(HOLE, THICK);
  const faceGeo = new THREE.RingGeometry(HUB, 0.985, 128, 1); faceGeo.translate(0, 0, THICK / 2 + 0.0015);
  const hubGeo = new THREE.RingGeometry(HOLE, HUB, 96, 1); hubGeo.translate(0, 0, THICK / 2 + 0.001);
  const cds = await Promise.all(RELS.map(async (rel, i) => {
    const uForm = { value: 0 };
    const tex = await makeCdTexture(rel, ARTS.find((a) => a.id === rel.artistId));
    const face = new THREE.Mesh(faceGeo, revealMaterial(new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.38, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.9 }), uForm));
    const body = new THREE.Mesh(bodyGeo, revealMaterial(new THREE.MeshPhysicalMaterial({ color: 0xd9d9d9, metalness: 1, roughness: 0.22, iridescence: 0.7, iridescenceIOR: 1.6, envMapIntensity: 1.3 }), uForm));
    const hub = new THREE.Mesh(hubGeo, revealMaterial(new THREE.MeshPhysicalMaterial({ color: 0x6f757b, metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.6, envMapIntensity: 1.1 }), uForm)); // 투명한 플라스틱 허브
    const spin = new THREE.Group(); spin.add(body, face, hub);
    const g = new THREE.Group(); g.add(spin); scene.add(g);
    face.userData.cd = i;
    return { rel, g, spin, face, uForm, hover: 0, tilt: [(rnd() - 0.5) * 0.22, (rnd() - 0.5) * 0.22, (rnd() - 0.5) * 0.18], phase: rnd() * 6.28 };
  }));

  /* --- 배치 --- */
  let W = 1, H = 1, aspect = 1.6, viewH = 2 * TAN * CAM_Z, baseY = 0, mobile = false;
  function fit() {
    W = canvas.clientWidth; H = canvas.clientHeight; if (!W || !H) return;
    mobile = W < 768;
    renderer.setSize(W, H, false);
    aspect = W / H; camera.aspect = aspect; camera.updateProjectionMatrix();
    viewH = 2 * TAN * CAM_Z; const viewW = viewH * aspect;
    const bb = gGeo.boundingBox, logoW = bb.max.x - bb.min.x, logoH = bb.max.y - bb.min.y;
    const a = textArea ? textArea() : null;
    const maxH = (a ? (a.bottom - a.top) / H : 0.6) * viewH * 0.8;
    pivot.scale.setScalar(Math.min((mobile ? 0.78 : 0.46) * viewW / logoW, maxH / logoH));
    baseY = a ? -(((a.top + a.bottom) / 2) / H - 0.5) * viewH : 0;
    const ph = 2 * TAN * (CAM_Z - plane.position.z);
    plane.scale.set(ph * aspect, ph, 1);
    L3.drawStatementTexture(textCanvas, statement, Math.round(W * dpr), Math.round(H * dpr), null, css('--color-text-on-accent'), a && { top: a.top * dpr, bottom: a.bottom * dpr });
    tTex.needsUpdate = true;
    lU.uAspect.value = aspect; lU.uHH.value = TAN * CAM_Z;
  }
  // A24처럼 왼쪽 아래 → 오른쪽 위 대각선. 오른쪽일수록 앞(크게), 화면 밖으로 잘리게
  const R_CD = () => (mobile ? 0.95 : 1.45);
  function layout(o) {
    const m = mobile;
    return {
      x: o * (m ? 1.75 : 2.85) + (m ? 0 : 0.35),
      y: o * (m ? 0.55 : 1.0) + (m ? -0.1 : -0.12),
      z: o * (m ? 0.9 : 1.05),
      rx: -0.42 + o * 0.04, ry: 0.5 - o * 0.06, rz: 0.22 + o * 0.03,
    };
  }
  const wrapO = (d) => { let o = ((d % NC) + NC) % NC; if (o > NC / 2) o -= NC; return o; };

  /* --- 스크롤 진행도 (고정 + 스크럽) --- */
  let pTarget = 0, p = 0;
  function readScroll() {
    const r = section.getBoundingClientRect();
    const span = section.offsetHeight - window.innerHeight;
    const raw = span > 0 ? clamp01(-r.top / span) : 0;
    pTarget = reduceMotion ? (raw < 0.5 ? 0 : 1) : raw;          // 동작 줄이기: 처음/끝 두 상태만
  }
  addEventListener('scroll', readScroll, { passive: true });

  /* --- CD 선택 (드래그·가로 휠·키) --- */
  let sel = 0, selF = 0, dragging = false, dragX = 0, dragV = 0, lastMoveT = 0, downX = 0, downY = 0, pressed = false;
  const interactive = () => p > 0.93;
  const current = () => ((Math.round(selF) % NC) + NC) % NC;
  let lastCur = -1;
  function select(n) { sel = n; }
  const api = {
    next() { select(Math.round(sel) + 1); }, prev() { select(Math.round(sel) - 1); },
    goTo(i) { select(Math.round(selF) + wrapO(i - Math.round(selF))); },
    get index() { return current(); }, get progress() { return p; },
  };
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hoverCd = -1, ptr = { x: 0, y: 0 };
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(cds.map((c) => c.face), false)[0];
    return hit ? hit.object.userData.cd : -1;
  }
  // 01 단계: 누르고 드래그하면 오브제 회전 (HOLD AND DRAG)
  let gDrag = false, gx = 0, gy = 0;
  canvas.addEventListener('pointerdown', (e) => { if (p < 0.1) { gDrag = true; gx = e.clientX; gy = e.clientY; } });
  addEventListener('pointerup', () => { gDrag = false; });
  canvas.addEventListener('pointermove', (e) => {
    if (!gDrag || p >= 0.1) return;
    rot.y += (e.clientX - gx) * 0.008; rot.x += (e.clientY - gy) * 0.006; gx = e.clientX; gy = e.clientY;
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (!interactive()) return;
    pressed = true; dragging = false; downX = dragX = e.clientX; downY = e.clientY; dragV = 0; lastMoveT = performance.now();
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1; ptr.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (interactive() && e.pointerType === 'mouse') hoverCd = pick(e);
    if (!pressed) return;
    if (!dragging && Math.abs(e.clientX - downX) > 6) dragging = true;
    if (dragging) {
      const now = performance.now(), dx = e.clientX - dragX;
      const d = -dx / (W * (mobile ? 0.5 : 0.3));
      selF += d; sel = selF; dragV = d / Math.max(1, now - lastMoveT) * 16; lastMoveT = now; dragX = e.clientX;
    }
  });
  const endDrag = (e) => {
    if (!pressed) return; pressed = false;
    if (dragging) { sel = Math.round(selF + dragV * 6); dragging = false; return; }       // 관성 후 가장 가까운 CD
    const hit = pick(e); if (hit >= 0) api.goTo(hit);                                      // 옆 CD 누르면 선택
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', () => { pressed = false; dragging = false; sel = Math.round(selF); });
  canvas.addEventListener('pointerleave', () => { hoverCd = -1; });
  let wheelT = 0;
  stage.addEventListener('wheel', (e) => {
    if (!interactive() || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;                // 세로 휠은 페이지 스크롤
    e.preventDefault();
    selF += e.deltaX * 0.004; sel = selF;
    clearTimeout(wheelT); wheelT = setTimeout(() => { sel = Math.round(selF); }, 140);
  }, { passive: false });

  /* --- 히어로 오브제 회전·마우스 깨짐 (01 단계에서만) --- */
  const rot = { x: 0.15, y: -0.35 };
  const hoverTarget = new THREE.Vector3(99, 99, 0), hHit = new THREE.Vector3(), inv = new THREE.Matrix4(), localRay = new THREE.Ray();
  const hPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  let hoverOn = 0, lastPX = 0, lastPY = 0;
  canvas.addEventListener('pointermove', (e) => {
    if (reduceMotion || p > 0.06) { hoverOn = 0; return; }
    const r = canvas.getBoundingClientRect(); lastPX = e.clientX - r.left; lastPY = e.clientY - r.top;
    ndc.set((lastPX / r.width) * 2 - 1, -(lastPY / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    inv.copy(logo.matrixWorld).invert(); localRay.copy(raycaster.ray).applyMatrix4(inv);
    if (localRay.intersectPlane(hPlane, hHit) && Math.hypot(hHit.x, hHit.y) < 1.9) { if (!hoverOn) gU.uHover.value.copy(hHit); hoverTarget.copy(hHit); hoverOn = 1; } else hoverOn = 0;
  });
  canvas.addEventListener('pointerleave', () => { hoverOn = 0; });

  /* --- 루프 --- */
  let visible = true, raf = 0, last = performance.now(), t = 0;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); });
  io.observe(stage);
  const tmpE = new THREE.Euler(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();
  function loop(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const ease = (k) => 1 - Math.pow(1 - k, dt * 60);
    p += (pTarget - p) * (reduceMotion ? 1 : ease(0.1)); if (Math.abs(pTarget - p) < 1e-4) p = pTarget;

    // 배경: 레드 → 다크 레드(40%) → 검정에 가깝게(60%) → 완전한 검정(66%)
    const bg = p < 0.4 ? mixc(BG[0], BG[1], smooth(0.15, 0.4, p)) : p < 0.6 ? mixc(BG[1], BG[2], smooth(0.4, 0.6, p)) : mixc(BG[2], BG[3], smooth(0.6, 0.66, p));
    scene.background.copy(bg);

    // 01 로고
    gU.uTime.value = t; lU.uTime.value = t;
    gU.uHover.value.lerp(hoverTarget, ease(0.22));
    const on = hoverOn && p < 0.06 ? 1 : 0, ha = gU.uHoverAmt.value;
    gU.uHoverAmt.value += (on - ha) * ease(on > ha ? 0.18 : 0.06);
    const beat = parseFloat(css('--beat')) || 0;
    gU.uBeat.value += (beat - gU.uBeat.value) * 0.3;
    if (!reduceMotion) rot.y += dt * 0.12;
    rot.x += ((ptr.y * 0.25 + 0.1) - rot.x) * ease(0.02);
    pivot.rotation.set(rot.x, rot.y, Math.sin(t * 0.5) * 0.04);
    pivot.position.y = baseY + (reduceMotion ? 0 : Math.sin(t * 0.8) * 0.05);
    pivot.updateMatrixWorld(true);
    uDis.value = smooth(0.17, 0.38, p);
    logo.visible = uDis.value < 0.999;
    plane.material.opacity = 1 - smooth(0.18, 0.42, p);
    plane.visible = plane.material.opacity > 0.001;

    // 선 유니폼
    lU.uP.value = p;
    lU.uGlobeM.value.copy(logo.matrixWorld);
    lU.uGlobeC.value.setFromMatrixPosition(pivot.matrixWorld);
    lU.uS.value = pivot.scale.x;

    // CD 선택 이동 (드래그 중이 아니면 목표로 부드럽게)
    if (!dragging) selF += (sel - selF) * (reduceMotion ? 1 : ease(0.085));
    const R = R_CD();
    cds.forEach((cd, i) => {
      const o = wrapO(i - selF);
      const L = layout(o);
      const slot = Math.round(o) + 2;
      const fStart = 0.7 + (slot >= 0 && slot <= 4 ? SLOT_DELAY[slot] : 0.06);
      cd.uForm.value = smooth(fStart, 0.9, p);
      cd.g.visible = cd.uForm.value > 0.001 && Math.abs(o) < 3.2;
      const bob = reduceMotion ? 0 : Math.sin(t * 0.7 + cd.phase) * 0.05;
      const hv = cd.hover += ((hoverCd === i && interactive() ? 1 : 0) - cd.hover) * ease(0.12);
      tmpE.set(L.rx + cd.tilt[0] + hv * ptr.y * 0.12, L.ry + cd.tilt[1] + hv * ptr.x * 0.14, L.rz + cd.tilt[2]);
      tmpQ.setFromEuler(tmpE);
      tmpV.set(L.x, L.y + bob, L.z + hv * 0.15);
      // 두께는 선에서 원판이 되는 동안 얇은 막 → 실제 두께로
      cd.g.position.copy(tmpV); cd.g.quaternion.copy(tmpQ);
      cd.g.scale.set(R, R, R * (0.15 + 0.85 * smooth(0.2, 0.8, cd.uForm.value)));
      cd.face.material.envMapIntensity = 0.9 + hv * 0.5;
      // 재생 중인 CD는 천천히 돎
      const playing = window.Player && window.Player.state.playing && i === current() && cd.rel.trackId === window.Player.state.trackId;
      if (playing && !reduceMotion) cd.spin.rotation.z -= dt * 0.9;
      if (slot >= 0 && slot <= 4) cdM[slot].compose(tmpV, tmpQ, tmpS.set(R, R, R));
    });
    // 선이 모일 자리: CD가 없는 칸도 레이아웃 함수로 채움 (화면 밖)
    for (let k = 0; k < 5; k++) {
      const o = k - 2 + (Math.round(selF) - selF);
      if (!cds.some((cd, i) => Math.round(wrapO(i - selF)) + 2 === k)) { const L = layout(o); tmpE.set(L.rx, L.ry, L.rz); cdM[k].compose(tmpV.set(L.x, L.y, L.z), tmpQ.setFromEuler(tmpE), tmpS.set(R, R, R)); }
    }
    const cur = current();
    if (cur !== lastCur) { lastCur = cur; onSelect && onSelect(cur, RELS[cur]); }
    onProgress && onProgress(p, bg);
    if (onRing) {
      const rpx = (gU.uHoverR.value * pivot.scale.x / viewH) * H;
      onRing({ x: lastPX, y: lastPY, r: rpx, visible: hoverOn === 1 && p < 0.06 && finePointer && !reduceMotion });
    }
    canvas.style.cursor = interactive() ? (dragging ? 'grabbing' : hoverCd >= 0 ? 'pointer' : 'grab') : '';
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
