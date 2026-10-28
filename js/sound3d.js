/* AOMG Concept Redesign — sound3d.js (ES module)
 * FROM IDENTITY TO SOUND: 히어로 지구본 → 깨진 자리에서 유리 금이 퍼짐 → 금이 파형처럼 대각선을 가로지름 → CD 자리마다 원형 균열 → CD 5장 → 스크롤로 CD 넘기기
 * - 모든 형태는 스크롤 진행도 p(0~1)의 함수 → 위로 스크롤하면 그대로 되돌아감
 * - p는 섹션 고정(sticky) + 스크롤 위치로 계산하고 부드럽게 따라감 (Pinning + Scrub)
 * - 단계: 01 Hero 0–8% · 02 깨지며 금이 퍼짐 8–18% · 03 대각선 금 파형 18–34% · 04 원형 균열 → CD 윤곽 34–48% · 05 원판 48–58%
 *         06 CD 5장 58–60% · 07 스크롤로 CD 넘기기 60–96% (내리면 CD 줄이 위로) · 08 다음 섹션
 */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

// logo3d.js는 푸터가 같은 버전(?v=)으로 불러오므로 같은 주소로 받아 한 번만 로드되게 함
const L3 = await import(new URL('./logo3d.js' + new URL(import.meta.url).search, import.meta.url).href);
const { createCracks } = await import(new URL('./cracks.js' + new URL(import.meta.url).search, import.meta.url).href);

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

/* ---------- 히어로 유리 (완전 투명, 볼드) ----------
 * 배경(색 + 문장)을 먼저 화면 크기 텍스처로 그리고, 유리 면의 법선만큼 어긋나게 읽어 굴절을 흉내 냄 → 뒤 문장이 크게 일그러짐.
 * 색은 넣지 않고, 빛 받는 면·얇은 가장자리만 흰색/실버. 깨진 상태에서는 파편 경계선을 절반 정도만, 얇게. */
const GLASS_VS = /* glsl */`
  uniform float uBeat; uniform float uHoverAmt; uniform float uHoverR; uniform vec3 uHover;
  attribute vec3 aCenter; attribute vec3 aDir; attribute vec4 aRand; attribute vec3 aBary; attribute vec3 aEdge;
  varying vec3 vN; varying vec4 vClip; varying vec3 vObj; varying vec3 vBary; varying vec3 vEdge; varying float vBreak; varying float vKeep;
  mat3 rotAxis(vec3 a, float r) { a = normalize(a); float s = sin(r), c = cos(r), o = 1.0 - c;
    return mat3(o*a.x*a.x + c, o*a.x*a.y + a.z*s, o*a.z*a.x - a.y*s, o*a.x*a.y - a.z*s, o*a.y*a.y + c, o*a.y*a.z + a.x*s,
                o*a.z*a.x + a.y*s, o*a.y*a.z - a.x*s, o*a.z*a.z + c); }
  void main() {
    float hd = distance(aCenter.xy, uHover.xy);
    float g = uHoverAmt * aRand.w;
    float hov = (1.0 - smoothstep(uHoverR * 0.2, uHoverR, hd)) * g;
    float spread = 0.42 * g, jitter = uBeat * 0.06 * aRand.w;
    mat3 R = rotAxis(aRand.xyz, hov * 1.55 + spread * 0.75 + jitter * 2.0);
    // 커서 기준 좌우로 쫙 벌어짐 (가운데가 열려 뒤 문장이 드러남)
    vec3 wide = vec3(sign(aCenter.x - uHover.x + 1e-4) * (1.2 + abs(aCenter.x) * 0.9), (aCenter.y - uHover.y) * 0.35, aDir.z * 0.4);
    vec3 outward = vec3(aCenter.xy * (0.55 + 0.45 * aRand.w), aDir.z * 0.6);
    vec3 tr = R * (position - aCenter) + aCenter + wide * hov * 1.6 + outward * spread * 1.15 + aDir * (spread * 0.9 + jitter);
    vN = normalize(normalMatrix * (R * normal));
    vObj = position; vBary = aBary; vEdge = aEdge; vBreak = clamp(g * 2.5, 0.0, 1.0);
    vKeep = step(0.3, fract(aRand.x * 43.758 + aRand.y * 12.9 + aRand.z * 7.1));   // 파편의 약 70%
    gl_Position = projectionMatrix * modelViewMatrix * vec4(tr, 1.0); vClip = gl_Position;
  }`;
