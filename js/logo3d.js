/* AOMG Concept Redesign — logo3d.js (ES module)
 * KODE 히어로의 3D 오브제를 AOMG 오브제(img/obj-bold.svg, 사용자 제공)로 재구성
 * - 드래그: 회전 (관성)
 * - 마우스를 올린 부분만 조각으로 깨짐 → 벗어나면 다시 모임 (KODE 히어로 방식)
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

/* ---------- 조각난 로고 지오메트리 ---------- */
function buildShardGeometry({ shapes, scale, cx, cy }, { depth = 0.34, cell = 0.22 }) {
  // SVG 좌표 그대로 입체화한 뒤 한 번에 정규화 (깊이·베벨은 SVG 단위로 환산)
  const k = 1 / scale;
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: depth * k, curveSegments: 12, bevelEnabled: true, bevelThickness: 0.06 * k, bevelSize: 0.03 * k, bevelSegments: 4,
  }); // ExtrudeGeometry는 이미 non-indexed
  geo.translate(-cx, -cy, 0);
  geo.scale(scale, scale, scale);
  geo.rotateX(Math.PI); // SVG y축(아래로 증가)을 위로 — 뒤집기(scale -1) 대신 회전이라 면 방향이 유지됨
  geo.computeBoundingBox();
  const c = new THREE.Vector3(); geo.boundingBox.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z);

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
  const tmp = new THREE.Vector3();
  clusters.forEach((tris) => {
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
        center.set([cc.x, cc.y, cc.z], i * 3);
        dir.set([d.x, d.y, d.z], i * 3);
        rand.set([axis.x, axis.y, axis.z, speed], i * 4);
      }
    });
  });
  geo.setAttribute('aCenter', new THREE.BufferAttribute(center, 3));
  geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
  geo.computeBoundingSphere();
  return geo;
}

function shatterMaterial(params, uniforms) {
  const mat = new THREE.MeshPhysicalMaterial(params);
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aCenter; attribute vec3 aDir; attribute vec4 aRand;
        uniform float uBeat; uniform float uTime; uniform vec3 uHover; uniform float uHoverAmt; uniform float uHoverR;
        mat3 rotAxis(vec3 a, float r) { a = normalize(a); float s = sin(r), c = cos(r), o = 1.0 - c;
          return mat3(o*a.x*a.x + c, o*a.x*a.y + a.z*s, o*a.z*a.x - a.y*s,
                      o*a.x*a.y - a.z*s, o*a.y*a.y + c, o*a.y*a.z + a.x*s,
                      o*a.z*a.x + a.y*s, o*a.y*a.z - a.x*s, o*a.z*a.z + c); }`)
      .replace('#include <beginnormal_vertex>', `
        // 커서 주변 조각만: 거리에 따라 0~1, 조각마다 세기가 다름
        float hd = distance(aCenter.xy, uHover.xy);
        float g = uHoverAmt * aRand.w;
        float hov = (1.0 - smoothstep(uHoverR * 0.2, uHoverR, hd)) * g;   // 커서 주변: 강하게
        float spread = 0.42 * g;                                          // 오브제 전체: 조각 사이가 벌어짐
        float jitter = uBeat * 0.06 * aRand.w;
        mat3 shardR = rotAxis(aRand.xyz, hov * 1.55 + spread * 0.75 + jitter * 2.0);   // 회전(깨짐) 약 60%
        vec3 objectNormal = shardR * vec3(normal);
        #ifdef USE_TANGENT
          vec3 objectTangent = shardR * vec3(tangent.xyz);
        #endif`)
      .replace('#include <begin_vertex>', `
        vec3 away = normalize(vec3(aCenter.xy - uHover.xy, 0.0) + vec3(0.0, 0.0, 0.5) + aDir * 0.35);
        // 오브제 전체가 화면 쪽으로 넓게 퍼짐: 중심에서 먼 조각일수록 멀리
        vec3 outward = vec3(aCenter.xy * (0.55 + 0.45 * aRand.w), aDir.z * 0.6);
        vec3 transformed = shardR * (position - aCenter) + aCenter + away * hov * 1.3 + outward * spread * 1.15 + aDir * (spread * 0.9 + jitter);`);
  };
  return mat;
}

/* ---------- 문장 텍스트 평면 (히어로) ---------- */
function drawStatementTexture(canvas, lines, w, h, bg, fg, area) {
  const ctx = canvas.getContext('2d');
  canvas.width = w; canvas.height = h;
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); } else ctx.clearRect(0, 0, w, h); // bg 없음 = 투명 (배경색이 바뀌는 장면용)
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

