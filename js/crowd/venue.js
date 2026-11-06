// AOMG 3D 공연장 (원본 AOMG-Crowd v48, 사이트 연결용 수정: 손 인트로·문 조명)
window.createConcertSpace = function (container, front, surround, clean, roomFaces, stageFaces, approvedHand, openingPose) {
  const eye = 1.68;
  const distance = 12;
  const stageWidth = 21.6;
  const stageHeight = stageWidth * front.naturalHeight / front.naturalWidth;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070503');
  const camera = new THREE.PerspectiveCamera(52, 1, .06, 44);
  camera.rotation.order = 'YXZ';
  const referenceAspect = approvedHand.naturalWidth / approvedHand.naturalHeight;
  const referenceWide = Math.min(Math.tan(THREE.MathUtils.degToRad(37)),
    Math.max(stageHeight, stageWidth / referenceAspect) / (2 * distance));
  const referenceCamera = new THREE.PerspectiveCamera(
    THREE.MathUtils.radToDeg(2 * Math.atan(referenceWide / openingPose.zoom)), referenceAspect, .06, 44);
  referenceCamera.position.set(openingPose.x, eye + openingPose.y, openingPose.z);
  referenceCamera.rotation.set(openingPose.pitch, -openingPose.yaw, 0, 'YXZ');
  referenceCamera.updateMatrixWorld();
  const handProjection = referenceCamera.projectionMatrix.clone().multiply(referenceCamera.matrixWorldInverse);
  const handRay = new THREE.Matrix4().makeRotationFromQuaternion(referenceCamera.quaternion)
    .multiply(referenceCamera.projectionMatrixInverse);
  const approvedHandMap = new THREE.Texture(approvedHand);
  approvedHandMap.colorSpace = THREE.SRGBColorSpace;
  approvedHandMap.needsUpdate = true;

  function canvas(width, height) {
    const target = document.createElement('canvas');
    target.width = width;
    target.height = height;
    return target;
  }
  function texture(source) {
    const map = new THREE.CanvasTexture(source);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return map;
  }
  const panorama = canvas(surround.naturalWidth, surround.naturalHeight);
  panorama.getContext('2d').drawImage(surround, 0, 0);
  const panoramaMap = texture(panorama);
  panoramaMap.wrapS = THREE.RepeatWrapping;
  const roomFaceMap = texture(roomFaces);
  roomFaceMap.wrapS = THREE.RepeatWrapping;
  const stageFaceMap = texture(stageFaces);
  const lightTime = { value: 0 };
  const cueStrength = { value: 0 };
  const cueArea = { value: new THREE.Vector4() };
  const cueAngle = { value: 0 };
  const reveal = { value: 1 };     // 검은 화면 → 공연장 밝아짐
  const exitLight = { value: 0 };  // 뒤로 돌수록 문 주변을 어둡게
  // Hair, fabric and the lit side of each face catch the orange spill.
  function highlightMap(width, height, referenceWidth, referenceHeight, edges, faces) {
    const mask = canvas(width, height);
    const context = mask.getContext('2d');
    context.scale(width / referenceWidth, height / referenceHeight);
    context.strokeStyle = '#fff';
    context.lineWidth = 25;
    context.lineCap = 'round';
    context.filter = 'blur(9px)';
    edges.forEach(path => context.stroke(new Path2D(path)));
    context.lineWidth = 33;
    context.globalAlpha = .87;
    context.filter = 'blur(12px)';
    faces.forEach(path => context.stroke(new Path2D(path)));
    const map = new THREE.CanvasTexture(mask);
    map.wrapS = THREE.RepeatWrapping;
    return map;
  }

  const roomHighlights = highlightMap(panorama.width, panorama.height, 1774, 887, [
    'M 45 476 Q 54 459 69 463 M 101 482 Q 112 466 124 474',
    'M 143 466 Q 153 460 165 471 M 194 466 Q 208 448 219 460',
    'M 201 487 Q 220 480 225 497 M 256 481 Q 268 474 280 488',
    'M 275 496 Q 308 475 339 488 M 483 589 Q 520 545 570 558',
    'M 379 456 Q 393 443 404 456 M 424 463 Q 446 433 472 460',
    'M 514 464 Q 529 449 540 469 M 542 455 Q 552 438 567 451',
    'M 638 448 Q 658 427 673 448 M 688 462 Q 702 443 713 457',
    'M 740 435 Q 759 420 771 436 M 787 461 Q 801 445 814 462',
    'M 714 493 Q 745 475 768 505 Q 779 525 776 554',
    'M 984 464 Q 992 449 1009 455 M 1011 480 Q 1023 468 1037 474',
    'M 1008 584 Q 1044 541 1089 543 M 1210 606 Q 1256 555 1311 568',
    'M 1128 480 Q 1145 468 1152 482',
    'M 1173 443 Q 1206 432 1223 468 M 1207 525 Q 1230 528 1240 542',
    'M 1241 457 Q 1254 449 1264 462 M 1298 480 Q 1319 470 1337 494',
    'M 1351 461 Q 1367 447 1378 462 M 1404 459 Q 1420 445 1434 462',
    'M 1465 499 Q 1488 472 1514 486 M 1554 462 Q 1565 448 1579 461',
    'M 1594 470 Q 1610 456 1624 467 M 1650 466 Q 1664 453 1676 470',
    'M 1700 473 Q 1718 458 1730 476 M 1737 482 Q 1752 465 1765 475'
  ], [
    'M 269 527 Q 263 544 276 562 M 305 579 Q 337 587 357 611',
    'M 399 500 Q 398 518 409 534 M 471 538 Q 484 547 489 565',
    'M 577 513 Q 566 528 579 546 M 666 529 Q 667 546 681 558',
    'M 775 474 Q 770 487 782 500 M 997 473 Q 999 489 1008 499',
    'M 1065 488 Q 1074 502 1067 517 M 1122 572 Q 1144 583 1154 606',
    'M 1287 524 Q 1301 534 1308 548 M 1434 554 Q 1447 562 1447 576',
    'M 1549 510 Q 1569 527 1569 547 M 1515 555 Q 1541 568 1550 588',
    'M 1672 522 Q 1683 540 1694 551'
  ]);
  const highlightShader = `
    float lightPool(vec2 texel, vec2 center, vec2 radius) {
      vec2 offset = texel - center;
      offset.x -= round(offset.x);
      offset /= radius;
      return exp(-dot(offset, offset));
    }
    vec3 crowdHighlight(vec3 photo, float mask, float spill) {
      float textureLight = smoothstep(.004, .14, photo.r);
      vec3 reflected = .58 * photo + vec3(.24, .066, .014) * textureLight;
      return reflected * mask * spill;
    }`;
  const roomMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { photograph: { value: panoramaMap }, eye: { value: eye }, highlights: { value: roomHighlights },
      faceMatte: { value: roomFaceMap }, cueStrength, cueArea, cueAngle, reveal, exitLight },
    vertexShader: `varying vec3 surface;
      void main() {
        vec4 positionInRoom = modelMatrix * vec4(position, 1.0);
        surface = positionInRoom.xyz;
        gl_Position = projectionMatrix * viewMatrix * positionInRoom;
      }`,
    fragmentShader: `uniform sampler2D photograph, highlights, faceMatte;
      uniform float eye;
      uniform vec4 cueArea;
      uniform float cueAngle, cueStrength, reveal, exitLight;
      varying vec3 surface;
      ${highlightShader}
      float projectedLight(vec2 texel) {
        vec2 offset = texel - cueArea.xy;
        offset.x -= round(offset.x);
        offset.x *= 2.0;
        vec2 axis = vec2(cos(cueAngle), sin(cueAngle));
        vec2 beam = vec2(dot(offset, axis), dot(offset, vec2(-axis.y, axis.x))) / cueArea.zw;
        float lengthFalloff = exp(-beam.x * beam.x * 1.7);
        float core = exp(-beam.y * beam.y * 2.4);
        float spill = exp(-beam.y * beam.y * .32);
        return cueStrength * lengthFalloff * (.78 * core + .22 * spill);
      }
      void main() {
        vec3 ray = normalize(surface - vec3(0.0, eye, 0.0));
        vec2 texel = vec2(.5 + atan(ray.x, ray.z) / 6.2831853,
          .5 + asin(clamp(ray.y, -1.0, 1.0)) / 3.1415927);
        vec2 dx = dFdx(texel);
        vec2 dy = dFdy(texel);
        // Treat a jump across the panorama seam as a short step on the wrapped texture.
        dx.x -= round(dx.x);
        dy.x -= round(dy.x);
        vec4 color = textureGrad(photograph, texel, dx, dy);
        float lamps = lightPool(texel, vec2(.287, .608), vec2(.027, .049))
          + lightPool(texel, vec2(.768, .604), vec2(.027, .049));
        float spill = .86 * lightPool(texel, vec2(.286, .48), vec2(.16, .14))
          + .84 * lightPool(texel, vec2(.76, .48), vec2(.16, .14))
          + .40 * lightPool(texel, vec2(.01, .46), vec2(.11, .13));
        vec3 photo = color.rgb;
        color.rgb *= .23 + .31 * lamps + .25 * spill;
        float mask = textureGrad(highlights, texel, dx, dy).a;
        color.rgb += crowdHighlight(photo, mask, .14 * spill);
        if (cueStrength > 0.0) {
          // Reflections use the scene texture so dark silhouettes break up the light.
          float reflected = smoothstep(.008, .32, photo.r);
          color.rgb += projectedLight(texel) * reflected * vec3(1.10, .26, .014);
        }
        // 뒤쪽 양문 주변을 주황 조명으로 밝혀 문·벽에도 망점이 찍히게
        // 문짝·문틀 주변만 클럽처럼 어둡게 (문틈 빛이 돋보이게, 관객·벽돌은 보이게)
        float doorDark = lightPool(texel, vec2(.5, .47), vec2(.09, .16));
        color.rgb *= 1.0 - exitLight * .6 * doorDark;
        color.rgb *= reveal;
        gl_FragColor = color;
        #include <colorspace_fragment>
        gl_FragColor.b = .29 + .63 * textureGrad(faceMatte, texel, dx, dy).a;
      }`
  });
  // Camera-space projection over actual venue walls, a floor and a ceiling.
  const room = new THREE.Mesh(new THREE.BoxGeometry(21, 6.8, 27), roomMaterial);
  room.position.set(0, 3.4, -1);
  scene.add(room);
  const rearExit = window.createVenueExit(scene, roomMaterial, eye);

  const w = front.naturalWidth, h = front.naturalHeight;
  const backCanvas = canvas(w, h), nearCanvas = canvas(w, h), repair = canvas(w, h);
  const back = backCanvas.getContext('2d'), near = nearCanvas.getContext('2d');
  const patch = repair.getContext('2d');
  const rightHandEdge = `C 744 319 750 330 754 341 C 764 363 769 384 775 400
    C 782 414 788 432 788 444 C 787 455 788 461 794 473
    C 811 507 830 541 848 578 C 867 616 879 653 886 689
    C 896 729 902 774 913 817 C 918 850 920 895 918 923 L 916 941`;
  const upperArm = `M 745 387 C 742 370 735 353 730 337 C 725 325 729 318 736 319 ${rightHandEdge}`;
  const returnToFingers = `C 794 721 790 711 784 700
    C 772 675 765 650 759 627 C 751 591 749 570 740 547
    C 733 529 726 510 722 500 C 720 493 716 491 706 488
    C 695 485 686 478 682 472 C 679 468 680 459 683 449
    C 679 440 676 428 674 419 C 672 408 661 397 652 387
    C 644 377 638 367 634 358 C 630 349 636 342 643 342
    C 651 342 656 351 662 360 C 671 375 680 383 691 394
    C 692 385 696 380 702 379 C 708 378 713 381 717 385
    C 714 378 719 372 726 372 C 733 371 739 378 743 384 Z`;
  const silhouette = new Path2D(`${upperArm}
    L 416 941 C 419 894 429 859 473 837
    C 462 811 463 779 470 744 C 474 708 496 665 532 647
    C 564 627 600 622 635 619 C 683 616 725 643 752 670
    C 773 687 781 706 787 725 ${returnToFingers}`);

  const stencil = canvas(w, h);
  const mask = stencil.getContext('2d');
  mask.fillStyle = '#fff';
  mask.filter = 'blur(1px)';
  mask.fill(silhouette);
  near.drawImage(front, 0, 0);
  near.globalCompositeOperation = 'destination-in';
  near.drawImage(stencil, 0, 0);

  const originalArmMask = canvas(w, h);
  const armMask = originalArmMask.getContext('2d');
  armMask.fillStyle = armMask.strokeStyle = '#fff';
  armMask.lineWidth = 4;
  armMask.lineJoin = 'round';
  const oldArm = new Path2D(`${upperArm} L 802 941 C 804 866 803 793 787 725 ${returnToFingers}`);
  armMask.stroke(oldArm);
  armMask.fill(oldArm);
  const originalArmMap = new THREE.CanvasTexture(originalArmMask);

  mask.clearRect(0, 0, w, h);
  mask.filter = 'blur(3.5px)';
  mask.strokeStyle = '#fff';
  mask.lineWidth = 17;
  mask.lineJoin = 'round';
  mask.stroke(silhouette);
  mask.fill(silhouette);
  patch.drawImage(clean, 0, 0, w, h);
  patch.globalCompositeOperation = 'destination-in';
  patch.drawImage(stencil, 0, 0);
  back.drawImage(front, 0, 0);
  back.drawImage(repair, 0, 0);

  const stageHighlights = highlightMap(w, h, 1672, 941, [
    'M 156 581 Q 177 548 202 563 M 239 556 Q 259 550 270 567',
    'M 304 579 Q 321 558 339 581 M 371 581 Q 386 573 398 585',
    'M 473 604 Q 510 579 548 596 M 552 582 Q 569 565 582 579',
    'M 619 600 Q 655 567 686 591 M 690 576 Q 703 568 714 582',
    'M 929 614 Q 948 602 964 619 M 986 624 Q 1009 594 1037 611',
    'M 1053 589 Q 1070 567 1088 581 M 1130 592 Q 1148 573 1166 594',
    'M 1195 600 Q 1234 551 1266 584 M 1290 571 Q 1308 548 1328 565',
    'M 1343 586 Q 1365 566 1384 583 M 1448 586 Q 1464 564 1487 579',
    'M 1511 570 Q 1534 548 1554 566'
  ], [
    'M 403 587 L 409 599 M 715 580 L 718 592',
    'M 1179 595 L 1183 608 M 1432 586 L 1434 600'
  ]);

  function projectedPhoto(source, getDepth, order, edge) {
    const geometry = new THREE.PlaneGeometry(1, 1, 36, 25);
    const positions = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const x = uv.getX(i) - .5, y = uv.getY(i) - .5;
      const depth = getDepth(y);
      positions.setXYZ(i, x * stageWidth * depth / distance,
        eye + y * stageHeight * depth / distance, -depth);
    }
    geometry.computeBoundingSphere();
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false,
      uniforms: { photograph: { value: texture(source) }, edge: { value: edge },
        highlights: { value: stageHighlights }, faceMatte: { value: stageFaceMap },
        approvedHand: { value: approvedHandMap }, originalArm: { value: originalArmMap }, reveal,
        handProjection: { value: handProjection }, handRay: { value: handRay },
        photoScale: { value: new THREE.Vector2(distance / stageWidth, distance / stageHeight) } },
      vertexShader: `varying vec2 texel;
        varying vec3 surface;
        void main() {
          texel = uv;
          surface = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `uniform sampler2D photograph, highlights, faceMatte, approvedHand, originalArm;
        uniform mat4 handProjection, handRay;
        uniform vec2 photoScale;
        uniform float edge, reveal;
        varying vec2 texel;
        varying vec3 surface;
        float lamp(vec2 uv, vec2 center) {
          vec2 distanceToLamp = (uv - center) * vec2(1.777, 1.0);
          float radius = dot(distanceToLamp, distanceToLamp);
          return .92 * exp(-radius * 27000.0) + .24 * exp(-radius * 2500.0)
            + .085 * exp(-radius * 390.0);
        }
        ${highlightShader}
        vec4 lowerArmPhoto(vec2 handUV, vec4 oldColor, float oldArm, float exposure) {
          float down = -handUV.y;
          // At the crop, align the two edges of the extension with the approved photo.
          // Below it, follow the original arm's widening shape and actual skin texture.
          vec2 oldEdges = vec2(.5354, .7218) + down * (vec2(.229, .304) - down * vec2(.25, .07));
          vec2 cropEdges = vec2(914.0, 1186.0) / 1672.0;
          float reshape = 1.0 - smoothstep(0.0, .18, down);
          vec2 edges = oldEdges + reshape * (cropEdges - vec2(.5354, .7218));
          float along = clamp((handUV.x - edges.x) / (edges.y - edges.x), 0.0, 1.0);
          float width = max(fwidth(handUV.x), .0001);
          float cover = smoothstep(edges.x - width, edges.x + width, handUV.x) *
            (1.0 - smoothstep(edges.y - width, edges.y + width, handUV.x));
          float finish = smoothstep(.16, .22, down);
          float donorX = mix(oldEdges.x, oldEdges.y, clamp(along, .018, .982));
          vec4 ray = handRay * vec4(vec2(donorX, handUV.y) * 2.0 - 1.0, .5, 1.0);
          vec2 donorUV = ray.xy / -ray.z * photoScale + .5;
          vec3 skin = texture2D(photograph, donorUV).rgb;
          vec3 neighboringSkin = texture2D(photograph, donorUV + vec2(0.0, .013)).rgb;
          float grain = clamp((skin.r + .012) / (neighboringSkin.r + .012), .72, 1.35);
          float cropX = mix(cropEdges.x, cropEdges.y, clamp(along, .012, .988));
          vec3 cropColor = texture2D(approvedHand, vec2(cropX, .001)).rgb;
          vec3 joinColor = mix(cropColor, cropColor * grain, smoothstep(0.0, .028, down));
          vec3 armColor = mix(joinColor, skin * exposure, smoothstep(0.0, .19, down));
          return vec4(mix(armColor, oldColor.rgb, finish), mix(cover, oldArm * oldColor.a, finish));
        }
        void main() {
          vec4 color = texture2D(photograph, texel);
          float accents = lamp(texel, vec2(.3564, .675)) * .38
            + lamp(texel, vec2(.4725, .671)) * .56
            + lamp(texel, vec2(.569, .665)) * .41
            + lamp(texel, vec2(.705, .681)) * .32;
          vec3 photo = color.rgb;
          float spill = .78 * lightPool(texel, vec2(.30, .45), vec2(.20, .22))
            + .91 * lightPool(texel, vec2(.69, .46), vec2(.22, .23));
          float exposure = mix(.27, .34, edge) + .30 * spill;
          color.rgb *= exposure;
          color.rgb += edge * accents * vec3(.95, .17, .014);
          float handAmount = 0.0;
          if (edge > 0.0) {
            float mask = texture2D(highlights, texel).a;
            color.rgb += crowdHighlight(photo, mask, .22 * spill);
          } else {
            // Reproject the selected cutout onto the same 3D surface as the original hand.
            vec4 reference = handProjection * vec4(surface, 1.0);
            vec2 handUV = reference.xy / reference.w * .5 + .5;
            float oldArm = texture2D(originalArm, texel).a;
            handAmount = oldArm * color.a;
            if (all(greaterThanEqual(handUV, vec2(0.0, -.22))) && all(lessThanEqual(handUV, vec2(1.0)))) {
              vec4 cutout = handUV.y >= 0.0 ? texture2D(approvedHand, handUV)
                : lowerArmPhoto(handUV, color, oldArm, exposure);
              float retained = color.a * (1.0 - oldArm);
              float inserted = cutout.a;
              float combined = inserted + retained * (1.0 - inserted);
              color.rgb = (cutout.rgb * inserted + color.rgb * retained * (1.0 - inserted)) / max(combined, .00001);
              color.a = combined;
              handAmount = max(inserted, oldArm * retained);
            }
          }
          float x = min(texel.x, 1.0 - texel.x);
          float y = min(texel.y, 1.0 - texel.y);
          color.a *= mix(1.0, smoothstep(0.0, .11, x) * smoothstep(0.0, .075, y), edge);
          color.a *= mix(smoothstep(0.0, .125, texel.y), smoothstep(.02, .68, surface.y), edge);
          color.rgb *= mix(1.0, reveal, edge);   // 손 레이어는 처음부터 보임
          gl_FragColor = color;
          #include <colorspace_fragment>
          float printChannel = .29 + .63 * edge * texture2D(faceMatte, texel).a;
          gl_FragColor.b = mix(printChannel, min(gl_FragColor.b, .19), handAmount);
        }`
    });
    const surface = new THREE.Mesh(geometry, material);
    surface.renderOrder = order;
    scene.add(surface);
    return surface;
  }
  projectedPhoto(backCanvas, y => distance - 4.4 * THREE.MathUtils.smoothstep(-y, .06, .48), 1, 1);
  const nearDepth = y => THREE.MathUtils.lerp(2.55, 1.65, THREE.MathUtils.smoothstep(y, -.42, .17));
  const nearLayer = projectedPhoto(nearCanvas, nearDepth, 2, 0);

  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = [];
  for (let i = 0; i < 130; i++) {
    dustPositions.push((Math.random() - .5) * 10, 1.1 + Math.random() * 3, -9 + Math.random() * 12);
  }
  dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.ShaderMaterial({
    uniforms: { lightTime },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float lightTime;
      varying float glow;
      void main() {
        float seed = position.x * 2.1 + position.z * 3.4;
        vec3 p = position + vec3(.18 * sin(lightTime * .9 + seed),
          .16 * cos(lightTime * .65 + seed), 0.0);
        vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp(23.0 / -viewPosition.z, 2.0, 9.0);
        glow = .018 + .012 * fract(sin(seed) * 43758.5453);
      }`,
    fragmentShader: `varying float glow;
      void main() {
        vec2 p = gl_PointCoord - .5;
        float falloff = 1.0 - smoothstep(.02, .5, length(p));
        gl_FragColor = vec4(1.0, .23, .07, glow * falloff * .65);
      }`
  }));
  dust.renderOrder = 1.5;
  scene.add(dust);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
    throw new Error(gl.getShaderInfoLog(vertexShader) || gl.getShaderInfoLog(fragmentShader) || gl.getProgramInfoLog(program));
  };
  renderer.domElement.setAttribute('aria-hidden', 'true');
  let width = 0, height = 0;
  // Positions are fixed on the venue panorama. Two low angles sometimes cross the crowd.
  const cuePositions = [
    [.13, .542, .104, .025, -.44], [.264, .532, .128, .019, .20],
    [.419, .557, .090, .023, -.49], [.563, .538, .105, .020, .36],
    [.731, .535, .128, .021, -.25], [.868, .552, .105, .021, .44],
    [.233, .465, .103, .021, .60], [.764, .457, .098, .022, -.63]
  ];
  let lastCue = -1, cueStart = 0, cueLength = 0, nextCue = 3.8 + Math.random() * 2.5;
  function updateCue(time, animated) {
    cueStrength.value = 0;
    if (!animated) return;
    if (time >= nextCue) {
      const offset = 1 + Math.floor(Math.random() * (cuePositions.length - 1));
      lastCue = lastCue < 0 ? Math.floor(Math.random() * cuePositions.length) : (lastCue + offset) % cuePositions.length;
      const [u, v, length, width, angle] = cuePositions[lastCue];
      cueArea.value.set(u, v, length, width);
      cueAngle.value = angle;
      cueStart = time;
      cueLength = 1.8 + Math.random() * 1.0;
      nextCue = time + cueLength + 5 + Math.random() * 6;
    }
    if (cueLength === 0) return;
    const elapsed = (time - cueStart) / cueLength;
    cueStrength.value = THREE.MathUtils.smoothstep(elapsed, 0, .24) *
      (1 - THREE.MathUtils.smoothstep(elapsed, .52, 1));
  }

  function draw(view, time, animated) {
    lightTime.value = time;
    const intro = view.intro ?? 1;
    const rise = 1 - Math.pow(1 - THREE.MathUtils.smoothstep(intro, 0, .55), 3);
    nearLayer.position.y = -.8 * (1 - rise);                     // 손이 아래에서 올라옴
    reveal.value = THREE.MathUtils.smoothstep(intro, .45, 1);    // 그다음 공연장이 밝아짐
    exitLight.value = THREE.MathUtils.smoothstep(view.progress, .25, .6);
    updateCue(time, animated && intro >= 1);
    rearExit.draw(view.progress, view.doorOpen);
    const lightZone = cueStrength.value > .5 ? String(lastCue + 1) : 'ambient';
    if (container.dataset.lightZone !== lightZone) container.dataset.lightZone = lightZone;
    dust.visible = animated && reveal.value > .5;
    if (width !== container.clientWidth || height !== container.clientHeight) {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
    }
    const contain = Math.max(stageHeight / (2 * distance), stageWidth / (2 * distance * camera.aspect));
    const wide = Math.min(Math.tan(THREE.MathUtils.degToRad(37)), contain);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(wide / view.zoom));
    camera.updateProjectionMatrix();
    camera.position.set(view.x, eye + view.y, view.z);
    camera.rotation.set(view.pitch, -view.yaw, 0);
    renderer.render(scene, camera);
  }
  return { canvas: renderer.domElement, draw };
};