const GLASS_FS = /* glsl */`
  uniform sampler2D uBg; uniform float uK; uniform float uAspect; uniform float uOpacity; uniform vec3 uL;
  varying vec3 vN; varying vec4 vClip; varying vec3 vObj; varying vec3 vBary; varying vec3 vEdge; varying float vBreak; varying float vKeep;
  float h2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 uv = vClip.xy / vClip.w * 0.5 + 0.5;
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec2 wob = vec2(sin(vObj.y * 3.0 + vObj.x * 2.0), cos(vObj.x * 2.6 - vObj.y * 2.2)) * 0.32
             + vec2(sin(vObj.y * 7.0 - vObj.x * 5.0), cos(vObj.x * 6.0 + vObj.y * 4.0)) * 0.1;   // 유리 표면의 완만한 굴곡 (액체처럼 휨)
    vec2 off = (n.xy + wob) * uK;
    vec3 refr = texture2D(uBg, uv - vec2(off.x / uAspect, off.y)).rgb;
    float fres = pow(1.0 - abs(n.z), 4.0);
    float spec = pow(max(dot(n, normalize(uL + vec3(0.0, 0.0, 1.0))), 0.0), 60.0) * 1.6;
    vec3 col = refr * 0.92 + fres * 0.25 + spec;
    // 파편 경계선: 깨졌을 때만, 파편의 일부·길이의 절반 정도만, 1px 안팎
    vec3 fw = fwidth(vBary) * 0.9;
    vec3 eb = 1.0 - smoothstep(vec3(0.0), fw, vBary);
    float edge = max(max(eb.x * vEdge.x, eb.y * vEdge.y), eb.z * vEdge.z);
    float dash = step(0.3, h2(floor(vObj.xy * 11.0)));
    col += edge * vBreak * vKeep * dash * (0.7 + spec);
    gl_FragColor = vec4(col, uOpacity);
  }`;
function glassMaterial(U) {
  return new THREE.ShaderMaterial({ uniforms: U, vertexShader: GLASS_VS, fragmentShader: GLASS_FS, side: THREE.DoubleSide, transparent: true, depthWrite: false, extensions: { derivatives: true } });
}
/* 파편 경계(다른 파편과 맞닿는 삼각형 변)를 표시: 꼭짓점마다 무게중심 좌표 + 변마다 경계 여부 */
function addShardEdges(geo) {
  const pos = geo.attributes.position, cen = geo.attributes.aCenter, n = pos.count, T = n / 3;
  const bary = new Float32Array(n * 3), flag = new Float32Array(n * 3);
  const q = (v) => Math.round(v * 2000);
  const vk = (i) => `${q(pos.getX(i))},${q(pos.getY(i))},${q(pos.getZ(i))}`;
  const ck = (t) => `${q(cen.getX(t * 3))},${q(cen.getY(t * 3))}`;
  const keys = new Array(T * 3), edges = new Map();
  for (let t = 0; t < T; t++) {
    const c = ck(t);
    for (let k = 0; k < 3; k++) {
      const a = vk(t * 3 + ((k + 1) % 3)), b = vk(t * 3 + ((k + 2) % 3));
      const key = a < b ? a + '|' + b : b + '|' + a; keys[t * 3 + k] = key;
      const e = edges.get(key); if (e) e.push(c); else edges.set(key, [c]);
    }
  }
  for (let t = 0; t < T; t++) {
    const c = ck(t), f = [0, 0, 0];
    for (let k = 0; k < 3; k++) f[k] = edges.get(keys[t * 3 + k]).some((x) => x !== c) ? 1 : 0;
    for (let k = 0; k < 3; k++) { bary[(t * 3 + k) * 3 + k] = 1; flag.set(f, (t * 3 + k) * 3); }
  }
  geo.setAttribute('aBary', new THREE.BufferAttribute(bary, 3));
  geo.setAttribute('aEdge', new THREE.BufferAttribute(flag, 3));
}