/* ---------- 푸터: 투명 유리 + 실버 빛 (히어로 전환의 빛나는 선과 같은 결) ----------
 * 몸체는 거의 투명, 가장자리(옆면·모서리)와 빛을 받는 면만 실버로 빛남. 반사는 가상의 스튜디오 조명 띠 */
function footerGlassMaterial(uniforms) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...uniforms },
    vertexShader: /* glsl */`
      attribute vec3 aCenter; attribute vec3 aDir; attribute vec4 aRand;
      uniform float uBeat;
      varying vec3 vN; varying vec3 vV; varying vec3 vObj; varying float vSide;
      void main() {
        vSide = 1.0 - abs(normal.z);
        float jitter = uBeat * 0.06 * aRand.w;
        vec3 tr = position + aDir * jitter;
        vec4 mv = modelViewMatrix * vec4(tr, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vObj = position;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vObj; varying float vSide;
      float h2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.y), f.y); }
      void main() {
        vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
        vec3 V = normalize(vV);
        float ndv = abs(dot(n, V));
        float dash = smoothstep(0.47, 0.53, vnoise(vObj.xy * 3.2 + vObj.z * 2.0));
        float fres = pow(1.0 - ndv, 8.0);
        vec3 R = reflect(-V, n);
        float top = pow(max(R.y, 0.0), 4.0);                                // 위에서 오는 넓은 빛
        float strip = smoothstep(0.86, 0.99, 0.5 + 0.5 * sin(R.x * 7.0 + R.y * 2.5 + vObj.x * 2.2 - vObj.y * 1.4 + uTime * 0.35));   // 비스듬한 조명 띠가 유리 위를 천천히 지나감
        float spec = pow(max(dot(n, normalize(vec3(-0.35, 0.55, 0.76) + V)), 0.0), 80.0);
        float glow = (fres * 2.8 + top * 0.12 + strip * 0.4 + spec * 1.7) * mix(1.0, 0.18, smoothstep(0.5, 0.9, vSide)) + fres * 2.0 * smoothstep(0.5, 0.9, vSide) * pow(1.0 - ndv, 6.0);   // 옆면(두께)은 거의 숨기고 가장자리 선만
        glow *= mix(1.0, dash, smoothstep(0.15, 0.5, 1.0 - ndv));   // 윤곽(옆면·모서리) 빛은 절반 정도만 — 군데군데 끊김
        vec3 col = vec3(0.9, 0.93, 1.0) * glow;
        col += vec3(0.06, -0.01, 0.08) * fres * sin(vObj.x * 6.0 + vObj.y * 4.0);   // 아주 옅은 색 번짐
        float a = clamp(0.025 + glow * 0.9, 0.0, 1.0);   // 몸체는 거의 투명
        gl_FragColor = vec4(col, a);
      }`,
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
  });
  return mat;
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
  const uniforms = { uBeat: { value: 0 }, uTime: { value: 0 }, uHover: { value: new THREE.Vector3(99, 99, 0) }, uHoverAmt: { value: 0 }, uHoverR: { value: 0.95 } };
  const useTransmission = mode === 'hero' && finePointer; // 모바일은 성능 때문에 굴절 끔
  const material = mode === 'hero' ? shatterMaterial({
    color: accent, metalness: 0.05, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05,
    transmission: useTransmission ? 0.92 : 0, thickness: 0.9, ior: 1.45, attenuationColor: accent, attenuationDistance: 0.8,
    envMapIntensity: 1.4, side: THREE.DoubleSide,
  }, uniforms) : footerGlassMaterial(uniforms);   // 푸터: 투명 유리 + 실버 빛

  const logo = new THREE.Mesh(buildShardGeometry(svg, { cell: 0.3 /* KODE처럼 큼직한 조각 */ }), material);
  const pivot = new THREE.Group(); pivot.add(logo); scene.add(pivot);

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
  // 커서 위치 → 오브제 로컬 좌표의 중앙 평면(z=0)과의 교점 = 깨질 지점
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
    // 깨질 지점은 커서를 부드럽게 따라가고, 세기는 빠르게 켜지고 천천히 복원
    uniforms.uHover.value.lerp(hoverTarget, 0.22);
    const ha = uniforms.uHoverAmt.value;
    uniforms.uHoverAmt.value += (hoverOn - ha) * (hoverOn > ha ? 0.18 : 0.06);
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
      // 깨지는 반경(uHoverR, 오브제 로컬 단위) → 화면 px
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

// 히어로→NOW PLAYING 장면(sound3d.js)이 같은 오브제·재질·문장 그리기를 재사용
export { loadShapes, buildShardGeometry, shatterMaterial, drawStatementTexture };
