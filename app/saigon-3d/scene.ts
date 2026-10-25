// The hero's Saigon skyline in 3D: Chợ Bến Thành, Nhà thờ Đức Bà, Bitexco, the Ba Son bridge and Landmark 81 seen
// across the Saigon river from the Thủ Thiêm bank on a sunny afternoon, with a ghe ve chai and its rower in a nón lá.
// This is the live view the visitor can turn on (./live.ts). The still the page shows first is a Blender render of the
// same layout from the same camera (scripts/blender/saigon_still.py, which replays this file's random sequence for the
// far city and the trees), so the two line up when the visitor switches; keep them in step when changing either.
//
// Units are roughly tens of metres. The small landmarks are drawn larger than life (forced perspective) so they read
// next to the towers. The camera looks level (no pitch) so verticals stay vertical, and an off-axis frustum frames the
// band instead of tilting the camera.
import * as THREE from 'three';
import {Water} from 'three/addons/objects/Water.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The framing every crop starts from: world x/y at the z = -10 plane, a band 4.2 times as wide as it is tall. Wider or
// narrower viewports crop it like object-fit: cover anchored to the bottom right, so the landmarks stay on the right.
export const FRAME = {x0: -123, x1: 163, y0: -12, y1: 56, z: -10};
export const FRAME_ASPECT = (FRAME.x1 - FRAME.x0) / (FRAME.y1 - FRAME.y0);
const EYE = new THREE.Vector3(40, 5, 120);
const PIVOT = new THREE.Vector3(56, 0, -10);
const SUN = new THREE.Vector3(120, 62, 46).normalize();
const HAZE = 0x93a98a;

export type SaigonSceneOptions = {shadowMapSize: number; waterTextureSize: number};
export type SaigonScene = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Frame the canvas: cover the reference band, anchored bottom right. */
  setViewport(width: number, height: number): void;
  /** Turn the camera around the city, in radians. */
  setYaw(angle: number): void;
  /** Advance the river and the ghe to a time in seconds. */
  tick(seconds: number): void;
  dispose(): void;
};

// Park–Miller, restarted at 81 by every build: each "Xem 3D" shows the same city, the one the Blender still replays.
let seed = 81;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

function canvasTexture(width: number, height: number, draw: (g: CanvasRenderingContext2D) => void, repeat = true) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Apartment and office facades: a white wall (tinted per building) with two floors of window bands and balconies per
// 4×4-unit tile. Large, soft shapes, so the far city reads as buildings rather than texture noise.
const facadeTexture = () =>
  canvasTexture(128, 128, g => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 2; y++) {
      g.fillStyle = 'rgba(70, 92, 90, .55)';
      g.fillRect(10, 14 + y * 64, 108, 30);
      g.fillStyle = 'rgba(255, 255, 255, .75)';
      for (let x = 0; x < 3; x++) g.fillRect(10 + x * 36 + 33, 14 + y * 64, 3, 30);
      g.fillStyle = 'rgba(40, 50, 45, .18)';
      g.fillRect(0, 50 + y * 64, 128, 6);
    }
  });

// Curtain wall: floor lines and mullions over a glass that is mostly reflection (colour comes from the environment).
const glassTexture = (floors: number, mullions: number) =>
  canvasTexture(256, 256, g => {
    const sky = g.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, '#ffffff');
    sky.addColorStop(1, '#b9c8c4');
    g.fillStyle = sky;
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#b4c4bf';
    for (let i = 0; i < floors; i++) g.fillRect(0, (i * 256) / floors, 256, 1);
    g.fillStyle = '#9fb1ab';
    for (let i = 0; i < mullions; i++) g.fillRect((i * 256) / mullions, 0, 2, 256);
  });

const brickTexture = () =>
  canvasTexture(128, 128, g => {
    g.fillStyle = '#a65a3e';
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 8; x++) {
        g.fillStyle = `hsl(${14 + rand() * 6} ${42 + rand() * 12}% ${36 + rand() * 9}%)`;
        g.fillRect(x * 16 + (y % 2) * 8, y * 8, 15, 7);
      }
  });

const strawTexture = () =>
  canvasTexture(128, 128, g => {
    g.fillStyle = '#ead9a6';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(150, 120, 60, .45)';
    for (let y = 6; y < 128; y += 11) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(128, y);
      g.stroke();
    }
  });

