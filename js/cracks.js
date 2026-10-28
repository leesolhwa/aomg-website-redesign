/* AOMG Concept Redesign — cracks.js (ES module)
 * 02~05 전환: 깨진 지구본 자리에서 유리 금(크랙)이 퍼짐 → 세 줄기 금이 파형처럼 출렁이며 CD 줄 대각선을 가로지름
 *            → 금이 지나간 CD 자리마다 원형으로 갈라짐(동심원) → 원판이 차오르며 사라짐
 * - 금은 화면 기준 1~2px 두께의 얇은 선 (InstancedBufferGeometry, 화면 공간에서 폭을 줌)
 * - 반짝임: 금 전체가 고르게 밝지 않고 빛을 받는 구간만 번쩍 (스크롤에 따라 금을 따라 흐름) + 십자 글린트
 * - 모든 모양은 진행도 p의 함수 → 위로 스크롤하면 그대로 되돌아감
 */
import * as THREE from 'three';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const wrapA = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };

const LINE_VS = /* glsl */`
  uniform vec2 uRes; uniform float uW; uniform float uP; uniform float uT;
  attribute vec4 aP0; attribute vec4 aP1; attribute vec3 aInfo;   // aInfo: 밝기, 금 위의 위치, 고유값
  varying float vA; varying float vY; varying float vK;
  void main() {
    vec4 c0 = projectionMatrix * viewMatrix * vec4(aP0.xyz, 1.0);
    vec4 c1 = projectionMatrix * viewMatrix * vec4(aP1.xyz, 1.0);
    vec2 s0 = c0.xy / c0.w * uRes * 0.5, s1 = c1.xy / c1.w * uRes * 0.5;
    vec2 d = s1 - s0; float l = length(d); d = l > 1e-4 ? d / l : vec2(1.0, 0.0);
    vec2 n = vec2(-d.y, d.x);
    vec4 c = mix(c0, c1, position.x);
    float w = uW * (0.55 + 0.45 * min(aInfo.x, 1.0));
    c.xy += n * position.y * w / (uRes * 0.5) * c.w;
    vA = mix(aP0.w, aP1.w, position.x); vY = position.y;
    // 빛을 받는 구간만 번쩍: 스크롤하면 반짝이는 자리가 금을 따라 흐름 + 아주 느린 반짝임
    float sp = pow(max(sin(aInfo.y * 9.0 - uP * 46.0 + aInfo.z * 6.283), 0.0), 14.0);
    float tw = pow(max(sin(aInfo.y * 23.0 + aInfo.z * 40.0 + uT * 1.1), 0.0), 40.0);
    vK = aInfo.x * (0.65 + 2.6 * sp + 0.9 * tw);
    gl_Position = c;
  }`;
const LINE_FS = /* glsl */`
  uniform vec3 uCol; varying float vA; varying float vY; varying float vK;
  void main() {
    float e = max(1.0 - vY * vY, 0.0);
    float a = vA * e * e;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uCol * vK * a, 1.0);
  }`;
const PT_VS = /* glsl */`
  uniform float uDpr; attribute float aK; attribute float aSz; varying float vK;
  void main() {
    vK = aK;
    gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
    gl_PointSize = aK > 0.003 ? aSz * uDpr : 0.0;
  }`;
// 십자 글린트: 작고 뜨거운 코어 + 부드러운 헤일로 + 가는 광선(끝으로 갈수록 흐려짐)
const STAR_FS = /* glsl */`
  uniform vec3 uCol; varying float vK;
  void main() {
    vec2 q = gl_PointCoord - 0.5; float r2 = dot(q, q);
    float core = exp(-r2 * 1400.0) * 1.6 + exp(-r2 * 160.0) * 0.32 + exp(-r2 * 22.0) * 0.06;
    vec2 a = mat2(0.95, 0.31, -0.31, 0.95) * q;
    float ray = exp(-abs(a.y) * 320.0) * exp(-pow(abs(a.x) * 7.0, 1.2)) + 0.55 * exp(-abs(a.x) * 320.0) * exp(-pow(abs(a.y) * 11.0, 1.2));
    vec2 b = mat2(0.71, 0.71, -0.71, 0.71) * q;
    ray += 0.18 * (exp(-abs(b.y) * 380.0) + exp(-abs(b.x) * 380.0)) * exp(-length(q) * 16.0);
    float v = (core + ray * (1.0 - smoothstep(0.32, 0.5, sqrt(r2)))) * vK;
    if (v < 0.003) discard;
    gl_FragColor = vec4(uCol * v, 1.0);
  }`;
