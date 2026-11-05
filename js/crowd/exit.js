// AOMG 3D 공연장 — 뒤쪽 양문과 문 너머 빛 (원본 AOMG-Crowd v48, 사이트 연결용 수정: 문 주변 조명, 통로 대신 빛 상자)
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
      leftLeaf.rotation.y = -1.46 * openness;
      rightLeaf.rotation.y = 1.46 * openness;
    }
  };
};