// A tileable normal map for the river: a few sine swells plus fine ripple, derived from a height field.
function riverNormals() {
  const size = 256;
  const height = new Float32Array(size * size);
  const waves = Array.from({length: 7}, (_, i) => ({
    kx: Math.round(1 + rand() * (3 + i * 2)) * (rand() > 0.5 ? 1 : -1),
    ky: Math.round(1 + rand() * (2 + i * 2)),
    a: 1 / (1 + i * 0.7),
    p: rand() * Math.PI * 2,
  }));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let h = 0;
      for (const w of waves) h += w.a * Math.sin(((w.kx * x + w.ky * y) / size) * Math.PI * 2 + w.p);
      height[y * size + x] = h;
    }
  return canvasTexture(size, size, g => {
    const image = g.createImageData(size, size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = height[y * size + ((x + 1) % size)] - height[y * size + ((x + size - 1) % size)];
        const dy = height[((y + 1) % size) * size + x] - height[((y + size - 1) % size) * size + x];
        const n = new THREE.Vector3(-dx, -dy, 2.2).normalize();
        const i = (y * size + x) * 4;
        image.data[i] = (n.x * 0.5 + 0.5) * 255;
        image.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
        image.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
        image.data[i + 3] = 255;
      }
    g.putImageData(image, 0, 0);
  });
}