const DUST_FS = /* glsl */`
  uniform vec3 uCol; varying float vK;
  void main() { vec2 q = gl_PointCoord - 0.5; float v = exp(-dot(q, q) * 30.0) * vK; if (v < 0.003) discard; gl_FragColor = vec4(uCol * v, 1.0); }`;

export function createCracks({ lite, dpr, seed: s0 = 11 }) {
  let seed = s0; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const M = lite ? 161 : 241;                 // 파형 금 한 줄기의 점 수
  const RING_N = lite ? 44 : 72;
  const paths = [];                           // { n, pos: Float32Array(n*3), al: Float32Array(n), b, seed, s0 }

  const addPath = (n, b, kind, extra) => { const pth = { n, pos: new Float32Array(n * 3), al: new Float32Array(n), b, seed: rnd(), kind, ...extra }; paths.push(pth); return pth; };

  // --- 파형 금 3줄기 (세기·주기·위상이 다름) ---
  const WAVES = [{ amp: 1, f: 3.5, ph: 0, b: 1.0, dir: 1 }, { amp: 0.63, f: 5, ph: 1.9, b: 0.62, dir: -1 }, { amp: 0.4, f: 2.2, ph: 3.6, b: 0.4, dir: 1 }];
  const waves = WAVES.map((w, k) => {
    const jit = new Float32Array(M); let walk = 0;
    for (let j = 0; j < M; j++) { walk = walk * 0.9 + (rnd() - 0.5) * 0.006; jit[j] = walk + (rnd() - 0.5) * 0.0025; }
    return addPath(M, w.b, 'wave', { w, k, jit, es: rnd() * 6 });
  });
  // 금의 다른 면 (부분적으로 두 줄로 보이게)
  const dbl = addPath(70, 0.32, 'double', { from: Math.floor(M * 0.28), src: waves[0] });
  // 잔금: 파형 금에서 짧게 갈라져 나온 가지
  const branches = [];
  [0, 0, 0, 1, 1, 2].forEach((wi, q) => {
    for (let m = 0; m < 3; m++) {
      const at = Math.floor((0.12 + rnd() * 0.76) * M), n = 7, ang = rnd() * Math.PI * 2, len = 0.06 + rnd() * 0.16;
      const off = []; let x = 0, y = 0;
      for (let i = 0; i < n; i++) { const t = i / (n - 1); off.push([x, y]); x = Math.cos(ang) * len * t + (rnd() - 0.5) * 0.012; y = Math.sin(ang) * len * t + (rnd() - 0.5) * 0.012; }
      branches.push(addPath(n, 0.32 * WAVES[wi].b + 0.12, 'branch', { src: waves[wi], at, off }));
    }
  });
  // 깨진 자리에서 사방으로 뻗는 금 (지구본 로컬 크기 기준)
  const radials = [];
  for (let i = 0; i < 13; i++) {
    let a = (i / 13) * Math.PI * 2 + (rnd() - 0.5) * 0.3, x = 0, y = 0; const n = 9, off = [[0, 0]];
    const L = 0.55 + rnd() * 0.75;
    for (let m = 1; m < n; m++) { a += (rnd() - 0.5) * 0.35; const st = L / (n - 1) * (0.7 + rnd() * 0.6); x += Math.cos(a) * st; y += Math.sin(a) * st; off.push([x, y]); }
    radials.push(addPath(n, 0.55 + rnd() * 0.35, 'radial', { off }));
  }
  // CD 자리마다 동심원 균열 (테두리 → 트랙 → 허브 순) + 방사형 잔금
  const RINGS = [0.985, 0.9, 0.72, 0.55, 0.36, 0.31];
  const rings = [];
  for (let k = 0; k < 5; k++) {
    const th0 = rnd() * Math.PI * 2;                    // 금이 처음 닿는 자리
    RINGS.forEach((r, ri) => {
      const n = RING_N + 1, gapAt = rnd() * Math.PI * 2, gapW = 0.25 + rnd() * 0.8;
      const loc = [];
      for (let j = 0; j < n; j++) {
        const th = th0 + (j / (n - 1)) * Math.PI * 2, rr = r * (1 + (rnd() - 0.5) * 0.008);
        loc.push([rr * Math.cos(th), rr * Math.sin(th), Math.abs(wrapA(th - th0)) / Math.PI, Math.abs(wrapA(th - gapAt)) < gapW / 2 ? 0 : 1]);
      }
      rings.push(addPath(n, ri === 0 ? 0.95 : 0.5 + (ri === 4 ? 0.25 : 0), 'ring', { k, ri, loc }));
    });
    for (let q = 0; q < 4; q++) {
      const a = rnd() * Math.PI * 2, r1 = 0.55 + rnd() * 0.45, n = 7, loc = [];
      for (let j = 0; j < n; j++) { const t = j / (n - 1), rr = 0.32 + (r1 - 0.32) * t, aa = a + (rnd() - 0.5) * 0.05; loc.push([rr * Math.cos(aa), rr * Math.sin(aa), t, 1]); }
      rings.push(addPath(n, 0.36, 'ring', { k, ri: 6, loc }));
    }
    rings.push({ starTh: th0, k, kind: 'ringStar' });
  }
  const ringPaths = rings.filter((r) => r.kind === 'ring');
  const ringStarTh = rings.filter((r) => r.kind === 'ringStar');

  // --- 선 지오메트리 (선분 하나 = 사각형 하나) ---
  const NSEG = paths.reduce((t, q) => t + q.n - 1, 0);
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.instanceCount = NSEG;
  const P0 = new Float32Array(NSEG * 4), P1 = new Float32Array(NSEG * 4), INFO = new Float32Array(NSEG * 3);
  let at = 0;
  paths.forEach((q) => { q.seg = at; for (let j = 0; j < q.n - 1; j++, at++) INFO.set([q.b, (j + 0.5) / (q.n - 1) * (q.kind === 'wave' ? 3 : 1) + q.seed * 3, q.seed], at * 3); });
  const aP0 = new THREE.InstancedBufferAttribute(P0, 4), aP1 = new THREE.InstancedBufferAttribute(P1, 4);
  aP0.setUsage(THREE.DynamicDrawUsage); aP1.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aP0', aP0); geo.setAttribute('aP1', aP1); geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(INFO, 3));
  const COL = new THREE.Color('#e6ebf3');
  const LU = { uRes: { value: new THREE.Vector2(1, 1) }, uW: { value: (lite ? 1.4 : 1.25) * dpr }, uP: { value: 0 }, uT: { value: 0 }, uCol: { value: COL } };
  const lineMat = new THREE.ShaderMaterial({ uniforms: LU, vertexShader: LINE_VS, fragmentShader: LINE_FS, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true });
  const lines = new THREE.Mesh(geo, lineMat); lines.frustumCulled = false; lines.renderOrder = 5;

  // --- 글린트(점 스프라이트): 파형 위 고정 자리 + CD 동심원 시작점 + CD 뒷면 테두리 ---
  const starSpots = [];
  for (let i = 0; i < (lite ? 14 : 22); i++) starSpots.push({ w: i % 3 === 2 ? 1 : 0, j: Math.floor((0.06 + rnd() * 0.88) * M), ph: rnd() * 6.28, sz: 70 + rnd() * 80 });
  const NSTAR = starSpots.length + 5 + 12;
  const sPos = new Float32Array(NSTAR * 3), sK = new Float32Array(NSTAR), sSz = new Float32Array(NSTAR);
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage));
  sGeo.setAttribute('aK', new THREE.BufferAttribute(sK, 1).setUsage(THREE.DynamicDrawUsage));
  sGeo.setAttribute('aSz', new THREE.BufferAttribute(sSz, 1).setUsage(THREE.DynamicDrawUsage));
  const PU = { uDpr: { value: dpr }, uCol: { value: new THREE.Color('#f4f6fb') } };
  const stars = new THREE.Points(sGeo, new THREE.ShaderMaterial({ uniforms: PU, vertexShader: PT_VS, fragmentShader: STAR_FS, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
  stars.frustumCulled = false; stars.renderOrder = 6;

  // --- 먼지·부스러기 (보내준 사진처럼 아주 옅게) ---
  const ND = lite ? 260 : 520;
  const dN = new Float32Array(ND * 3), dPos = new Float32Array(ND * 3), dK = new Float32Array(ND), dSz = new Float32Array(ND);
  for (let i = 0; i < ND; i++) { dN.set([rnd() * 2 - 1, rnd() * 2 - 1, rnd()], i * 3); dSz[i] = 1.2 + rnd() * 1.8; }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute('aK', new THREE.BufferAttribute(dK, 1).setUsage(THREE.DynamicDrawUsage));
  dGeo.setAttribute('aSz', new THREE.BufferAttribute(dSz, 1));
  const dust = new THREE.Points(dGeo, new THREE.ShaderMaterial({ uniforms: { uDpr: { value: dpr }, uCol: { value: new THREE.Color('#cfd5de') } }, vertexShader: PT_VS, fragmentShader: DUST_FS, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
  dust.frustumCulled = false; dust.renderOrder = 4;

  const group = new THREE.Group(); group.add(dust, lines, stars);

  /* 화면 크기가 바뀔 때: 먼지를 화면 전체에 */
  function resize(W, H, viewW, viewH) {
    LU.uRes.value.set(W * dpr, H * dpr);
    for (let i = 0; i < ND; i++) dPos.set([dN[i * 3] * viewW * 0.52, dN[i * 3 + 1] * viewH * 0.52, -0.2], i * 3);
    dGeo.attributes.position.needsUpdate = true;
  }

  // 파형 금이 지나는 길(척추): CD 중심들을 잇고 양 끝을 화면 밖까지 늘림
  const SP = new Float32Array(M * 3), SN = new Float32Array(M * 2);
  const v = new THREE.Vector3(), v2 = new THREE.Vector3();
  function spine(centers) {
    const n = centers.length, a = centers[0], b = centers[n - 1];
    const pts = [a.clone().add(a.clone().sub(centers[1]).multiplyScalar(1.7)), ...centers, b.clone().add(b.clone().sub(centers[n - 2]).multiplyScalar(1.7))];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    for (let j = 0; j < M; j++) {
      curve.getPointAt(j / (M - 1), v); curve.getTangentAt(j / (M - 1), v2);
      SP.set([v.x, v.y, v.z], j * 3);
      const l = Math.hypot(v2.x, v2.y) || 1; SN.set([-v2.y / l, v2.x / l], j * 2);
    }
  }

  const tmp = new THREE.Vector3();
  /* 매 프레임: p와 CD 자리(cdM)·지구본 중심으로 모든 금의 점 위치·투명도를 계산 */
  function update({ p, t, globeC, globeS, cdM, slots, amp, rim }) {
    LU.uP.value = p; LU.uT.value = t;
    const on = p > 0.07 && p < 0.62;
    lines.visible = on; dust.visible = p > 0.1 && p < 0.58;
    if (on) {
      spine(slots.map((k) => new THREE.Vector3().setFromMatrixPosition(cdM[k])));
      const show = smooth(0.085, 0.12, p) * (1 - smooth(0.47, 0.53, p));
      const R = smooth(0.1, 0.3, p) * 1.08;                    // 가운데서 양 끝으로 뻗어 나감
      const R2 = 1.08 * (1 - smooth(0.38, 0.5, p));              // 04에서 양 끝부터 거둬들임
      // 파형 금
      waves.forEach((q) => {
        const { w, jit, es } = q, ph = w.ph + (p - 0.25) * 4 * w.dir;
        for (let j = 0; j < M; j++) {
          const u = (j / (M - 1)) * 2 - 1, u01 = (u + 1) / 2;
          const env = 0.08 + 0.92 * Math.exp(-((u / 0.5) ** 2)) * (0.75 + 0.25 * Math.sin(u * 9 + es));
          const off = amp * w.amp * env * Math.sin(u01 * w.f * 2 * Math.PI + ph) + jit[j];
          q.pos[j * 3] = SP[j * 3] + SN[j * 2] * off; q.pos[j * 3 + 1] = SP[j * 3 + 1] + SN[j * 2 + 1] * off; q.pos[j * 3 + 2] = SP[j * 3 + 2];
          q.al[j] = show * clamp01((R - Math.abs(u)) / 0.07) * clamp01((R2 - Math.abs(u)) / 0.07);
        }
      });
      // 두 줄로 보이는 부분
      for (let j = 0; j < dbl.n; j++) {
        const s = dbl.from + j, src = dbl.src;
        dbl.pos[j * 3] = src.pos[s * 3] + SN[s * 2] * 0.011; dbl.pos[j * 3 + 1] = src.pos[s * 3 + 1] + SN[s * 2 + 1] * 0.011; dbl.pos[j * 3 + 2] = src.pos[s * 3 + 2];
        dbl.al[j] = src.al[s] * Math.sin((j / (dbl.n - 1)) * Math.PI);
      }
      // 잔금
      branches.forEach((q) => {
        const s = q.at, src = q.src, nx = SN[s * 2], ny = SN[s * 2 + 1], u = Math.abs((s / (M - 1)) * 2 - 1);
        const grow = clamp01((R - u - 0.04) / 0.12);
        for (let m = 0; m < q.n; m++) {
          const [ox, oy] = q.off[m];
          q.pos[m * 3] = src.pos[s * 3] + ny * ox + nx * oy; q.pos[m * 3 + 1] = src.pos[s * 3 + 1] - nx * ox + ny * oy; q.pos[m * 3 + 2] = src.pos[s * 3 + 2];
          q.al[m] = src.al[s] * clamp01((grow * 1.2 - m / q.n) / 0.2);
        }
      });
      // 깨진 자리에서 사방으로
      const tR = smooth(0.085, 0.17, p), fR = 1 - smooth(0.2, 0.3, p);
      radials.forEach((q) => {
        for (let m = 0; m < q.n; m++) {
          q.pos[m * 3] = globeC.x + q.off[m][0] * globeS; q.pos[m * 3 + 1] = globeC.y + q.off[m][1] * globeS; q.pos[m * 3 + 2] = globeC.z + 0.4;
          q.al[m] = fR * clamp01((tR * 1.15 - m / (q.n - 1)) / 0.15);
        }
      });
      // CD 자리 동심원 균열
      ringPaths.forEach((q) => {
        const visible = slots.includes(q.k);
        const dk = [0.05, 0.025, 0, 0.025, 0.05][q.k] + (q.ri === 6 ? 0.04 : q.ri * 0.008);
        const tr = smooth(0.35 + dk, 0.45 + dk, p), fd = visible ? 1 - smooth(0.53, 0.59, p) : 0;
        for (let m = 0; m < q.n; m++) {
          const [x, y, fr, gp] = q.loc[m];
          tmp.set(x, y, 0.04).applyMatrix4(cdM[q.k]);
          q.pos[m * 3] = tmp.x; q.pos[m * 3 + 1] = tmp.y; q.pos[m * 3 + 2] = tmp.z;
          q.al[m] = fd * gp * clamp01((tr * 1.06 - fr) / 0.05);
        }
      });
      // 선분 버퍼 채우기
      paths.forEach((q) => {
        for (let j = 0; j < q.n - 1; j++) {
          const i = (q.seg + j) * 4;
          P0[i] = q.pos[j * 3]; P0[i + 1] = q.pos[j * 3 + 1]; P0[i + 2] = q.pos[j * 3 + 2]; P0[i + 3] = q.al[j];
          P1[i] = q.pos[j * 3 + 3]; P1[i + 1] = q.pos[j * 3 + 4]; P1[i + 2] = q.pos[j * 3 + 5]; P1[i + 3] = q.al[j + 1];
        }
      });
      aP0.needsUpdate = true; aP1.needsUpdate = true;
    }
    // 먼지
    if (dust.visible) {
      const k = smooth(0.1, 0.18, p) * (1 - smooth(0.5, 0.58, p));
      for (let i = 0; i < ND; i++) dK[i] = k * (0.08 + 0.22 * dN[i * 3 + 2]);
      dGeo.attributes.aK.needsUpdate = true;
    }
    // 글린트
    let si = 0;
    starSpots.forEach((s) => {
      const q = waves[s.w];
      const tw = Math.pow(Math.max(Math.sin(s.ph + p * 34), 0), 3) * (0.8 + 0.2 * Math.sin(t * 1.7 + s.ph)) * 1.3;
      sPos.set([q.pos[s.j * 3], q.pos[s.j * 3 + 1], q.pos[s.j * 3 + 2]], si * 3);
      sK[si] = on ? q.al[s.j] * tw * (s.w ? 0.6 : 1) : 0; sSz[si] = s.sz; si++;
    });
    ringStarTh.forEach((r) => {
      const dk = [0.05, 0.025, 0, 0.025, 0.05][r.k], tr = smooth(0.35 + dk, 0.45 + dk, p);
      tmp.set(0.985 * Math.cos(r.starTh), 0.985 * Math.sin(r.starTh), 0.04).applyMatrix4(cdM[r.k]);
      sPos.set([tmp.x, tmp.y, tmp.z], si * 3);
      sK[si] = on && slots.includes(r.k) ? Math.sin(Math.PI * clamp01(tr * 1.4)) * 0.9 * (1 - smooth(0.5, 0.56, p)) : 0; sSz[si] = 90; si++;
    });
    for (let i = 0; i < 12; i++, si++) {
      const g = rim && rim[i];
      if (g) { sPos.set([g.x, g.y, g.z], si * 3); sK[si] = g.k; sSz[si] = g.sz; } else sK[si] = 0;
    }
    sGeo.attributes.position.needsUpdate = true; sGeo.attributes.aK.needsUpdate = true; sGeo.attributes.aSz.needsUpdate = true;
  }

  return { group, resize, update };
}
