// The live 3D view, loaded only when the visitor presses "Xem 3D" (three.js is a separate chunk, so the page itself
// only ships the still image). It renders the layout the still was made from, from the same camera, so its first frame
// lines up with it; dragging turns the camera around the city, and the river, the ghe and a slow sway run unless motion
// is reduced. Rendering stops while the hero is off screen or the tab is hidden.
import * as THREE from 'three';
import {buildSaigonScene} from './scene';

export type Live3d = {stop(): void};

const MAX_YAW = 0.3;

export function startSaigon3d(host: HTMLElement, onFirstFrame: () => void): Live3d {
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const view = buildSaigonScene(renderer, {shadowMapSize: small ? 1024 : 2048, waterTextureSize: small ? 256 : 512});
  const reduced = () => document.documentElement.dataset.motion === 'reduced';

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    view.setViewport(w, h);
  };
  resize();
  const resizer = new ResizeObserver(resize);
  resizer.observe(host);

  // Drag to turn: horizontal drags only, so vertical swipes still scroll the page (touch-action: pan-y in CSS).
  let target = 0, yaw = 0, dragX: number | null = null;
  const down = (e: PointerEvent) => {
    dragX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (dragX === null) return;
    target = Math.max(-MAX_YAW, Math.min(MAX_YAW, target - (e.clientX - dragX) * 0.004));
    dragX = e.clientX;
  };
  const up = () => (dragX = null);
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  let visible = true, first = true, time = 0, last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!reduced()) time += dt;
    const sway = reduced() ? 0 : Math.sin(time * 0.11) * 0.06;
    yaw += (target + sway - yaw) * Math.min(1, dt * 4);
    view.setYaw(yaw);
    view.tick(time);
    renderer.render(view.scene, view.camera);
    if (first) {
      first = false;
      onFirstFrame();
    }
  };
  const sync = () => renderer.setAnimationLoop(visible && document.visibilityState === 'visible' ? frame : null);
  const watcher = new IntersectionObserver(entries => {
    visible = entries[entries.length - 1].isIntersecting;
    sync();
  });
  watcher.observe(host);
  document.addEventListener('visibilitychange', sync);
  sync();

  return {
    stop() {
      renderer.setAnimationLoop(null);
      watcher.disconnect();
      resizer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      view.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