/* ---------- CD 뒷면 (실버) ----------
 * 방사형으로 번지는 흰 빛줄기(트랙 결에 비친 빛) + 미세한 트랙 결 + 투명 테두리 + 허브 링.
 * 빛줄기 방향은 빛·시선 방향을 원판 면에 투영해서 정함 → CD를 돌리면 빛줄기가 따라 돎 */
const BACK_VS = /* glsl */`
  varying vec2 vXY; varying vec3 vWP; varying vec3 vX; varying vec3 vY;
  void main() {
    vXY = position.xy;
    vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz;
    vX = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0)); vY = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const BACK_FS = /* glsl */`
  uniform float uForm; uniform vec3 uL;
  varying vec2 vXY; varying vec3 vWP; varying vec3 vX; varying vec3 vY;
  float h1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
  float ad(float a, float b) { float d = mod(a - b + 3.14159265, 6.2831853) - 3.14159265; return d; }
  void main() {
    float r = length(vXY);
    if (r < 1.0 - uForm * 1.04) discard;
    float th = atan(vXY.y, vXY.x);
    vec3 V = normalize(cameraPosition - vWP), H = normalize(normalize(uL) + V);
    float a1 = atan(dot(H, vY), dot(H, vX));
    float b = 0.0;
    b = max(b, 1.0 * exp(-pow(ad(th, a1) / 0.30, 2.0)));
    b = max(b, 0.95 * exp(-pow(ad(th, a1 + 3.14159) / 0.30, 2.0)));
    b = max(b, 0.55 * exp(-pow(ad(th, a1 + 0.9) / 0.18, 2.0)));
    b = max(b, 0.5 * exp(-pow(ad(th, a1 + 4.04) / 0.18, 2.0)));
    b = max(b, 0.4 * exp(-pow(ad(th, a1 - 0.8) / 0.22, 2.0)));
    b = max(b, 0.38 * exp(-pow(ad(th, a1 + 2.34) / 0.22, 2.0)));
    float streak = 0.75 + 0.5 * h1(floor((th + 3.14159) / 6.2831853 * 720.0));
    float tracks = 0.92 + 0.08 * sin(r * 380.0);
    vec3 col = vec3(0.97, 0.98, 1.0) * (0.10 + 0.95 * b * streak) * tracks;
    if (r < 0.36) col = vec3(0.02);                                    // 투명 허브
    if (r > 0.965) col = vec3(0.12);                                   // 투명 테두리
    float lit = 0.5 + 0.5 * abs(cos(th - a1 + 0.6));
    col += vec3(exp(-pow((r - 0.993) / 0.006, 2.0)) * (0.6 + 0.4 * lit) + exp(-pow((r - 0.965) / 0.004, 2.0)) * 0.35);
    float hub = exp(-pow((r - 0.36) / 0.006, 2.0)) * 0.35 + exp(-pow((r - 0.33) / 0.004, 2.0)) * 0.25 + exp(-pow((r - 0.26) / 0.005, 2.0)) * 0.8
              + exp(-pow((r - 0.24) / 0.003, 2.0)) * 0.3 + exp(-pow((r - 0.17) / 0.006, 2.0)) * 0.9;
    col += vec3(hub * (0.5 + 0.5 * abs(cos(th - a1 + 0.4))));
    gl_FragColor = vec4(col, 1.0);
  }`;
const BACK_LIGHT = new THREE.Vector3(0.35, 0.85, 0.6).normalize();
function backMaterial(uForm) {
  return new THREE.ShaderMaterial({ uniforms: { uForm, uL: { value: BACK_LIGHT } }, vertexShader: BACK_VS, fragmentShader: BACK_FS });
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
  const bgColor = BG[0].clone();
  scene.background = bgColor;

  /* --- 01 지구본 (기존 히어로와 같은 모양·재질·마우스 깨짐). 02에서 면이 투명해지며 사라짐 --- */
  const svg = await L3.loadShapes();
  const accent = new THREE.Color(css('--color-accent') || '#FF3B1F');
  const U = {
    uP: { value: 0 }, uTime: { value: 0 }, uBeat: { value: 0 }, uGlobeM: { value: new THREE.Matrix4() }, uS: { value: 1 }, uGlobeC: { value: new THREE.Vector3() },
    uHover: { value: new THREE.Vector3(99, 99, 0) }, uHoverAmt: { value: 0 }, uHoverR: { value: 0.95 },
  };
  const cdM = Array.from({ length: 5 }, () => new THREE.Matrix4());   // 형성 단계 CD 자리 5칸 (왼쪽 아래 → 오른쪽 위)
  // 배경(색 + 문장)을 먼저 그려 두는 텍스처 → 유리가 이걸 어긋나게 읽어 굴절
  const bgRT = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false });
  bgRT.texture.colorSpace = THREE.SRGBColorSpace;
  Object.assign(U, { uBg: { value: bgRT.texture }, uK: { value: 0.2 }, uAspect: { value: 1.6 }, uOpacity: { value: 1 }, uL: { value: new THREE.Vector3(-0.35, 0.5, 0.79).normalize() } });
  const gMat = glassMaterial(U);
  const gGeo = L3.buildShardGeometry(svg, { cell: 0.3 });
  addShardEdges(gGeo);
  gGeo.computeBoundingBox();
  const bbox = gGeo.boundingBox.clone();
  const logo = new THREE.Mesh(gGeo, gMat);
  const pivot = new THREE.Group(); pivot.add(logo); scene.add(pivot);
  const logoRef = logo;

  /* --- 02~05 유리 금 --- */
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const SLOTS = finePointer || window.innerWidth >= 768 ? [0, 1, 2, 3, 4] : [1, 2, 3];   // 모바일은 CD 3장
  const cracks = createCracks({ lite, dpr });
  scene.add(cracks.group);
  // 빛을 받을 파편 몇 개 (빛의 선이 시작되는 자리): 파편 중심·방향·무작위값을 셰이더와 같은 식으로 움직임
  const SHARDS = (() => {
    const c = gGeo.attributes.aCenter, d = gGeo.attributes.aDir, r = gGeo.attributes.aRand, seen = new Map();
    for (let i = 0; i < c.count; i += 3) {
      const key = `${c.getX(i).toFixed(3)},${c.getY(i).toFixed(3)}`;
      if (!seen.has(key) && c.getZ(i) > -0.05) seen.set(key, { c: new THREE.Vector3(c.getX(i), c.getY(i), c.getZ(i)), d: new THREE.Vector3(d.getX(i), d.getY(i), d.getZ(i)), w: r.getW(i) });
    }
    const all = [...seen.values()];
    const out = []; const n = lite ? 24 : 36;
    for (let i = 0; i < n && all.length; i++) out.push(all.splice(Math.floor(rnd() * all.length), 1)[0]);
    return out;
  })();
  const sparkV = new THREE.Vector3(), sparks = SHARDS.map(() => ({ x: 0, y: 0, z: 0, k: 0 }));
  function updateSparks() {
    const hv = U.uHover.value, amt = Math.min(U.uHoverAmt.value, 0.45), HR = U.uHoverR.value, k = smooth(0.085, 0.12, p);   // 선 시작점은 지구본 근처에 머물게
    SHARDS.forEach((s, i) => {
      const g = amt * s.w, hd = Math.hypot(s.c.x - hv.x, s.c.y - hv.y);
      const hov = (1 - smooth(HR * 0.2, HR, hd)) * g, spread = 0.42 * g;
      const sx = Math.sign(s.c.x - hv.x + 1e-4) * (1.2 + Math.abs(s.c.x) * 0.9);
      sparkV.set(s.c.x + sx * hov * 1.6 + s.c.x * (0.55 + 0.45 * s.w) * spread * 1.15 + s.d.x * spread * 0.9,
        s.c.y + (s.c.y - hv.y) * 0.35 * hov * 1.6 + s.c.y * (0.55 + 0.45 * s.w) * spread * 1.15 + s.d.y * spread * 0.9,
        s.c.z + s.d.z * 0.4 * hov * 1.6 + s.d.z * 0.6 * spread * 1.15 + s.d.z * spread * 0.9).applyMatrix4(logo.matrixWorld);
      Object.assign(sparks[i], { x: sparkV.x, y: sparkV.y, z: sparkV.z, k });
    });
  }

  // 문장 평면 + 배경색 판: 따로 그려 bgRT에 담고, 본 장면은 그 텍스처를 배경으로 씀 (유리는 굴절해서 읽음)
  const bgScene = new THREE.Scene();
  const textCanvas = document.createElement('canvas');
  const tTex = new THREE.CanvasTexture(textCanvas); tTex.colorSpace = THREE.SRGBColorSpace;
  const bgPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: BG[0].clone(), toneMapped: false, depthWrite: false }));
  bgPlane.position.z = -2.6; bgScene.add(bgPlane);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tTex, transparent: true, toneMapped: false, depthWrite: false }));
  plane.position.z = -2.5; bgScene.add(plane);

  /* --- CD 9장 (발매 기록) --- */
  const RELS = typeof RELEASES !== 'undefined' ? RELEASES : [];
  const ARTS = typeof ARTISTS !== 'undefined' ? ARTISTS : [];
  const NC = RELS.length;
  const HOLE = 0.125, THICK = 0.035;
  const bodyGeo = cdBodyGeometry(HOLE, THICK);
  const faceGeo = new THREE.RingGeometry(HUB_N, 0.985, 128, 1); faceGeo.translate(0, 0, THICK / 2 + 0.0015);
  const hubGeo = new THREE.RingGeometry(HOLE, HUB_N, 96, 1); hubGeo.translate(0, 0, THICK / 2 + 0.001);
  // 뒷면 = 실버 데이터면 (돌렸을 때 보이는 면): 방사형 빛줄기 + 테두리 글린트
  const backGeo = new THREE.RingGeometry(HOLE + 0.02, 0.999, 128, 1); backGeo.rotateY(Math.PI); backGeo.translate(0, 0, -THICK / 2 - 0.0015);
  const cds = await Promise.all(RELS.map(async (rel, i) => {
    const uForm = { value: 0 };
    const tex = await makeCdTexture(rel, ARTS.find((a) => a.id === rel.artistId));
    const face = new THREE.Mesh(faceGeo, revealMaterial(new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.38, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.9 }), uForm));
    const body = new THREE.Mesh(bodyGeo, revealMaterial(new THREE.MeshPhysicalMaterial({ color: 0xd9d9d9, metalness: 1, roughness: 0.22, iridescence: 0.7, iridescenceIOR: 1.6, envMapIntensity: 1.3 }), uForm));
    const hub = new THREE.Mesh(hubGeo, revealMaterial(new THREE.MeshPhysicalMaterial({ color: 0x6f757b, metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.6, envMapIntensity: 1.1 }), uForm));
    const back = new THREE.Mesh(backGeo, backMaterial(uForm));
    back.userData.cd = i;
    const spin = new THREE.Group(); spin.add(body, face, hub, back);
    const g = new THREE.Group(); g.add(spin); scene.add(g);
    face.userData.cd = i; body.userData.cd = i; hub.userData.cd = i;
    return { rel, g, spin, face, body, hub, back, uForm, hover: 0, user: new THREE.Quaternion(), vel: new THREE.Vector2(), tilt: [(rnd() - 0.5) * 0.16, (rnd() - 0.5) * 0.16, (rnd() - 0.5) * 0.12], phase: rnd() * 6.28 };
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
    const ph2 = 2 * TAN * (CAM_Z - bgPlane.position.z); bgPlane.scale.set(ph2 * aspect * 1.02, ph2 * 1.02, 1);
    bgRT.setSize(Math.round(W * dpr), Math.round(H * dpr));
    U.uAspect.value = aspect;
    L3.drawStatementTexture(textCanvas, statement, Math.round(W * dpr), Math.round(H * dpr), null, css('--color-text-on-accent'), a && { top: a.top * dpr, bottom: a.bottom * dpr });
    tTex.needsUpdate = true;
    cracks.resize(W, H, viewW, viewH);
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
  const bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3(), bp = new THREE.Vector3(), vv = new THREE.Vector3(), hh = new THREE.Vector3(), wp = new THREE.Vector3();
  function loop(now) {
    raf = 0;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
    const ease = (k) => 1 - Math.pow(1 - k, dt * 60);
    p += (pTarget - p) * (reduceMotion ? 1 : ease(0.1)); if (Math.abs(pTarget - p) < 1e-4) p = pTarget;

    // 배경: 레드 → 다크 레드(20%) → 거의 검정(30%) → 완전한 검정(36%)
    const bg = p < 0.2 ? mixc(BG[0], BG[1], smooth(0.1, 0.2, p)) : p < 0.3 ? mixc(BG[1], BG[2], smooth(0.2, 0.3, p)) : mixc(BG[2], BG[3], smooth(0.3, 0.36, p));
    bgColor.copy(bg);

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
    U.uP.value = p;
    U.uGlobeC.value.setFromMatrixPosition(pivot.matrixWorld);
    const beat = parseFloat(css('--beat')) || 0; U.uBeat.value += (beat - U.uBeat.value) * 0.3;
    // 02: 스크롤하면 지구본 전체가 깨지며(마우스 깨짐과 같은 효과를 가운데서 크게) 사라짐
    const brk = smooth(0.065, 0.13, p);
    if (brk > 0) { U.uHover.value.lerp(tmpV.set(0, 0, 0), brk); U.uHoverAmt.value = Math.max(U.uHoverAmt.value, brk); }
    U.uHoverR.value = 0.95 + brk * 2.6;
    U.uOpacity.value = 1 - smooth(0.09, 0.15, p);
    logo.visible = U.uOpacity.value > 0.002;
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
      }
    });
    // CD 뒷면이 보이면 빛줄기가 테두리에 닿는 자리에 작은 글린트 (셰이더와 같은 계산)
    const rim = [];
    if (p > 0.56) {
      cds.forEach((cd) => {
        if (!cd.g.visible || rim.length >= 12) return;
        const m = cd.back.matrixWorld.elements;
        bx.set(m[0], m[1], m[2]).normalize(); by.set(m[4], m[5], m[6]).normalize(); bz.set(m[8], m[9], m[10]).normalize();
        bp.setFromMatrixPosition(cd.back.matrixWorld);
        vv.copy(camera.position).sub(bp).normalize();
        const facing = smooth(0.12, 0.45, -vv.dot(bz));   // 뒷면 법선 = 원판 정면의 반대
        if (facing <= 0) return;
        hh.copy(BACK_LIGHT).add(vv).normalize();
        const a1 = Math.atan2(hh.dot(by), hh.dot(bx));
        let best = null;
        [a1, a1 + Math.PI].forEach((a) => { wp.set(Math.cos(a) * 0.995, Math.sin(a) * 0.995, -THICK / 2 - 0.003).applyMatrix4(cd.back.matrixWorld); if (!best || wp.y > best.y) best = wp.clone(); });
        rim.push({ x: best.x, y: best.y, z: best.z, k: facing * 1.3 * smooth(0.56, 0.6, p), sz: (mobile ? 100 : 170) * cd.g.scale.x / R });
      });
    }
    if (p < 0.34) { logo.updateMatrixWorld(); updateSparks(); }
    cracks.update({ p, t, cdM, slots: SLOTS, amp: mobile ? 0.42 : 1.3, rim, sparks });
    const cur = api.index;
    if (cur !== lastCur) { lastCur = cur; onSelect && onSelect(cur, RELS[cur], { first: Math.round(selF) <= 0, last: Math.round(selF) >= NC - 1 }); }
    onProgress && onProgress(p, bg);
    if (onRing) {
      const rpx = (U.uHoverR.value * pivot.scale.x / viewH) * H;
      onRing({ x: lastPX, y: lastPY, r: rpx, visible: hoverOn === 1 && p < 0.06 && finePointer && !reduceMotion });
    }
    canvas.style.cursor = interactive() ? (dragCd >= 0 ? 'grabbing' : hoverCd >= 0 ? 'grab' : '') : '';
    if (!document.documentElement.classList.contains('is-intro')) {
      // 문장이 보이는 동안: 배경(색 + 문장)을 텍스처로 그리고, 본 장면 배경으로 씀
      if (plane.visible) {
        bgPlane.material.color.copy(bgColor);
        renderer.setRenderTarget(bgRT); renderer.render(bgScene, camera); renderer.setRenderTarget(null);
        scene.background = bgRT.texture;
      } else scene.background = bgColor;
      renderer.render(scene, camera);
    }
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
