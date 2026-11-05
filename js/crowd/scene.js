// AOMG 3D 공연장 — 카메라·스크롤 (원본 AOMG-Crowd v48, 사이트 연결용 수정: 공연장 섹션 기준 스크롤, 손 인트로, GSAP 대신 직접 스크롤 계산)
(() => {
  const frame = document.getElementById('crowd-frame');
  const exploreLabel = frame.getAttribute('aria-label');
  const still = document.getElementById('crowd-still');
  still.style.visibility = 'hidden';   // 3D 준비 전 사진이 먼저 번쩍이지 않게 (3D 실패 시에만 사진)
  const space = document.getElementById('crowd-space');
  const track = document.getElementById('crowd-track');
  const lookHint = document.getElementById('crowd-hint');
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const focus = { x: .428, y: .417, zoom: 3.45 };
  const aim = { yaw: 0, pitch: 0, x: 0, z: 0 };
  const view = { ...aim };
  const pressed = new Set();
  const turnKeys = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    ArrowUp: [0, 1], ArrowDown: [0, -1]
  };
  const stepKeys = new Set(['w', 'a', 's', 'd']);
  const route = { progress: 0, intro: 0 };
  let venue, drag, lastPose, routeStart, dirty = true, hasLooked = false;
  let lightTime = 0, lightDelta = 0;

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  function smooth(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }
  const invalidate = () => { dirty = true; };
  // 문서 전체가 아니라 공연장 섹션 기준. 섹션 맨 위에서 1화면 동안은 둘러보기, 그 뒤부터 문 경로(0 → 1)
  const section = () => {
    const r = track.getBoundingClientRect(), vh = innerHeight;
    const range = Math.max(1, track.offsetHeight - vh * 2);   // 마지막 1화면은 LIVE가 빛 번짐과 함께 덮으며 올라옴 (css .crowd + .live)
    const intro = vh * .8, hold = vh * .6;
    const scrolled = -r.top;
    return {
      intro: clamp(scrolled / intro, 0, 1),
      progress: clamp((scrolled - intro - hold) / (range - intro - hold), 0, 1),
      visible: r.top < vh && r.bottom > 0
    };
  };
  const canLook = () => Boolean(venue) && route.progress === 0 && route.intro >= 1 && section().visible;

  function turnBy(yaw, pitch) {
    const maxLead = .14;
    aim.yaw = clamp(aim.yaw + yaw, view.yaw - maxLead, view.yaw + maxLead);
    aim.pitch = clamp(clamp(aim.pitch + pitch, view.pitch - maxLead, view.pitch + maxLead), -1.08, 1.08);
    invalidate();
  }

  function explorePose() {
    const away = Math.acos(clamp(Math.cos(view.yaw), -1, 1));
    const close = 1 - smooth((away + Math.abs(view.pitch) * .7 - .12) / .65);
    return {
      yaw: view.yaw + Math.atan((focus.x - .5) * 1.8) * close,
      pitch: view.pitch + Math.atan((.5 - focus.y) * 1.013) * close,
      zoom: Math.pow(focus.zoom, close),
      x: view.x + .115 * Math.sin(view.yaw),
      y: .045 * Math.sin(view.pitch),
      z: view.z + .06 * (1 - Math.cos(view.yaw))
    };
  }

  function draw() {
    const progress = route.progress;
    const pose = routeStart ? exitPose(routeStart, progress) : explorePose();
    pose.progress = progress;
    pose.intro = route.intro;
    pose.doorOpen = smooth((progress - .67) / .23);
    if (venue) {
      const key = [pose.yaw, pose.pitch, pose.zoom, pose.x, pose.y, pose.z,
        frame.clientWidth, frame.clientHeight, calm.matches, lightTime, progress, route.intro].join('|');
      if (key !== lastPose) {
        venue.draw(pose, lightTime, !calm.matches && progress === 0);
        lastPose = key;
      }
      const degrees = Math.round(pose.yaw * 180 / Math.PI);
      space.dataset.bearing = String((degrees % 360 + 360) % 360);
      space.dataset.pitch = pose.pitch.toFixed(3);
      space.dataset.camera = progress === 0 ? 'explore' : progress < .4 ? 'turning'
        : progress < .67 ? 'approaching' : progress < .9 ? 'opening' : 'inside';
      space.dataset.progress = progress.toFixed(3);
    } else {
      const w = frame.clientWidth, h = frame.clientHeight;
      const scale = Math.min(w / 1672, h / 941) * focus.zoom;
      const left = w / 2 - focus.x * 1672 * scale;
      const top = h / 2 - focus.y * 941 * scale;
      still.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
    }

    lookHint.style.opacity = canLook() && !hasLooked ? 1 : 0;
  }

  function exitPose(start, progress) {
    const turn = smooth(progress / .4);
    const toRear = Math.atan2(Math.sin(Math.PI - start.yaw), Math.cos(Math.PI - start.yaw));
    const approach = 2.15 * smooth((progress - .4) / .32);
    const through = 4.45 * smooth((progress - .77) / .23);
    return {
      yaw: start.yaw + toRear * turn,
      pitch: start.pitch * (1 - turn) - .035 * turn * (1 - through / 4.45),
      zoom: 1 + (start.zoom - 1) * (1 - smooth(progress / .29)),
      x: start.x * (1 - turn),
      y: start.y * (1 - turn),
      z: start.z * (1 - turn) + approach + through
    };
  }

  function reset() {
    aim.yaw = Math.round(view.yaw / (2 * Math.PI)) * 2 * Math.PI;
    aim.pitch = aim.x = aim.z = 0;
    invalidate();
  }

  function syncMode() {
    const next = route.progress > 0;
    if (next === Boolean(routeStart)) return;
    routeStart = next ? explorePose() : undefined;
    frame.classList.toggle('walking', next);
    frame.setAttribute('aria-label', next
      ? '스크롤하면 뒤쪽 출입문으로 이동합니다. 맨 위에서 다시 둘러볼 수 있습니다.'
      : exploreLabel);
    pressed.clear();
    if (drag && frame.hasPointerCapture(drag.id)) frame.releasePointerCapture(drag.id);
    drag = undefined;
    frame.classList.remove('dragging');
    if (next) {
      Object.assign(aim, view);
    } else {
      hasLooked = false;
    }
    invalidate();
  }

  frame.addEventListener('pointerdown', event => {
    if (!canLook() || !event.isPrimary || event.button !== 0) return;
    frame.focus({ preventScroll: true });
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    frame.setPointerCapture(event.pointerId);
  });
  frame.addEventListener('pointermove', event => {
    if (!canLook() || drag?.id !== event.pointerId) return;
    const x = event.clientX - drag.x, y = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(x, y) < 5) return;
    drag.moved = true;
    hasLooked = true;
    frame.classList.add('dragging');
    drag.x = event.clientX;
    drag.y = event.clientY;
    turnBy(-x * .0024, y * .0018);
  });
  function finishDrag(event) {
    if (drag?.id !== event.pointerId) return;
    drag = undefined;
    frame.classList.remove('dragging');
  }
  frame.addEventListener('pointerup', finishDrag);
  frame.addEventListener('pointercancel', finishDrag);
  frame.addEventListener('lostpointercapture', finishDrag);
  frame.addEventListener('dblclick', () => { if (canLook()) reset(); });
  frame.addEventListener('blur', () => pressed.clear());
  window.addEventListener('blur', () => pressed.clear());

  frame.addEventListener('keydown', event => {
    if (!canLook() || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Escape') {
      pressed.clear();
      reset();
    } else if (turnKeys[event.key]) {
      event.preventDefault();
      hasLooked = true;
      const [yaw, pitch] = turnKeys[event.key];
      const step = event.repeat ? .014 : .055;
      turnBy(yaw * step, pitch * step);
    } else if (stepKeys.has(event.key.toLowerCase())) {
      event.preventDefault();
      pressed.add(event.key.toLowerCase());
    }
  });
  window.addEventListener('keyup', event => pressed.delete(event.key.toLowerCase()));

  function tick(_time, delta) {
    const dt = Math.min(delta, 48);
    if (pressed.size) {
      const lateral = Number(pressed.has('d')) - Number(pressed.has('a'));
      const forward = Number(pressed.has('w')) - Number(pressed.has('s'));
      const stride = dt * .00125 / Math.max(1, Math.hypot(lateral, forward));
      const sin = Math.sin(view.yaw), cos = Math.cos(view.yaw);
      aim.x = clamp(aim.x + (lateral * cos + forward * sin) * stride, -.53, .53);
      aim.z = clamp(aim.z + (lateral * sin - forward * cos) * stride, -.46, .46);
    }
    const blend = calm.matches ? 1 : 1 - Math.exp(-dt / 66);
    for (const axis of ['yaw', 'pitch', 'x', 'z']) {
      const difference = aim[axis] - view[axis];
      if (!difference) continue;
      const movement = axis === 'yaw' || axis === 'pitch'
        ? clamp(difference * blend, -dt * .00105, dt * .00105)
        : difference * blend;
      view[axis] = Math.abs(difference) < .00015 ? aim[axis] : view[axis] + movement;
      dirty = true;
    }
    if (venue && !calm.matches && !routeStart && !document.hidden) {
      lightDelta += dt;
      if (lightDelta >= 1000 / 30) {
        lightTime += lightDelta / 1000;
        lightDelta = 0;
        dirty = true;
      }
    }
    if (dirty) {
      draw();
      dirty = false;
    }
  }

  function onScroll() {
    const { progress, intro } = section();
    if (progress !== route.progress || intro !== route.intro) { route.progress = progress; route.intro = intro; invalidate(); }
    syncMode();
    if (intro < 1 && !routeStart && (aim.yaw || aim.pitch || aim.x || aim.z)) reset();   // 손 인트로로 돌아가면 다시 무대 정면
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  calm.addEventListener('change', invalidate);
  onScroll();
  draw();
  new ResizeObserver(invalidate).observe(frame);
  // 화면 근처에 있을 때만 그림 (다른 섹션에서는 멈춤)
  let near = false, raf = 0, last = 0;
  function loop(time) {
    tick(time, last ? time - last : 16);
    last = time;
    raf = near ? requestAnimationFrame(loop) : 0;
  }
  new IntersectionObserver(([entry]) => {
    near = entry.isIntersecting;
    if (near && !raf) { last = 0; raf = requestAnimationFrame(loop); }
  }, { rootMargin: '50% 0px' }).observe(track);

  const photos = ['crowd-plate', 'crowd-room-plate', 'crowd-clean-plate', 'crowd-room-face-matte', 'crowd-stage-face-matte', 'crowd-hand']
    .map(id => document.getElementById(id));
  Promise.all(photos.map(photo => photo.decode())).then(() => {
    const room = window.createConcertSpace(space, ...photos, explorePose());
    venue = room;
    draw();
    space.append(room.canvas);
    still.hidden = true;
    space.dataset.renderer = '3d';
    room.canvas.addEventListener('webglcontextlost', () => {
      venue = undefined;
      lastPose = undefined;
      room.canvas.remove();
      still.hidden = false;
      still.style.visibility = '';
      space.dataset.renderer = 'photo';
      invalidate();
    }, { once: true });
    invalidate();
  }).catch(error => {
    venue = undefined;
    invalidate();
    still.style.visibility = '';
    console.warn('The 3D room could not start. The static stage photo is available.', error);
    space.dataset.renderer = 'photo';
  });
})();
