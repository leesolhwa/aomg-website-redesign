// AOMG 3D 공연장 — 뒤쪽 양문과 문 너머 빛 (원본 AOMG-Crowd v48, 사이트 연결용 수정: 문은 닫힌 채 문틈 빛 기둥, 통로 대신 빛 상자)
window.createVenueExit = function (scene, roomMaterial, eye) {
  const depth = 4.48;
  const left = depth * Math.tan((826 / 1774 - .5) * Math.PI * 2);
  const right = depth * Math.tan((946 / 1774 - .5) * Math.PI * 2);
  const height = eye + depth * Math.tan((.5 - 399 / 887) * Math.PI);
  const width = right - left;
  const center = (left + right) / 2;
  const exit = new THREE.Group();
  exit.visible = false;
  scene.add(exit);

  function panel(w, h, x, y, z, material) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    plane.position.set(x, y, z);
    exit.add(plane);
    return plane;
  }

  // Use the existing panorama on the rear wall, leaving an actual opening for the doors.
  const roomHalfWidth = 10.5;
  panel(left + roomHalfWidth, 6.8, (left - roomHalfWidth) / 2, 3.4, depth, roomMaterial);
  panel(roomHalfWidth - right, 6.8, (right + roomHalfWidth) / 2, 3.4, depth, roomMaterial);
  panel(width, 6.8 - height, center, (6.8 + height) / 2, depth, roomMaterial);

  function doorLeaf(hingeX, direction) {
    const leafWidth = width / 2;
    const textureCenter = new THREE.Vector3(hingeX + direction * leafWidth / 2, height / 2, depth);
    const material = roomMaterial.clone();
    material.side = THREE.DoubleSide;
    material.uniforms = { ...roomMaterial.uniforms, closedCenter: { value: textureCenter } };
    material.vertexShader = `uniform vec3 closedCenter;
      varying vec3 surface;
      void main() {
        surface = position + closedCenter;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`;
    const hinge = new THREE.Group();
    hinge.position.set(hingeX, 0, depth);
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(leafWidth, height), material);
    leaf.position.set(direction * leafWidth / 2, height / 2, 0);
    hinge.add(leaf);
    exit.add(hinge);
    return hinge;
  }

  const leftLeaf = doorLeaf(left, 1);
  const rightLeaf = doorLeaf(right, -1);
  const doorOpen = { value: 0 };
  // 문은 닫힌 채: 가운데 틈과 문 아래로 아주 밝은 빛(흰빛 → 망점 필터에서 점 없이 꽉 찬 레드).
  // 다가갈수록 틈 빛이 굵은 빛 기둥이 되고, 문 앞에 닿으면 문 전체가 빛으로 차오르며 벽으로 번짐
  const leak = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { doorOpen },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float doorOpen; varying vec2 vUv;
      float line(float d, float w) { return exp(-pow(d / w, 2.0)); }
      void main() {
        vec2 d = vec2((vUv.x - .5) * 2.0, vUv.y * 1.3 - .08);   // 판은 문의 2배 폭 (번짐이 벽까지), 문 = |x|<.5, 0<y<1
        float inY = step(0.0, d.y) * step(d.y, 1.0), inX = step(abs(d.x), .5);
        float lit = .55 + .45 * smoothstep(0.0, .8, doorOpen);
        float bw = mix(.003, .03, smoothstep(0.0, .9, doorOpen));                    // 빛 기둥 굵기
        float under = line(d.y, .0022) * inX * .8, underGlow = line(d.y, .012) * inX * .5;   // 문 아래 빛: 얇은 한 줄
        float core = smoothstep(bw, bw * .4, abs(d.x)) * inY + under;
        float glow = line(d.x, bw * 6.0) * inY + underGlow;
        float fill = smoothstep(.75, .97, doorOpen) * smoothstep(.62, .5, abs(d.x)) * smoothstep(-.12, .02, d.y) * smoothstep(1.12, .98, d.y);
        float a = clamp((core + glow * .55) * lit + fill, 0.0, 1.0);
        vec3 c = mix(vec3(1.0, .45, .2), vec3(1.0), clamp(core * lit + fill, 0.0, 1.0));   // 틈 한가운데는 흰빛
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
        gl_FragColor.b = .29;
      }` });
  panel(width * 2.0, height * 1.3, center, height * 1.3 / 2 - height * .08, depth - .006, leak);
  // 문 너머: 통로 대신 빛만. 문 뒤를 빛 상자로 감싸 문틈으로 새어 나오다가, 통과하면 화면을 가득 채움 (공간감 없이)
  const through = { value: 0 };
  const glow = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { doorOpen, through, mid: { value: new THREE.Vector3(center, height * .55, depth + 3) } },
    vertexShader: `varying vec3 world; void main() { vec4 w = modelMatrix * vec4(position, 1.0); world = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float doorOpen, through; uniform vec3 mid;
      varying vec3 world;
      void main() {
        // 보는 방향 기준으로 밝기를 정해 상자의 면·모서리가 보이지 않음 (공간감 없이 빛만)
        vec3 dir = normalize(world - cameraPosition);
        vec2 off = dir.xy / max(dir.z, .05) - vec2(0.0, .12);
        float r = dot(off, off);
        float core = exp(-r * 6.0), halo = exp(-r * 1.2);
        vec3 color = vec3(.6, .145, .014) * (.5 + .5 * halo) + vec3(.42, .16, .045) * core;
        color *= .6 + .4 * doorOpen;
        color = mix(color, vec3(1.0, .34, .05) * (.85 + .15 * halo), through);   // 통과하면 빛이 화면을 채움
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
        gl_FragColor.b = .29;
      }`
  });
  const boxD = 5, boxW = 5, boxH = 5, z0 = depth + .02;
  panel(boxW, boxH, center, boxH / 2 + .01, z0 + boxD, glow);                                        // 뒤
  panel(boxD, boxH, center - boxW / 2, boxH / 2 + .01, z0 + boxD / 2, glow).rotation.y = Math.PI / 2;  // 왼쪽
  panel(boxD, boxH, center + boxW / 2, boxH / 2 + .01, z0 + boxD / 2, glow).rotation.y = Math.PI / 2;  // 오른쪽
  panel(boxW, boxD, center, boxH + .01, z0 + boxD / 2, glow).rotation.x = Math.PI / 2;                // 위
  panel(boxW, boxD, center, .015, z0 + boxD / 2, glow).rotation.x = Math.PI / 2;                      // 아래 (공연장 바닥보다 살짝 위 — 바닥 사진이 비치지 않게)

  return {
    draw(progress, openness) {
      exit.visible = progress >= .4;
      through.value = THREE.MathUtils.smoothstep(progress, .86, 1);
      doorOpen.value = openness;
      leftLeaf.visible = rightLeaf.visible = openness < .97;   // 문은 움직이지 않고, 빛으로 다 찬 뒤 숨김
    }
  };
};
