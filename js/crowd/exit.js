// AOMG 3D 공연장 — 뒤쪽 양문과 통로 (원본 AOMG-Crowd v48, 사이트 연결용 수정: 문·통로 조명, 통로 끝 빛 줄임)
window.createVenueExit = function (scene, roomMaterial, eye) {
  const depth = 4.48;
  const left = depth * Math.tan((826 / 1774 - .5) * Math.PI * 2);
  const right = depth * Math.tan((946 / 1774 - .5) * Math.PI * 2);
  const height = eye + depth * Math.tan((.5 - 399 / 887) * Math.PI);
  const width = right - left;
  const center = (left + right) / 2;
  const hallwayEnd = 8.8;
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
  const hall = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { doorOpen, isFloor: { value: 0 } },
    vertexShader: `varying vec3 world;
      void main() {
        vec4 positionInRoom = modelMatrix * vec4(position, 1.0);
        world = positionInRoom.xyz;
        gl_Position = projectionMatrix * viewMatrix * positionInRoom;
      }`,
    fragmentShader: `uniform float doorOpen, isFloor;
      varying vec3 world;
      float grain(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 79.3))) * 43758.5453);
      }
      void main() {
        vec3 p = world;
        float roughness = .68 + .32 * grain(floor(p * 132.0));
        vec3 wallDistance = (p - vec3(-1.53, 1.44, 8.45)) * vec3(.95, 1.0, .79);
        float wallGlow = exp(-dot(wallDistance, wallDistance));
        vec2 falloff = vec2((p.x + .54) * 2.35, (p.z - 7.4) * .55);
        float reflection = exp(-dot(falloff, falloff));
        vec3 color = vec3(.045, .030, .022) * roughness;
        color += (1.0 - isFloor) * wallGlow * vec3(.72, .165, .015) * roughness;
        // 통로 양옆 벽: 문에서 끝까지 이어지는 주황 반사광 (망점이 계속 보이게)
        float sideLight = (1.0 - isFloor) * smoothstep(4.4, 6.0, p.z) * exp(-pow((p.y - 1.6) * .9, 2.0));
        color += sideLight * vec3(.16, .038, .004) * roughness;
        // 끝 벽: 가운데가 밝은 빛 (빛 쪽으로 걸어 나가는 느낌)
        float endGlow = (1.0 - isFloor) * step(8.7, p.z) * exp(-pow(p.x * .75, 2.0) - pow((p.y - 1.5) * .9, 2.0));
        color += doorOpen * endGlow * vec3(.34, .082, .008) * roughness;
        color *= mix(1.0, .5, smoothstep(6.2, 8.8, p.z));   // 통로 끝으로 갈수록 은은하게   // A: 통로 끝이 어둠(LIVE 배경)으로
        color += isFloor * reflection * vec3(.25, .061, .007) * roughness;
        color += isFloor * smoothstep(4.5, 8.0, p.z) * exp(-pow(p.x * .9, 2.0)) * vec3(.22, .055, .006) * roughness;
        float thresholdGlow = exp(-pow((p.x - .20) * 1.3, 2.0) - pow((p.z - 4.75) * 1.2, 2.0));
        color += isFloor * doorOpen * thresholdGlow * vec3(.11, .031, .004);
        float aisleEdge = 1.0 - smoothstep(1.05, 1.58, abs(p.x));
        float floorOpacity = smoothstep(.7, 2.8, p.z) * mix(aisleEdge, 1.0, smoothstep(4.24, 4.55, p.z));
        float opacity = mix(1.0, floorOpacity, isFloor);
        gl_FragColor = vec4(color, opacity);
        #include <colorspace_fragment>
        gl_FragColor.b = .29;
      }`
  });
  const hallwayLength = hallwayEnd - depth;
  const hallwayMidpoint = (depth + hallwayEnd) / 2;
  const hallHalfWidth = 1.6;
  panel(2 * hallHalfWidth, 3.4, center, 1.7, hallwayEnd, hall);
  panel(hallwayLength, 3.4, center - hallHalfWidth, 1.7, hallwayMidpoint, hall).rotation.y = Math.PI / 2;
  panel(hallwayLength, 3.4, center + hallHalfWidth, 1.7, hallwayMidpoint, hall).rotation.y = Math.PI / 2;
  panel(2 * hallHalfWidth, hallwayLength, center, 3.4, hallwayMidpoint, hall).rotation.x = Math.PI / 2;

  const floor = hall.clone();
  floor.uniforms.isFloor.value = 1;
  floor.uniforms.doorOpen = doorOpen;
  floor.transparent = true;
  floor.depthWrite = false;
  panel(2 * hallHalfWidth, hallwayEnd, center, .008, hallwayEnd / 2, floor).rotation.x = -Math.PI / 2;

  return {
    draw(progress, openness) {
      exit.visible = progress >= .4;
      doorOpen.value = openness;
      leftLeaf.rotation.y = -1.46 * openness;
      rightLeaf.rotation.y = 1.46 * openness;
    }
  };
};
