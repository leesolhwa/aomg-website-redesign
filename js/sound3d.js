/* AOMG Concept Redesign — sound3d.js (ES module)
 * FROM IDENTITY TO SOUND: 히어로 지구본 → 윤곽이 선 조각으로 풀림 → 가운데서 사방으로 퍼짐 → 다시 모여 CD 5장 → 스크롤로 CD 넘기기
 * - 모든 형태는 스크롤 진행도 p(0~1)의 함수 → 위로 스크롤하면 그대로 되돌아감
 * - p는 섹션 고정(sticky) + 스크롤 위치로 계산하고 부드럽게 따라감 (Pinning + Scrub)
 * - 단계: 01 Hero 0–8% · 02 선으로 풀림 8–20% · 03 사방으로 퍼짐 20–34% · 04 모여서 CD 34–48% · 05 원판 48–58%
 *         06 CD 5장 58–60% · 07 스크롤로 CD 넘기기 60–96% (내리면 CD 줄이 위로) · 08 다음 섹션
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

/* ---------- 지구본 윤곽 → 선 조각 ----------
 * 지구본 SVG의 윤곽(바깥 원·창)을 앞면·뒷면 두 겹으로 따서, 짧은 호·직선 조각(strand)으로 자름.
 * 조각 하나는 SUB개의 아주 짧은 직선으로 그려서 휘어진 모양을 유지. 좌표는 지구본 로컬 (폭 3.2, 가운데 0, y 위쪽) */
const SUB = 4;
function contourStrands({ shapes, scale, cx, cy }, geoBox, strandLen) {
  const c = new THREE.Vector3(); geoBox.getCenter(c);
  const zh = geoBox.max.z - c.z + 0.012; // 앞·뒷면 바로 바깥 (유리에 가려지지 않게)
  const loops = [];
  shapes.forEach((sh) => {
    const { shape, holes } = sh.extractPoints(24);
    [shape, ...holes].forEach((pts) => loops.push(pts.map((q) => new THREE.Vector2((q.x - cx) * scale - c.x, -(q.y - cy) * scale - c.y))));
  });
  const step = strandLen / SUB, strands = [];
  [zh, -zh].forEach((z) => loops.forEach((pts) => {
    const out = [pts[0].clone()]; let acc = 0;   // 같은 간격으로 다시 찍기
    for (let i = 1; i <= pts.length; i++) {
      const a = pts[i - 1], b = pts[i % pts.length]; const d = a.distanceTo(b); let t0 = 0;
      while (acc + d * (1 - t0) >= step) { t0 += (step - acc) / d; acc = 0; out.push(a.clone().lerp(b, t0)); }
      acc += d * (1 - t0);
    }
    for (let i = 0; i + SUB < out.length; i += SUB) strands.push({ pts: out.slice(i, i + SUB + 1), z });
  }));
  return strands;
}

