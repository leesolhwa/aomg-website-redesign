/* AOMG Concept Redesign — logo3d.js (ES module)
 * KODE 히어로의 3D 오브제를 AOMG 오브제(img/obj-bold.svg, 사용자 제공)로 재구성
 * - 드래그: 회전 (관성)
 * - 마우스를 올리면 그 지점에서 물결(파형)이 퍼져 오브제가 출렁임 → 벗어나면 잔잔해짐
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

/* 면 잘게 나누기: 압출 단면은 도형을 가로지르는 가늘고 긴 삼각형이라 그대로 휘면 각이 짐
 * → 가장 긴 변이 maxLen 이하가 될 때까지 반으로 나눠 물결이 매끈하게 지나가게 함 */
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

/* ---------- 오브제 지오메트리 ---------- */
function buildObjectGeometry({ shapes, scale, cx, cy }, { depth = 0.34 } = {}) {
  // SVG 좌표 그대로 입체화한 뒤 한 번에 정규화 (깊이·베벨은 SVG 단위로 환산)
  const k = 1 / scale;
  let geo = new THREE.ExtrudeGeometry(shapes, {
    depth: depth * k, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.06 * k, bevelSize: 0.03 * k, bevelSegments: 3,
  });
  geo.translate(-cx, -cy, 0);
  geo.scale(scale, scale, scale);
  geo.rotateX(Math.PI); // SVG y축(아래로 증가)을 위로
  geo.computeBoundingBox();
  const c = new THREE.Vector3(); geo.boundingBox.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z);
  geo = tessellate(geo, 0.09);
  geo.computeBoundingSphere();
  return geo;
}

function shatterMaterial(params, uniforms) {
  const mat = new THREE.MeshPhysicalMaterial(params);
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uBeat; uniform float uTime; uniform vec3 uHover; uniform float uHoverAmt; uniform float uHoverR;
        // 커서 지점에서 동심원 물결이 바깥으로 퍼짐 (가까울수록 크고 멀수록 잦아듦)
        const float WK = 8.5;    // 물결 촘촘함
        const float WS = 4.2;    // 퍼지는 속도
        const float FALL = 0.55; // 멀어질수록 잦아드는 정도
        float waveEnv(float d) { return uHoverAmt * exp(-d * FALL) * (1.0 + uBeat * 0.6); }`)
      .replace('#include <beginnormal_vertex>', `
        vec2 wv = position.xy - uHover.xy;
        float wd = length(wv) + 1e-4;
        vec2 wdir = wv / wd;
        float wph = wd * WK - uTime * WS;
        float wenv = waveEnv(wd);
        float wave = sin(wph) * wenv;
        // 면 기울기(법선)도 물결을 따라감 → 빛이 물결 모양으로 흐름
        float dwave = wenv * (WK * cos(wph) - FALL * sin(wph));
        vec2 grad = wdir * dwave * 0.26;
        vec3 objectNormal = normalize(vec3(normal) + vec3(-grad * normal.z, 0.0));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`)
      .replace('#include <begin_vertex>', `
        // 앞뒤로 출렁이고(z), 물결 마루마다 바깥으로 살짝 밀려 퍼짐(xy)
        vec3 transformed = vec3(position);
        transformed.z += wave * 0.26;
        transformed.xy += wdir * (wave * 0.05 + wenv * 0.1);`);
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

  const svg = await loadShapes();
  const accent = new THREE.Color(css('--color-accent') || '#FF3B1F');
  const uniforms = { uBeat: { value: 0 }, uTime: { value: 0 }, uHover: { value: new THREE.Vector3(99, 99, 0) }, uHoverAmt: { value: 0 }, uHoverR: { value: 1.1 } };
  const deepRed = accent.clone().lerp(new THREE.Color('#9e0d06'), 0.45);
  const useTransmission = mode === 'hero' && finePointer; // 모바일은 성능 때문에 굴절 끔
  const material = shatterMaterial(mode === 'hero' ? {
    // 유리 느낌은 유지하되 배경 주황이 덜 비치도록: 투과를 낮추고 색·흡수를 깊은 빨강으로
    color: deepRed, metalness: 0.05, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05,
    transmission: useTransmission ? 0.6 : 0, thickness: 1.2, ior: 1.5, attenuationColor: deepRed, attenuationDistance: 0.35,
    envMapIntensity: 1.3, side: THREE.DoubleSide,
  } : {
    // 푸터: 검정 배경에서 잘 보이는 밝은 실버(크롬)
    color: 0xffffff, metalness: 1, roughness: 0.14, envMapIntensity: 2.4,
  }, uniforms);

  const logo = new THREE.Mesh(buildObjectGeometry(svg), material);
  const pivot = new THREE.Group(); pivot.add(logo); scene.add(pivot);
  if (mode === 'footer') { // 실버 하이라이트: 위 왼쪽 주광 + 오른쪽 뒤 테두리광
    const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(-4, 5, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 2.2); rim.position.set(5, -2, -3); scene.add(rim);
  }

  // 문장 평면 (히어로만): 같은 장면에 있어야 유리 굴절에 비침
  let plane = null, textCanvas = null;
  if (mode === 'hero' && statement) {
    textCanvas = document.createElement('canvas');
    const tex = new THREE.CanvasTexture(textCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
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
  // 커서 위치 → 오브제 로컬 좌표의 중앙 평면(z=0)과의 교점 = 물결이 시작되는 지점
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), localRay = new THREE.Ray();
  const hoverPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3(), inv = new THREE.Matrix4();
  const hoverTarget = new THREE.Vector3(99, 99, 0);
  let hoverOn = 0, lastPX = 0, lastPY = 0;
  function updateHover(e) {
    if (reduceMotion) return;
    const r = canvas.getBoundingClientRect();
    lastPX = e.clientX - r.left; lastPY = e.clientY - r.top;
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    inv.copy(logo.matrixWorld).invert();
    localRay.copy(raycaster.ray).applyMatrix4(inv);
    if (localRay.intersectPlane(hoverPlane, hit) && Math.hypot(hit.x, hit.y) < 1.9) {
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
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }, { threshold: 0 });
  io.observe(canvas);
  function loop(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    uniforms.uTime.value += dt;
    // 물결 중심은 커서를 부드럽게 따라가고, 세기는 약 0.5초에 차오르고 약 1초에 걸쳐 잦아듦
    uniforms.uHover.value.lerp(hoverTarget, 0.22);
    const ha = uniforms.uHoverAmt.value;
    const ease = (k) => 1 - Math.pow(1 - k, dt * 60);
    uniforms.uHoverAmt.value += (hoverOn - ha) * ease(hoverOn > ha ? 0.08 : 0.045);
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
    if (onRing) {
      // 물결이 크게 이는 반경(uHoverR, 오브제 로컬 단위) → 화면 px
      const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      const rpx = (uniforms.uHoverR.value * pivot.scale.x / viewH) * canvas.clientHeight;
      onRing({ x: lastPX, y: lastPY, r: rpx, visible: hoverOn === 1 && finePointer && !reduceMotion });
    }
    // 인트로가 화면을 덮고 있는 동안은 그리지 않음 (보이지 않는 프레임에 GPU를 쓰지 않게)
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