// The sky the glass reflects: pale green-blue overhead, warm haze at the horizon, the sun high on the right.
function skyEnvironment(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vDir; uniform vec3 sun;
        void main(){
          float h = vDir.y;
          vec3 top = vec3(.5,.68,.68), horizon = vec3(1.0,.88,.66), ground = vec3(.16,.22,.18);
          vec3 c = h > 0. ? mix(horizon, top, pow(h, .55)) : mix(horizon * .6, ground, pow(-h, .4));
          c += vec3(1.0,.9,.7) * pow(max(dot(vDir, sun), 0.), 180.) * 6.;
          gl_FragColor = vec4(c, 1.0);
        }`,
      uniforms: {sun: {value: SUN}},
    }),
  );
  env.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(env, 0.02);
  pmrem.dispose();
  sky.geometry.dispose();
  (sky.material as THREE.Material).dispose();
  return target;
}

// The far bank glows with afternoon haze and fades into the hero's green above the skyline.
const hazeTexture = () =>
  canvasTexture(
    4,
    256,
    g => {
      const gradient = g.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, 'rgba(127,168,145,0)');
      gradient.addColorStop(0.55, 'rgba(160,196,160,.28)');
      gradient.addColorStop(0.85, 'rgba(232,222,170,.62)');
      gradient.addColorStop(1, 'rgba(244,226,176,.72)');
      g.fillStyle = gradient;
      g.fillRect(0, 0, 4, 256);
    },
    false,
  );

// A box whose texture keeps its scale: UVs measured in 4-unit tiles, so tall and short buildings share window sizes.
function tiledBox(w: number, h: number, d: number, tile = 4) {
  const geometry = new RoundedBoxGeometry(w, h, d, 2, 0.22);
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  const normal = geometry.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(normal.getX(i)), ny = Math.abs(normal.getY(i));
    const across = nx > 0.5 ? d : w;
    uv.setXY(i, (uv.getX(i) * across) / tile, (uv.getY(i) * (ny > 0.5 ? d : h)) / tile);
  }
  return geometry;
}

function archShape(width: number, height: number) {
  const r = width / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(-r, height - r);
  s.absarc(0, height - r, r, Math.PI, 0, true);
  s.lineTo(r, 0);
  s.lineTo(-r, 0);
  return new THREE.ShapeGeometry(s, 12);
}

// A hipped roof over a w × d plan, its ridge `ridge` long along x; a pyramid when the ridge is 0. Base at y = 0.
function hipRoof(w: number, d: number, h: number, ridge = 0) {
  const [x, z, r] = [w / 2, d / 2, ridge / 2];
  const a = [-x, 0, z], b = [x, 0, z], c = [x, 0, -z], e = [-x, 0, -z], left = [-r, h, 0], right = [r, h, 0];
  const faces = ridge ? [[a, b, right, left], [b, c, right], [c, e, left, right], [e, a, left]] : [[a, b, left], [b, c, left], [c, e, left], [e, a, left]];
  const positions = faces.flatMap(f => (f.length === 4 ? [f[0], f[1], f[2], f[0], f[2], f[3]] : f).flat());
  const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const triangularPrism = (width: number, height: number, depth: number) => {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(0, height);
  s.lineTo(-width / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, {depth, bevelEnabled: false});
  g.translate(0, 0, -depth / 2);
  return g;
};

export function buildSaigonScene(renderer: THREE.WebGLRenderer, options: SaigonSceneOptions): SaigonScene {
  seed = 81;
  const disposables: {dispose(): void}[] = [];
  const keep = <T extends {dispose(): void}>(x: T) => (disposables.push(x), x);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(HAZE, 130, 300);
  const envTarget = keep(skyEnvironment(renderer));
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.32;

  const shadow = (m: THREE.Mesh, receive = true) => ((m.castShadow = true), (m.receiveShadow = receive), m);
  const mat = <T extends THREE.Material>(m: T) => keep(m);

  // Light: one warm sun from the top right (the page's key light), a green-tinted sky fill.
  scene.add(new THREE.HemisphereLight(0xd6e6dc, 0x2c3d31, 0.45));
  const sun = new THREE.DirectionalLight(0xffdcae, 4.6);
  sun.position.copy(SUN).multiplyScalar(200).add(new THREE.Vector3(20, 0, -20));
  sun.target.position.set(20, 0, -20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(options.shadowMapSize, options.shadowMapSize);
  Object.assign(sun.shadow.camera, {left: -150, right: 150, top: 110, bottom: -110, near: 50, far: 420});
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  // Haze backdrop behind the far city.
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 140),
    mat(new THREE.MeshBasicMaterial({map: keep(hazeTexture()), transparent: true, depthWrite: false, fog: false})),
  );
  haze.position.set(40, 40, -280);
  scene.add(haze);

  // City ground: two quays with the inlet the Ba Son bridge crosses between them. The river runs underneath it all.
  const groundMat = mat(new THREE.MeshStandardMaterial({color: 0x56685a, roughness: 0.95}));
  const quayMat = mat(new THREE.MeshStandardMaterial({color: 0x8f927f, roughness: 0.9}));
  for (const [x0, x1] of [[-800, 60], [80, 900]] as const) {
    const quay = shadow(new THREE.Mesh(keep(new THREE.BoxGeometry(x1 - x0, 1.2, 300)), groundMat));
    quay.position.set((x0 + x1) / 2, 0, -150);
    scene.add(quay);
    const edge = new THREE.Mesh(keep(new THREE.BoxGeometry(x1 - x0, 1.3, 0.6)), quayMat);
    edge.position.set((x0 + x1) / 2, 0, -0.1);
    edge.receiveShadow = true;
    scene.add(edge);
  }
  const inletBack = shadow(new THREE.Mesh(keep(new THREE.BoxGeometry(20, 1.2, 270)), groundMat));
  inletBack.position.set(70, 0, -165);
  scene.add(inletBack);

  // Far city: one merged mesh, low on the left (under the copy), denser and taller behind the towers on the right.
  {
    const parts: THREE.BufferGeometry[] = [];
    const colors: number[][] = [];
    const palette = ['#efe3c4', '#d8e2dc', '#f1d59a', '#bcd3d0', '#e9c8b1', '#c9dcb8', '#f4f0e6', '#d9cbb4', '#e6b98f'].map(c => new THREE.Color(c).toArray());
    for (let i = 0; i < 300; i++) {
      const x = -420 + rand() * 820;
      const z = -18 - rand() * 120;
      if (x > 58 && x < 82 && z > -40) continue;
      const right = Math.min(1, Math.max(0, (x + 20) / 140));
      const depth = (-z - 18) / 120;
      // Keep the sky clear around the landmarks' silhouettes: lower blocks in front of and around them.
      const nearLandmark = [8, 26, 46, 102].some(lx => Math.abs(x - lx) < 9) ? 0.45 : 1;
      // Under the copy (left of the market) the far bank stays low, so the hero's meta line reads cleanly over it.
      const underCopy = x < -4 && x > -140;
      const h = underCopy ? 1.5 + rand() * (1.5 + depth * 2) : (2 + rand() * (4 + right * 14 + depth * 10) + (rand() > 0.9 ? right * 14 : 0)) * nearLandmark;
      const w = 4 + rand() * 7, d = 4 + rand() * 7;
      const g = tiledBox(w, h, d);
      g.translate(x, h / 2 + 0.6, z);
      parts.push(g);
      const c = palette[Math.floor(rand() * palette.length)];
      colors.push(c);
    }
    // Vertex colours carry the tint and a soft darkening towards the street, a cheap stand-in for ambient occlusion.
    const merged = keep(mergeGeometries(parts.map((g, i) => {
      const n = g.attributes.position.count;
      const c = new Float32Array(n * 3);
      const y = g.attributes.position;
      for (let k = 0; k < n; k++) {
        const shade = 0.68 + 0.32 * Math.min(1, (y.getY(k) - 0.6) / 7);
        c.set(colors[i].map(v => v * shade), k * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      return g;
    }))!);
    parts.forEach(g => g.dispose());
    const city = shadow(new THREE.Mesh(merged, mat(new THREE.MeshStandardMaterial({map: keep(facadeTexture()), vertexColors: true, roughness: 0.8}))));
    scene.add(city);
  }

  // Cây dầu along the river: tall bare trunks, small crowns high up. Instanced: one draw call each.
  {
    const spots: number[] = [];
    for (let x = -400; x < 360; x += 9 + rand() * 14) {
      if ((x > -140 && x < 34) || (x > 40 && x < 54) || (x > 92 && x < 110)) continue;
      spots.push(x);
    }
    const trunks = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.22, 0.32, 1, 6)), mat(new THREE.MeshStandardMaterial({color: 0x5b4e3d, roughness: 1})), spots.length);
    const crowns = new THREE.InstancedMesh(keep(new THREE.IcosahedronGeometry(1, 2)), mat(new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.95})), spots.length * 5);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const tint = new THREE.Color();
    spots.forEach((x, i) => {
      const h = 3.5 + rand() * 3.5, z = -2.5 - rand() * 3;
      trunks.setMatrixAt(i, m.compose(p.set(x, 0.6 + h / 2, z), q.identity(), s.set(1, h, 1)));
      for (let k = 0; k < 5; k++) {
        const r = 1.4 + rand() * 1.2;
        const a = (k / 5) * Math.PI * 2 + rand();
        const dx = k === 4 ? 0 : Math.cos(a) * 1.4, dz = k === 4 ? 0 : Math.sin(a) * 1.1, dy = k === 4 ? 1.3 : rand() * 0.6 - 0.4;
        crowns.setMatrixAt(i * 5 + k, m.compose(p.set(x + dx * 1.2, 0.6 + h + 0.8 + dy, z + dz), q.identity(), s.set(r * 1.375, r * 0.75, r * 1.21)));
        crowns.setColorAt(i * 5 + k, tint.setHSL(0.29 + rand() * 0.06, 0.4, 0.2 + rand() * 0.1));
      }
    });
    trunks.castShadow = crowns.castShadow = true;
    crowns.receiveShadow = true;
    scene.add(trunks, crowns);
  }

  // Chợ Bến Thành: the long cream hall under terracotta, the entrance pavilion and the clock tower with its hipped cap.
  {
    const market = new THREE.Group();
    const cream = mat(new THREE.MeshStandardMaterial({color: 0xead7a0, roughness: 0.85}));
    const trim = mat(new THREE.MeshStandardMaterial({color: 0xf6eed6, roughness: 0.8}));
    const roof = mat(new THREE.MeshStandardMaterial({color: 0xb5603f, roughness: 0.75}));
    const dark = mat(new THREE.MeshStandardMaterial({color: 0x33261e, roughness: 1}));
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = shadow(new THREE.Mesh(keep(geometry), material));
      mesh.position.set(x, y, z);
      market.add(mesh);
      return mesh;
    };
    add(new THREE.BoxGeometry(24, 6, 10), cream, 0, 3.6, 0);
    add(hipRoof(25, 11, 1.8, 14), roof, 0, 6.6, 0);
    add(new THREE.BoxGeometry(8, 9, 9), cream, 0, 5.1, 1.2);
    add(new THREE.BoxGeometry(8.6, 0.5, 9.6), trim, 0, 9.8, 1.2);
    for (const x of [-3.6, 3.6]) add(new THREE.BoxGeometry(0.7, 9, 0.4), trim, x, 5.1, 5.75);
    add(new THREE.BoxGeometry(4.2, 7, 4.2), trim, 0, 12.6, 2.2);
    add(new THREE.BoxGeometry(4.6, 0.35, 4.6), cream, 0, 15.9, 2.2);
    add(hipRoof(6.2, 6.2, 2.6), roof, 0, 16.1, 2.2);
    add(new THREE.CylinderGeometry(0.02, 0.08, 2.4, 6), dark, 0, 19.6, 2.2);
    const face = new THREE.Mesh(keep(new THREE.CircleGeometry(1.25, 32)), mat(new THREE.MeshStandardMaterial({color: 0xfffaea, roughness: 0.5})));
    face.position.set(0, 13.2, 4.36);
    const hands = new THREE.Mesh(keep(mergeGeometries([new THREE.BoxGeometry(0.14, 0.95, 0.05).translate(0, 0.42, 0), new THREE.BoxGeometry(0.7, 0.12, 0.05).translate(0.3, 0, 0)])!), dark);
    hands.position.set(0, 13.2, 4.41);
    const door = new THREE.Mesh(keep(archShape(3, 4.6)), dark);
    door.position.set(0, 0.6, 5.76);
    market.add(face, hands, door);
    for (const x of [-9, -5.5, 5.5, 9]) {
      const arch = new THREE.Mesh(keep(archShape(2, 3.4)), dark);
      arch.position.set(x, 1.4, 5.02);
      const pane = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.3, 0.8)), mat(new THREE.MeshStandardMaterial({color: 0x5b4a3a, roughness: 0.9})));
      pane.position.set(x, 5.6, 5.02);
      market.add(arch, pane);
    }
    market.position.set(8, 0, -9);
    scene.add(market);
  }

  // Nhà thờ Đức Bà: twin brick towers under slate spires, the gabled facade with its rose window and three portals.
  // The nave starts behind the facade, as in the still.
  {
    const cathedral = new THREE.Group();
    const brick = mat(new THREE.MeshStandardMaterial({map: keep(brickTexture()), roughness: 0.9}));
    brick.map!.repeat.set(1.2, 2.4);
    const slate = mat(new THREE.MeshStandardMaterial({color: 0x46504e, roughness: 0.45, metalness: 0.25}));
    const gold = mat(new THREE.MeshStandardMaterial({color: 0xe7c46a, roughness: 0.3, metalness: 0.9}));
    const trim = mat(new THREE.MeshStandardMaterial({color: 0xf6eed6, roughness: 0.8}));
    const dark = mat(new THREE.MeshStandardMaterial({color: 0x33261e, roughness: 1}));
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, cast = true) => {
      const mesh = new THREE.Mesh(keep(geometry), material);
      if (cast) shadow(mesh);
      mesh.position.set(x, y, z);
      cathedral.add(mesh);
      return mesh;
    };
    add(new THREE.BoxGeometry(8, 10, 15), brick, 0, 5.6, -6.5);
    add(triangularPrism(8.6, 3.6, 15), slate, 0, 10.6, -6.5);
    add(new THREE.BoxGeometry(6, 11, 2), brick, 0, 6.1, 1.05);
    add(triangularPrism(6, 3.4, 2), brick, 0, 11.6, 1.05);
    add(new THREE.CircleGeometry(1.5, 32), trim, 0, 8.4, 2.06, false);
    add(new THREE.CircleGeometry(1.2, 32), mat(new THREE.MeshStandardMaterial({color: 0x5a3b33, roughness: 0.2, emissive: 0x6b4214, emissiveIntensity: 0.25})), 0, 8.4, 2.08, false);
    add(archShape(2.4, 4), dark, 0, 0.6, 2.07, false);
    for (const x of [-4.6, 4.6]) {
      add(new THREE.BoxGeometry(3.6, 16, 3.6), brick, x, 8.6, 0.8);
      add(new THREE.BoxGeometry(4, 0.35, 4), trim, x, 16.6, 0.8);
      add(new THREE.ConeGeometry(2.2, 9, 8), slate, x, 21.1, 0.8).rotation.y = Math.PI / 8;
      for (const [px, pz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) add(new THREE.ConeGeometry(0.32, 2.2, 6), slate, x + px, 17.9, 0.8 + pz);
      add(mergeGeometries([new THREE.BoxGeometry(0.22, 1.9, 0.22), new THREE.BoxGeometry(1.1, 0.22, 0.22).translate(0, 0.35, 0)])!, gold, x, 26.6, 0.8, false);
      for (const [w, h, y] of [[1, 2.6, 12.6], [0.8, 2, 7.4], [1.6, 3, 0.6]]) add(archShape(w, h), dark, x, y, 2.62, false);
    }
    cathedral.position.set(26, 0, -10);
    scene.add(cathedral);
  }

  // Glass: reflection does most of the work; the texture adds floor lines and mullions.
  const glass = (color: number, floors: number, mullions: number, repeatY: number) => {
    const map = keep(glassTexture(floors, mullions));
    map.repeat.set(1, repeatY);
    return mat(new THREE.MeshPhysicalMaterial({color, map, metalness: 0.25, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.12, envMapIntensity: 1.3}));
  };

  // Bitexco Financial Tower: the lotus bud on an elliptical plan, the helipad cantilevered from its west face.
  {
    const profile = [[4.7, 0], [5.1, 9], [4.9, 17], [4.2, 23], [3.1, 28], [1.8, 31.5], [0.6, 33.6], [0.01, 34.4]].map(([r, y]) => new THREE.Vector2(r, y));
    const body = new THREE.LatheGeometry(profile, 48);
    body.scale(1, 1, 0.68);
    const tower = shadow(new THREE.Mesh(keep(body), glass(0x86b4aa, 18, 24, 1)));
    const padMat = mat(new THREE.MeshStandardMaterial({color: 0x5aa596, roughness: 0.5, metalness: 0.3}));
    const pad = shadow(new THREE.Mesh(keep(new THREE.CylinderGeometry(3.2, 3.2, 0.5, 40)), padMat));
    pad.position.set(-6.7, 22.6, 0);
    const ring = new THREE.Mesh(keep(new THREE.RingGeometry(1.6, 2.2, 40)), mat(new THREE.MeshBasicMaterial({color: 0xeaf5e0})));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-6.7, 22.86, 0);
    // The brace runs from the tower up to the pad's outer edge.
    const strut = shadow(new THREE.Mesh(keep(new THREE.BoxGeometry(5.2, 0.45, 0.7)), padMat));
    strut.position.set(-6.2, 20.8, 0);
    strut.rotation.z = -0.6;
    const bitexco = new THREE.Group();
    bitexco.add(tower, pad, ring, strut);
    bitexco.position.set(46, 0.6, -16);
    scene.add(bitexco);
  }

  // Landmark 81: a slender bundle of nine glass shafts on a podium, stepping up to the central one and its crown of fins.
  {
    const l81 = new THREE.Group();
    const heights = [[30, 40, 34], [43, 48, 45], [33, 41, 27]];
    const w = 2.75;
    const finMat = mat(new THREE.MeshStandardMaterial({color: 0xe8f1df, roughness: 0.3, metalness: 0.7}));
    for (let i = 0; i < 3; i++)
      for (let k = 0; k < 3; k++) {
        const h = heights[i][k];
        const tube = shadow(new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, w)), glass(0x93b6bb, Math.round(h / 3), 10, 1)));
        tube.position.set((i - 1) * w, h / 2, (k - 1) * w);
        const cap = new THREE.Mesh(keep(new THREE.BoxGeometry(w * 0.92, 0.5, w * 0.92)), finMat);
        cap.position.set((i - 1) * w, h + 0.25, (k - 1) * w);
        l81.add(tube, cap);
      }
    const podium = shadow(new THREE.Mesh(keep(new THREE.BoxGeometry(14, 3.2, 12)), glass(0x93b6bb, 3, 14, 1)));
    podium.position.y = 1.6;
    l81.add(podium);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const h = 3.5 + ((i * 5) % 7) * 0.7;
      const fin = new THREE.Mesh(keep(new THREE.BoxGeometry(0.16, h, 0.16)), finMat);
      fin.position.set(Math.cos(a) * 1.05, 48 + h / 2, Math.sin(a) * 1.05);
      l81.add(fin);
    }
    const mast = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.08, 0.16, 10, 6)), finMat);
    mast.position.set(0, 53, 0);
    l81.add(mast);
    l81.position.set(102, 0.6, -20);
    scene.add(l81);
  }

  // Ba Son bridge: a raised deck over the inlet and one white pylon, curving back from the main span like a blade, the
  // stays fanning from its upper half across the main span and a shorter back fan behind it.
  {
    const bridge = new THREE.Group();
    const concrete = mat(new THREE.MeshStandardMaterial({color: 0xe3e4da, roughness: 0.6}));
    const deck = shadow(new THREE.Mesh(keep(new THREE.BoxGeometry(46, 0.9, 3.4)), concrete));
    deck.position.set(69, 4.2, -6);
    bridge.add(deck);
    for (const x of [55, 85]) {
      const pier = shadow(new THREE.Mesh(keep(new THREE.BoxGeometry(1.2, 4, 2.4)), concrete));
      pier.position.set(x, 2, -6);
      bridge.add(pier);
    }
    // The blade: 25 rings of a tapering rectangle along a curve that leans back as it rises.
    const spine = Array.from({length: 25}, (_, i) => new THREE.Vector3(76 + 8 * (i / 24) ** 1.7, 0.6 + 25.5 * (i / 24), -6));
    const rings = spine.map((p, i) => {
      const t = i / 24, hw = 0.95 * (1 - t) + 0.1 * t, hd = 1 * (1 - t) + 0.14 * t;
      return [[-hw, hd], [hw, hd], [hw, -hd], [-hw, -hd]].map(([x, z]) => [p.x + x, p.y, p.z + z]);
    });
    const blade: number[] = [];
    for (let i = 0; i < 24; i++)
      for (let k = 0; k < 4; k++) {
        const [a, b, c, d] = [rings[i][k], rings[i][(k + 1) % 4], rings[i + 1][(k + 1) % 4], rings[i + 1][k]];
        blade.push(...a, ...b, ...c, ...a, ...c, ...d);
      }
    const bladeGeo = keep(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(blade, 3)));
    bladeGeo.computeVertexNormals();
    bridge.add(shadow(new THREE.Mesh(bladeGeo, concrete)));
    const anchors = [9, 11, 13, 15, 17, 19, 21, 23].map(i => spine[i]);
    const stays: number[] = [];
    const fan = (tops: THREE.Vector3[], xs: number[]) =>
      tops.forEach((top, i) => {
        for (const z of [-7.4, -4.6]) stays.push(top.x, top.y, z, xs[i], 4.7, z);
      });
    fan(anchors, [71, 68, 65, 62, 59, 56, 53, 50]);
    fan(anchors.filter((_, i) => i % 2), [82, 85, 88, 91]);
    const lines = new THREE.LineSegments(keep(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(stays, 3))), mat(new THREE.LineBasicMaterial({color: 0xf4f6ee, transparent: true, opacity: 0.85})));
    bridge.add(lines);
    scene.add(bridge);
  }

  // The ghe ve chai: a wooden sampan with upturned ends carrying the day's sorted haul, rowed by a woman in a nón lá.
  const boat = new THREE.Group();
  {
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-4.2, 1.5);
    hullShape.quadraticCurveTo(-3.6, 0.2, -2.4, 0);
    hullShape.lineTo(2.4, 0);
    hullShape.quadraticCurveTo(3.6, 0.2, 4.2, 1.5);
    hullShape.quadraticCurveTo(0, 0.85, -4.2, 1.5);
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, {depth: 1.7, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.2, bevelSegments: 3, curveSegments: 16});
    hullGeo.translate(0, -0.55, -0.85);
    const wood = mat(new THREE.MeshStandardMaterial({color: 0x4a3324, roughness: 0.75}));
    const hull = shadow(new THREE.Mesh(keep(hullGeo), wood));
    const rim = new THREE.Mesh(keep(new THREE.BoxGeometry(6.2, 0.12, 1.9)), mat(new THREE.MeshStandardMaterial({color: 0x8a6440, roughness: 0.6})));
    rim.position.y = 0.4;
    boat.add(hull, rim);
    const haul: [THREE.BufferGeometry, number, number, [number, number, number]][] = [
      [new RoundedBoxGeometry(1.5, 0.9, 1.3, 2, 0.08), 0xb8925f, 0.85, [-2.2, 0.85, 0]],
      [new RoundedBoxGeometry(1.4, 0.6, 1.2, 2, 0.06), 0xc9a774, 0.85, [-2.2, 1.6, 0.05]],
      [new RoundedBoxGeometry(1.5, 1.45, 1.35, 4, 0.5), 0xc4dde2, 0.35, [-0.55, 1.05, 0]],
      [new RoundedBoxGeometry(1.3, 1.05, 1.2, 4, 0.42), 0x9fbe8e, 0.7, [0.85, 0.85, 0.05]],
    ];
    for (const [geo, color, roughness, [x, y, z]] of haul) {
      const bale = shadow(new THREE.Mesh(keep(geo), mat(new THREE.MeshStandardMaterial({color, roughness}))));
      bale.position.set(x, y, z);
      boat.add(bale);
    }
    const shirt = mat(new THREE.MeshStandardMaterial({color: 0x4f7695, roughness: 0.8}));
    const skin = mat(new THREE.MeshStandardMaterial({color: 0xc6976d, roughness: 0.7}));
    const body = shadow(new THREE.Mesh(keep(new THREE.CapsuleGeometry(0.42, 1.2, 4, 12)), shirt));
    body.position.set(2.6, 1.55, 0);
    body.rotation.z = 0.12;
    const head = shadow(new THREE.Mesh(keep(new THREE.SphereGeometry(0.36, 20, 14)), skin));
    head.position.set(2.5, 2.75, 0);
    const hatGeo = new THREE.ConeGeometry(1.05, 0.62, 36, 1, true);
    const hat = shadow(new THREE.Mesh(keep(hatGeo), mat(new THREE.MeshStandardMaterial({map: keep(strawTexture()), roughness: 0.75, side: THREE.DoubleSide}))));
    hat.position.set(2.5, 3.25, 0);
    const arm = shadow(new THREE.Mesh(keep(new THREE.CapsuleGeometry(0.13, 0.95, 4, 8)), shirt));
    arm.position.set(3.05, 1.95, 0.3);
    arm.rotation.z = -0.9;
    const oar = shadow(new THREE.Mesh(keep(new THREE.CylinderGeometry(0.07, 0.07, 4, 8)), wood));
    oar.position.set(4.08, 0.8, 0.4);
    oar.rotation.z = 0.51;
    const oarBlade = shadow(new THREE.Mesh(keep(new THREE.BoxGeometry(0.5, 1.2, 0.08)), wood));
    oarBlade.position.set(4.95, -0.75, 0.4);
    oarBlade.rotation.z = 0.51;
    boat.add(body, head, hat, arm, oar, oarBlade);
    boat.scale.setScalar(1.25);
    boat.position.set(42, 0.25, 58);
    boat.rotation.y = 0.08;
    scene.add(boat);
  }

  // The Saigon river: reflections of the skyline and the sky, rippled by the normal map.
  const water = new Water(keep(new THREE.PlaneGeometry(2400, 300)), {
    textureWidth: options.waterTextureSize,
    textureHeight: options.waterTextureSize,
    waterNormals: keep(riverNormals()),
    sunDirection: SUN.clone(),
    sunColor: 0xffe2b0,
    waterColor: 0x123b37,
    distortionScale: 0.8,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(40, 0, 140);
  water.material.uniforms.size.value = 7;
  // A muddy river rather than a mirror, as in the still: a fixed share of reflection (seen this low, Fresnel would make
  // the whole river a copy of the pale far bank), tinted towards the water colour.
  water.material.fragmentShader = water.material.fragmentShader
    .replace('float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );', 'float reflectance = 0.24 + 0.22 * pow( ( 1.0 - theta ), 5.0 );')
    // Ripples smear reflections vertically: average a short vertical run of the mirror, distort mostly sideways.
    .replace(
      'vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );',
      `vec2 mirrorUv = mirrorCoord.xy / mirrorCoord.w + distortion * vec2( 1.0, 0.25 );
      vec3 reflectionSample = vec3( 0.0 );
      for ( int i = -4; i <= 4; i ++ ) reflectionSample += texture2D( mirrorSampler, mirrorUv + vec2( 0.0, float( i ) * 0.0045 ) ).rgb;
      reflectionSample /= 9.0;`,
    )
    .replace('( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight )', '( reflectionSample * vec3( 0.46, 0.56, 0.52 ) + specularLight * 0.3 )');
  keep(water.material);
  scene.add(water);

  const camera = new THREE.PerspectiveCamera(30, FRAME_ASPECT, 1, 900);
  let viewport = {w: FRAME_ASPECT, h: 1};
  let yaw = 0;

  // An off-axis frustum through the cropped band, measured at the reference plane, so the camera never tilts.
  function frame() {
    const a = viewport.w / viewport.h;
    const {x1, y0} = FRAME;
    let {x0, y1} = FRAME;
    if (a < FRAME_ASPECT) x0 = x1 - (y1 - y0) * a;
    else y1 = y0 + (x1 - x0) / a;
    const d = EYE.z - FRAME.z, n = camera.near;
    camera.projectionMatrix.makePerspective(((x0 - EYE.x) / d) * n, ((x1 - EYE.x) / d) * n, ((y1 - EYE.y) / d) * n, ((y0 - EYE.y) / d) * n, n, camera.far);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    const offset = EYE.clone().sub(PIVOT).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    camera.position.copy(PIVOT).add(offset);
    camera.rotation.set(0, yaw, 0);
    camera.updateMatrixWorld();
  }
  frame();

  const boatHome = boat.position.x;
  return {
    scene,
    camera,
    setViewport(width, height) {
      viewport = {w: Math.max(1, width), h: Math.max(1, height)};
      frame();
    },
    setYaw(angle) {
      yaw = angle;
      frame();
    },
    tick(t) {
      water.material.uniforms.time.value = t * 0.35;
      boat.position.x = boatHome + Math.sin(t * 0.05) * 10;
      boat.position.y = 0.25 + Math.sin(t * 1.3) * 0.08;
      boat.rotation.z = Math.sin(t * 1.1) * 0.025;
    },
    dispose() {
      disposables.forEach(d => d.dispose());
      scene.clear();
    },
  };
}