/* 선 조각 셰이더: 지구본 위 → 윤곽에서 떨어져 나옴 → 가운데서 사방으로 퍼짐 → CD 자리의 원을 따라 늘어섬 */
const STRAND_VS = /* glsl */`
  uniform float uP; uniform float uTime; uniform mat4 uGlobeM; uniform float uS; uniform vec3 uGlobeC;
  uniform mat4 uCdM[5]; uniform float uCdR[5]; uniform float uHH; uniform float uAspect; uniform float uThick;
  attribute vec4 aA; attribute vec3 aAd; attribute vec4 aS; attribute vec4 aB; attribute vec4 aC; attribute vec4 aT; attribute vec3 aAx;
  varying float vShow; varying float vTone;
  float sm(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
  mat3 rotAxis(vec3 a, float r) { a = normalize(a); float s = sin(r), c = cos(r), o = 1.0 - c;
    return mat3(o*a.x*a.x + c, o*a.x*a.y + a.z*s, o*a.z*a.x - a.y*s, o*a.x*a.y - a.z*s, o*a.y*a.y + c, o*a.y*a.z + a.x*s,
                o*a.z*a.x + a.y*s, o*a.y*a.z - a.x*s, o*a.z*a.z + c); }
  vec3 sp(float fx, float fy, float z) { float k = (${CAM_Z.toFixed(1)} - z) / ${CAM_Z.toFixed(1)}; return vec3(fx * uHH * k * uAspect, fy * uHH * k, z); }
  void cdPick(int k, out mat4 M, out float R) {
    if (k == 0) { M = uCdM[0]; R = uCdR[0]; } else if (k == 1) { M = uCdM[1]; R = uCdR[1]; }
    else if (k == 2) { M = uCdM[2]; R = uCdR[2]; } else if (k == 3) { M = uCdM[3]; R = uCdR[3]; } else { M = uCdM[4]; R = uCdR[4]; }
  }
  void main() {
    float p = uP;
    mat3 G = mat3(uGlobeM) / uS;
    // 조각의 원래 모양 (조각 중심 기준 오프셋)
    vec3 off = aA.xyz - aS.xyz;
    vec3 Cg = (uGlobeM * vec4(aS.xyz, 1.0)).xyz;
    vec3 outv = normalize(Cg - uGlobeC + vec3(0.0, 0.0, 0.001));
    float tP = sm(0.11 + aT.x * 0.07, 0.2 + aT.x * 0.07, p);             // 윤곽에서 하나씩 떨어져 나옴
    float tB = sm(0.19 + aT.y * 0.05, 0.31 + aT.y * 0.04, p);            // 가운데서 사방으로 퍼짐
    float tC = sm(0.34 + aT.z, 0.46 + aT.z, p);                          // CD 자리로 모임
    mat3 Rf = rotAxis(aAx, (tP * 0.35 + tB * 1.1) * (aT.w * 2.0 - 1.0) * 2.0);
    vec3 drift = vec3(0.0, 1.0, 0.0) * (p - 0.31) * 0.25 * (aT.y - 0.5) * tB * (1.0 - tC);
    vec3 Ps = mix(Cg + outv * 0.32 * uS * tP, sp(aB.x, aB.y, aB.z), tB) + drift + Rf * (G * off) * uS;
    vec3 Ds = Rf * (G * aAd);
    float Ls = aA.w * uS;
    // CD 원 위의 자리: 이 짧은 직선 하나가 원의 한 마디가 됨
    mat4 M; float Rk; cdPick(int(aC.x + 0.5), M, Rk);
    float th = aC.z;
    vec3 Pc = (M * vec4(aC.y * cos(th), aC.y * sin(th), 0.03, 1.0)).xyz;
    vec3 Dc = normalize(mat3(M) * vec3(-sin(th), cos(th), 0.0));
    float Lc = aC.y * aC.w * Rk * 0.94;
    if (dot(Dc, Ds) < 0.0) Dc = -Dc;
    vec3 P = mix(Ps, Pc, tC) + vec3(0.0, 0.0, 0.5) * sin(3.14159 * tC);
    vec3 D = normalize(mix(Ds, Dc, tC) + vec3(1e-5));
    float L = mix(Ls, Lc, tC);
    float show = sm(0.07, 0.12, p) * (1.0 - sm(0.53, 0.6, p)) * step(0.5, aT.w + 1.0);
    vec3 up = abs(D.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 Y = normalize(cross(up, D)), Z = cross(D, Y);
    float w = uThick * show;
    vec3 world = P + D * position.x * L * 1.04 + Y * position.y * w + Z * position.z * w;
    vShow = show; vTone = sm(0.12, 0.3, p);
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }`;
const STRAND_FS = /* glsl */`
  uniform vec3 uCol0; uniform vec3 uCol1; varying float vShow; varying float vTone;
  void main() { if (vShow < 0.01) discard; gl_FragColor = vec4(mix(uCol0, uCol1, vTone), 1.0); }`;

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

  /* --- 01 지구본 (기존 히어로와 같은 모양·재질·마우스 깨짐). 02에서 면이 투명해지며 사라짐 --- */
  const svg = await L3.loadShapes();
  const accent = new THREE.Color(css('--color-accent') || '#FF3B1F');
  const U = {
    uP: { value: 0 }, uTime: { value: 0 }, uBeat: { value: 0 }, uGlobeM: { value: new THREE.Matrix4() }, uS: { value: 1 }, uGlobeC: { value: new THREE.Vector3() },
    uHover: { value: new THREE.Vector3(99, 99, 0) }, uHoverAmt: { value: 0 }, uHoverR: { value: 0.95 },
    uCdM: { value: Array.from({ length: 5 }, () => new THREE.Matrix4()) }, uCdR: { value: [1, 1, 1, 1, 1] },
    uHH: { value: TAN * CAM_Z }, uAspect: { value: 1.6 }, uThick: { value: lite ? 0.008 : 0.0058 },
    uCol0: { value: new THREE.Color('#ffe2dc') }, uCol1: { value: new THREE.Color('#e9edf2') },
  };
  const cdM = U.uCdM.value;
  const gMat = L3.shatterMaterial({
    color: accent, metalness: 0.05, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05,
    transmission: lite ? 0 : 0.92, thickness: 0.9, ior: 1.45, attenuationColor: accent, attenuationDistance: 0.8,
    envMapIntensity: 1.4, side: THREE.DoubleSide, transparent: true,
  }, U);
  const gGeo = L3.buildShardGeometry(svg, { cell: 0.3 });
  gGeo.computeBoundingBox();
  const bbox = gGeo.boundingBox.clone();
  const logo = new THREE.Mesh(gGeo, gMat);
  const pivot = new THREE.Group(); pivot.add(logo); scene.add(pivot);
  const logoRef = logo;

  /* --- 02~04 선 조각 --- */
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const strands = contourStrands(svg, bbox, lite ? 0.8 : 0.5);
  const NS = strands.length, NI = NS * SUB;
  // CD 칸 나누기: 가운데 30%, 양옆 21%, 바깥 14% (모바일 3장: 30·40·30). 각 CD 안에서는 테두리 → 구멍 → 트랙 순서의 동심원
  const SLOT_W = finePointer || window.innerWidth >= 768 ? [0.14, 0.21, 0.30, 0.21, 0.14] : [0, 0.3, 0.4, 0.3, 0];
  const SLOT_DELAY = [0.04, 0.02, 0, 0.02, 0.04];
  const RINGS = [{ r: 0.985, o: 0 }, { r: 0.13, o: 1 }, { r: 0.3, o: 1.5 }, { r: 0.45, o: 2 }, { r: 0.6, o: 2.4 }, { r: 0.75, o: 2.8 }, { r: 0.88, o: 3.2 }];
  const ringSum = RINGS.reduce((t, r) => t + r.r, 0);
  const order = strands.map((_, i) => i).sort((x, y) => strands[x].pts[0].x - strands[y].pts[0].x); // 왼쪽 조각은 왼쪽 아래 CD로
  const counts = SLOT_W.map((w) => Math.round(w * NS)); counts[2] += NS - counts.reduce((x, y) => x + y, 0);
  let at = 0;
  // 화면 기준 CD 칸 순서 (o = -2 … 2 → 왼쪽 아래 … 오른쪽 위)
  counts.forEach((n, k) => {
    let used = 0;
    RINGS.forEach((ring, ri) => {
      const m = ri === RINGS.length - 1 ? n - used : Math.max(Math.min(7, Math.floor(n / RINGS.length)), Math.round((n * ring.r) / ringSum)); // 안쪽 원도 최소 7조각 (각지지 않게)
      for (let j = 0; j < m && at < NS; j++, at++) strands[order[at]].ring = { k, r: ring.r, th: (j / Math.max(1, m)) * Math.PI * 2 + rnd() * 0.1, dth: (Math.PI * 2) / Math.max(1, m), delay: SLOT_DELAY[k] + ring.o * 0.008 };
      used += m;
    });
  });
  strands.forEach((st) => {
    const cxs = st.pts.reduce((t, q) => t + q.x, 0) / st.pts.length, cys = st.pts.reduce((t, q) => t + q.y, 0) / st.pts.length;
    st.c = [cxs, cys, st.z];
    const ang = Math.atan2(cys, cxs) + (rnd() - 0.5) * 0.5, dist = 0.25 + rnd() * 0.85;   // 가운데서 사방으로
    st.burst = [Math.cos(ang) * dist * 1.05, Math.sin(ang) * dist * 0.95, -2.5 + rnd() * 3.5];
    st.t = [clamp01(Math.hypot(cxs, cys) / 1.7 * 0.5 + rnd() * 0.5), rnd(), 0, rnd()];
    st.ax = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5];
    if (!st.ring) st.ring = { k: 2, r: 0.985, th: rnd() * 6.28, dth: 0.2, delay: 0 };
    st.t[2] = st.ring.delay + rnd() * 0.012;
  });
  const lineGeo = new THREE.InstancedBufferGeometry();
  const box = new THREE.BoxGeometry(1, 1, 1);
  lineGeo.index = box.index; lineGeo.setAttribute('position', box.attributes.position); lineGeo.instanceCount = NI;
  const A = new Float32Array(NI * 4), Ad = new Float32Array(NI * 3), S4 = new Float32Array(NI * 4), B4 = new Float32Array(NI * 4), C4 = new Float32Array(NI * 4), T4 = new Float32Array(NI * 4), AX = new Float32Array(NI * 3);
  strands.forEach((st, si) => {
    const sub = st.ring.dth / SUB;
    for (let j = 0; j < SUB; j++) {
      const i = si * SUB + j, a0 = st.pts[j], a1 = st.pts[j + 1];
      const dx = a1.x - a0.x, dy = a1.y - a0.y, len = Math.hypot(dx, dy) || 1e-4;
      A.set([(a0.x + a1.x) / 2, (a0.y + a1.y) / 2, st.z, len], i * 4); Ad.set([dx / len, dy / len, 0], i * 3);
      S4.set([...st.c, 0], i * 4); B4.set([...st.burst, 0], i * 4);
      C4.set([st.ring.k, st.ring.r, st.ring.th + (j + 0.5 - SUB / 2) * sub, sub], i * 4);
      T4.set(st.t, i * 4); AX.set(st.ax, i * 3);
    }
  });
  const ia = (arr, n) => new THREE.InstancedBufferAttribute(arr, n);
  lineGeo.setAttribute('aA', ia(A, 4)); lineGeo.setAttribute('aAd', ia(Ad, 3)); lineGeo.setAttribute('aS', ia(S4, 4)); lineGeo.setAttribute('aB', ia(B4, 4));
  lineGeo.setAttribute('aC', ia(C4, 4)); lineGeo.setAttribute('aT', ia(T4, 4)); lineGeo.setAttribute('aAx', ia(AX, 3));
  const lines = new THREE.Mesh(lineGeo, new THREE.ShaderMaterial({ uniforms: U, vertexShader: STRAND_VS, fragmentShader: STRAND_FS }));
  lines.frustumCulled = false; scene.add(lines);

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
    goTo(i) { const cur = baseIndex(); go(Math.round(cur + wrapO(i - cur))); }, // 화면 위치와 상관없이 그 앨범 번호로
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
    U.uGlobeM.value.copy(logo.matrixWorld); U.uS.value = pivot.scale.x; U.uP.value = p;
    U.uGlobeC.value.setFromMatrixPosition(pivot.matrixWorld);
    const beat = parseFloat(css('--beat')) || 0; U.uBeat.value += (beat - U.uBeat.value) * 0.3;
    // 02: 지구본 면이 서서히 투명해지며 사라지고 윤곽선만 남음
    gMat.opacity = 1 - smooth(0.08, 0.16, p);
    logo.visible = gMat.opacity > 0.002;
    gMat.depthWrite = gMat.opacity > 0.98;
    lines.visible = p > 0.06 && p < 0.61;
    plane.material.opacity = 1 - smooth(0.08, 0.2, p);
    plane.visible = plane.material.opacity > 0.001;

    // CD: 스크롤 위치 = 가운데 CD (내리면 CD 줄이 오른쪽 위로, 다음 CD가 왼쪽 아래에서)
    const selF = selFromP(p), R = R_CD();
    const sel0 = 0;                                                    // 형성 단계의 가운데 CD (OXY_GEN)
    cds.forEach((cd, i) => {
      const o = wrapO(selF - i);          // 내리면 CD 줄이 오른쪽 위로, 다음 CD는 왼쪽 아래에서
      const L = layout(o);
      const slot = Math.round(wrapO(sel0 - i)) + 2;
      const formSlot = slot >= 0 && slot <= 4 ? slot : -1;
      const dk = formSlot === 2 ? 0 : (formSlot === 1 || formSlot === 3) ? 0.025 : 0.05;
      cd.uForm.value = formSlot >= 0 ? smooth(0.46 + dk, 0.57 + dk * 0.5, p) : smooth(0.56, 0.6, p);
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
        U.uCdR.value[formSlot] = R * L0.s;
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
