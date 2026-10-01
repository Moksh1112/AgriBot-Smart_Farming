// AgriBot 3D scene: procedural rover + tomato field, driven by a 0..1 story progress.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

type Vec3 = [number, number, number];
interface StoryKey {
  p: number;
  x: number;
  cam: Vec3;
  look: Vec3;
  mast: number;
  arm: number;
  scan: number;
}
export type SensorId = 'camera' | 'probe' | 'dht' | 'rain' | 'pi' | 'radio' | 'solar' | 'drive';

export interface SceneApi {
  resize(width: number, height: number): void;
  update(progress: number, time: number): void;
  plantRect(width: number, height: number): { x: number; y: number; w: number; h: number };
  /** Screen positions (CSS px) of the labelled rover parts for the final top-view callouts. */
  anchors(width: number, height: number): { id: SensorId; x: number; y: number }[];
  dispose(): void;
}

const COLORS = {
  body: 0xf2f4ef, forest: 0x123b29, mint: 0xa9db9c, dark: 0x1f2422, metal: 0x8c968f,
  soil: 0x6b4a2f, ridge: 0x5a3c25, leaf: 0x3f7f35, tomato: 0xd6402b,
};
const ROW_SPACING = 2.6;
const PLANT_SPACING = 0.75;
const FIELD_START = -2.2; // bare headland before this x, where the hero shot happens
const TARGET = new THREE.Vector3(8.6, 0, -1.3); // the diseased plant (rover drives along z = 0)
const STOP_X = 7.6; // where the rover parks next to the target
const HERO_X = -14; // studio hero position, well clear of the crop rows
const STUDIO_RADIUS = 9.5;

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ---------- Story keyframes (progress -> scene state) ---------- *
 * x: rover position along the furrow. cam/look are relative to the rover.
 * mast: 0 = forward, 1 = aimed at the target. arm: 0 = holding sensor, 1 = probe in soil. */
const KEYS: StoryKey[] = [
  { p: 0.0, x: HERO_X, cam: [4.1, 1.3, 3.0], look: [0, 0.68, 0], mast: 0, arm: 0, scan: 0 },
  { p: 0.09, x: HERO_X, cam: [-2.9, 1.45, 3.9], look: [0, 0.68, 0], mast: 0, arm: 0, scan: 0 },
  { p: 0.16, x: HERO_X + 2.6, cam: [-4.4, 3.3, 5.2], look: [1.5, 0.4, 0], mast: 0, arm: 0, scan: 0 },
  { p: 0.25, x: 3.6, cam: [-6.5, 6.2, 7.4], look: [3, 0, -0.5], mast: 0, arm: 0, scan: 0 },
  { p: 0.32, x: STOP_X, cam: [-1.6, 2.7, -3.4], look: [0.9, 0.45, -0.8], mast: 0.15, arm: 0, scan: 0 },
  { p: 0.385, x: STOP_X, cam: [2.4, 1.75, -2.6], look: [0.6, 0.55, -1.0], mast: 1, arm: 0, scan: 0 },
  { p: 0.47, x: STOP_X, cam: [2.5, 1.5, -3.3], look: [0.8, 0.5, -1.1], mast: 1, arm: 0, scan: 1 },
  { p: 0.535, x: STOP_X, cam: [2.8, 1.55, -3.3], look: [0.8, 0.45, -1.0], mast: 1, arm: 0.1, scan: 0 },
  { p: 0.6, x: STOP_X, cam: [3.4, 0.95, 0.15], look: [1.0, 0.3, -0.85], mast: 0.6, arm: 1, scan: 0 },
  { p: 0.67, x: STOP_X, cam: [3.1, 1.1, 0.35], look: [0.9, 0.35, -0.7], mast: 0.5, arm: 1, scan: 0 },
  { p: 0.74, x: STOP_X, cam: [-2.4, 3.2, 3.9], look: [2.4, 0.5, -0.4], mast: 0, arm: 0, scan: 0 },
  { p: 0.81, x: STOP_X, cam: [-3.6, 2.9, 2.6], look: [2.9, 0.45, -0.1], mast: 0, arm: 0, scan: 0 },
  { p: 0.9, x: STOP_X, cam: [0.15, 8.6, 1.0], look: [0.15, 0.6, 0], mast: 0, arm: 0, scan: 0 },
  { p: 1.0, x: STOP_X, cam: [0.15, 7.6, 0.6], look: [0.15, 0.6, 0], mast: 0, arm: 0, scan: 0 },
];

function sampleKeys(p: number) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smooth(clamp01((p - a.p) / (b.p - a.p)));
  const vec = (u: Vec3, v: Vec3): Vec3 => [lerp(u[0], v[0], t), lerp(u[1], v[1], t), lerp(u[2], v[2], t)];
  return {
    x: lerp(a.x, b.x, t),
    cam: vec(a.cam, b.cam),
    look: vec(a.look, b.look),
    mast: lerp(a.mast, b.mast, t),
    arm: lerp(a.arm, b.arm, t),
    scan: lerp(a.scan, b.scan, t),
  };
}

/* ---------- Procedural textures ---------- */
function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, size: number) => void, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

/** Smooth value noise in [0, 1], tileable, several octaves. */
function fractalNoise(size: number, octaves = 5, seed = 1) {
  let state = seed * 9301 + 49297;
  const random = () => ((state = (state * 9301 + 49297) % 233280) / 233280);
  const out = new Float32Array(size * size);
  let amplitude = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = 4 << o;
    const grid = Array.from({ length: cells * cells }, random);
    const at = (x: number, y: number) => grid[((y % cells) * cells + (x % cells))];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells;
        const fy = (y / size) * cells;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = smooth(fx - x0);
        const ty = smooth(fy - y0);
        const top = lerp(at(x0, y0), at(x0 + 1, y0), tx);
        const bottom = lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), tx);
        out[y * size + x] += lerp(top, bottom, ty) * amplitude;
      }
    }
    total += amplitude;
    amplitude *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

type RGB = [number, number, number];

/** Colour + bump textures from one noise field, so shading and relief line up. */
function noiseTextures(opts: { size: number; repeat: number; dark: RGB; light: RGB; seed: number; speckles?: number; contrast?: number }) {
  const { size, repeat, dark, light, seed, speckles = 0, contrast = 1.6 } = opts;
  const noise = fractalNoise(size, 5, seed);
  const colour = document.createElement('canvas');
  const bump = document.createElement('canvas');
  colour.width = colour.height = bump.width = bump.height = size;
  const cg = colour.getContext('2d')!;
  const bg = bump.getContext('2d')!;
  const cImg = cg.createImageData(size, size);
  const bImg = bg.createImageData(size, size);
  for (let i = 0; i < noise.length; i++) {
    const n = clamp01((noise[i] - 0.5) * contrast + 0.5);
    for (let c = 0; c < 3; c++) cImg.data[i * 4 + c] = lerp(dark[c], light[c], n);
    cImg.data[i * 4 + 3] = 255;
    const b = n * 255;
    bImg.data[i * 4] = bImg.data[i * 4 + 1] = bImg.data[i * 4 + 2] = b;
    bImg.data[i * 4 + 3] = 255;
  }
  cg.putImageData(cImg, 0, 0);
  bg.putImageData(bImg, 0, 0);
  // Clods and pebbles on top of the noise.
  let state = seed * 7;
  const random = () => ((state = (state * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < speckles; i++) {
    const x = random() * size;
    const y = random() * size;
    const r = 0.35 + random() * random() * 1.6;
    const lightSpeck = random() > 0.6;
    cg.fillStyle = lightSpeck ? 'rgba(214,190,150,0.35)' : 'rgba(40,24,12,0.3)';
    bg.fillStyle = lightSpeck ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
    for (const g of [cg, bg]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  const map = new THREE.CanvasTexture(colour);
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(bump);
  for (const t of [map, bumpMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 8;
  }
  return { map, bumpMap };
}

const soilTextures = (repeat: number, seed = 3) =>
  noiseTextures({ size: 512, repeat, dark: [92, 62, 40], light: [168, 132, 94], seed, speckles: 700 });

const solarTexture = () =>
  canvasTexture(256, (g, s) => {
    g.fillStyle = '#16233f';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(160,190,230,0.55)';
    g.lineWidth = 2;
    for (let i = 0; i <= 6; i++) {
      g.beginPath(); g.moveTo((i * s) / 6, 0); g.lineTo((i * s) / 6, s); g.stroke();
      g.beginPath(); g.moveTo(0, (i * s) / 6); g.lineTo(s, (i * s) / 6); g.stroke();
    }
  });

const treadTexture = () =>
  canvasTexture(256, (g, s) => {
    // Chevron lugs around the tyre.
    g.fillStyle = '#181a19';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#34393a';
    g.lineWidth = s / 28;
    g.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      const x = (i + 0.5) * (s / 18);
      g.beginPath();
      g.moveTo(x - s / 40, s * 0.12);
      g.lineTo(x + s / 40, s * 0.5);
      g.lineTo(x - s / 40, s * 0.88);
      g.stroke();
    }
  });

const pcbTexture = () =>
  canvasTexture(256, (g, s) => {
    // FC-37 rain board: interleaved comb traces on a green PCB.
    g.fillStyle = '#1f5a2f';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#d9c27a';
    const fingers = 9;
    for (let i = 0; i < fingers; i++) {
      const y = s * 0.12 + (i * s * 0.76) / (fingers - 1);
      if (i % 2) g.fillRect(s * 0.18, y - 3, s * 0.72, 6);
      else g.fillRect(s * 0.1, y - 3, s * 0.72, 6);
    }
    g.fillRect(s * 0.1, s * 0.1, 8, s * 0.8);
    g.fillRect(s * 0.88, s * 0.1, 8, s * 0.8);
  });

const grilleTexture = () =>
  canvasTexture(128, (g, s) => {
    // DHT22 vented housing.
    g.fillStyle = '#f2f3ee';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#9aa5a0';
    for (let y = 0; y < 6; y++) for (let x = 0; x < 4; x++) g.fillRect(s * 0.14 + x * s * 0.2, s * 0.12 + y * s * 0.13, s * 0.12, s * 0.06);
  });

const circuitTexture = () =>
  canvasTexture(256, (g, s) => {
    // Raspberry Pi seen through the deck window.
    g.fillStyle = '#0b1a12';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#1c7a3c';
    g.fillRect(s * 0.08, s * 0.15, s * 0.84, s * 0.7);
    g.fillStyle = '#c9ced1';
    g.fillRect(s * 0.42, s * 0.32, s * 0.2, s * 0.32);
    g.fillStyle = '#222';
    g.fillRect(s * 0.15, s * 0.25, s * 0.14, s * 0.12);
    g.strokeStyle = 'rgba(169,219,156,0.8)';
    g.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      g.beginPath();
      g.moveTo(s * 0.1, s * (0.2 + i * 0.05));
      g.lineTo(s * (0.3 + (i % 3) * 0.05), s * (0.2 + i * 0.05));
      g.lineTo(s * 0.42, s * 0.45);
      g.stroke();
    }
  });

const labelTexture = () =>
  canvasTexture(256, (g, s) => {
    g.fillStyle = '#123b29';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#d7eecf';
    g.font = 'bold 54px Inter, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('AgriBot', s / 2, s / 2);
  });

/* ---------- Sky ---------- */
function makeSky() {
  const geo = new THREE.SphereGeometry(400, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x6fa9d6) }, horizon: { value: new THREE.Color(0xf4dcb0) }, ground: { value: new THREE.Color(0xd9c9a4) } },
    vertexShader: 'varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; varying vec3 vPos;' +
      'void main(){ float h = vPos.y; vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : mix(horizon, ground, min(1.0, -h * 4.0)); gl_FragColor = vec4(c, 1.0);' +
      '\n#include <colorspace_fragment>\n}',
  });
  return new THREE.Mesh(geo, mat);
}

/* ---------- Field ---------- */
function makeField(scene: THREE.Scene, quality: { halfX: number; rows: number }) {
  const halfX = quality.halfX;
  const rows = quality.rows;
  const field = new THREE.Group();

  const soil = soilTextures(70, 3);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ ...soil, bumpScale: 1.4, roughness: 1, color: 0xf0e2cc }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  field.add(ground);

  // Grass band beyond the crop field.
  const grass = noiseTextures({ size: 256, repeat: 40, dark: [74, 112, 52], light: [142, 176, 92], seed: 11, contrast: 2 });
  const grassMat = new THREE.MeshStandardMaterial({ ...grass, bumpScale: 0.8, roughness: 1 });
  for (const z of [-1, 1]) {
    const band = new THREE.Mesh(new THREE.PlaneGeometry(220, 80), grassMat);
    band.rotation.x = -Math.PI / 2;
    band.position.set(0, 0.01, z * (rows * ROW_SPACING * 0.5 + 41));
    field.add(band);
  }

  // Raised ridges under each plant row.
  const ridgeLen = halfX - FIELD_START + 1;
  const ridgeGeo = new THREE.BoxGeometry(ridgeLen, 0.14, 0.7);
  const ridgeSoil = soilTextures(8, 7);
  ridgeSoil.map.repeat.set(ridgeLen / 2, 0.5);
  ridgeSoil.bumpMap.repeat.set(ridgeLen / 2, 0.5);
  const ridgeMat = new THREE.MeshStandardMaterial({ ...ridgeSoil, bumpScale: 2, color: 0xd6c2a6, roughness: 1 });
  const rowZs: number[] = [];
  for (let r = 0; r < rows; r++) {
    const z = (r - (rows - 1) / 2) * ROW_SPACING - ROW_SPACING / 2;
    rowZs.push(z);
    const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
    ridge.position.set(FIELD_START - 0.5 + ridgeLen / 2, 0.07, z);
    ridge.receiveShadow = true;
    field.add(ridge);
  }

  // Instanced tomato plants: stems, leaf clusters and fruit.
  const spots: [number, number, number][] = [];
  for (const z of rowZs) {
    for (let x = FIELD_START; x <= halfX; x += PLANT_SPACING) {
      const jx = x + (Math.random() - 0.5) * 0.15;
      if (Math.abs(jx - TARGET.x) < 0.5 && Math.abs(z - TARGET.z) < 0.2) continue; // leave room for the target plant
      spots.push([jx, z, 0.6 + Math.random() * 0.35]);
    }
  }
  const leavesPer = 9;
  const leafGeo = new THREE.IcosahedronGeometry(0.1, 0);
  const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true });
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, spots.length * leavesPer);
  const stemGeo = new THREE.CylinderGeometry(0.025, 0.035, 1, 5);
  stemGeo.translate(0, 0.5, 0);
  const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshStandardMaterial({ color: 0x4d6b2a, roughness: 1 }), spots.length);
  const fruitGeo = new THREE.SphereGeometry(0.065, 8, 6);
  const fruits = new THREE.InstancedMesh(fruitGeo, new THREE.MeshStandardMaterial({ roughness: 0.4 }), spots.length * 3);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const color = new THREE.Color();
  spots.forEach(([x, z, h], i) => {
    m.compose(pos.set(x, 0.13, z), q.identity(), s.set(1, h * 0.8, 1));
    stems.setMatrixAt(i, m);
    for (let l = 0; l < leavesPer; l++) {
      // Leaves spiral up the stem and droop outwards, like a staked tomato plant.
      const a = l * 2.4 + Math.random() * 0.6;
      const lh = 0.18 + (l / leavesPer) * h * 0.85;
      const r = 0.1 + Math.random() * 0.1 + (1 - l / leavesPer) * 0.06;
      q.setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.8, -a, 0.35 + Math.random() * 0.4));
      const sc = 0.85 + Math.random() * 0.6;
      m.compose(pos.set(x + Math.cos(a) * r, 0.13 + lh, z + Math.sin(a) * r), q, s.set(sc * 1.9, sc * 0.45, sc * 1.1));
      leaves.setMatrixAt(i * leavesPer + l, m);
      leaves.setColorAt(i * leavesPer + l, color.setHSL(0.27 + Math.random() * 0.05, 0.45 + Math.random() * 0.15, 0.27 + Math.random() * 0.1));
    }
    for (let f = 0; f < 3; f++) {
      const a = Math.random() * Math.PI * 2;
      m.compose(pos.set(x + Math.cos(a) * 0.12, 0.25 + Math.random() * h * 0.5, z + Math.sin(a) * 0.12), q.identity(), s.set(0.75, 0.75, 0.75));
      fruits.setMatrixAt(i * 3 + f, m);
      fruits.setColorAt(i * 3 + f, color.set(Math.random() > 0.35 ? COLORS.tomato : 0x7fae3e));
    }
  });
  for (const mesh of [leaves, stems, fruits]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    field.add(mesh);
  }

  // Distant tree line and a barn for depth.
  const treeGeo = new THREE.IcosahedronGeometry(1, 1);
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ color: 0x3d6b3a, roughness: 1, flatShading: true }), 120);
  for (let i = 0; i < 120; i++) {
    const side = i % 2 ? 1 : -1;
    const sc = 1.6 + Math.random() * 2.2;
    m.compose(pos.set(-90 + Math.random() * 180, sc * 0.9, side * (rows * ROW_SPACING * 0.5 + 34 + Math.random() * 18)), q.identity(), s.set(sc, sc * 1.25, sc));
    trees.setMatrixAt(i, m);
  }
  field.add(trees);
  const barn = new THREE.Group();
  const barnBody = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 6), new THREE.MeshStandardMaterial({ color: 0x9e3b2c, roughness: 0.9 }));
  barnBody.position.y = 2.5;
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 4.8, 3, 4, 1), new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.8 }));
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, 0.9);
  roof.position.y = 6.5;
  barn.add(barnBody, roof);
  barn.position.set(-38, 0, -34);
  barn.rotation.y = 0.5;
  field.add(barn);

  scene.add(field);
}

/* ---------- Diseased target plant ---------- */
function makeTargetPlant() {
  const plant = new THREE.Group();
  plant.position.copy(TARGET).setY(0.13);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.85, 6), new THREE.MeshStandardMaterial({ color: 0x5a6b2a }));
  stem.position.y = 0.42;
  plant.add(stem);
  const healthy = new THREE.MeshStandardMaterial({ color: 0x4a7a31, flatShading: true, roughness: 0.85, emissive: 0x000000 });
  const sick = new THREE.MeshStandardMaterial({ color: 0x8c7a3c, flatShading: true, roughness: 0.9, emissive: 0x000000 });
  const leafGeo = new THREE.IcosahedronGeometry(0.115, 0);
  const spotGeo = new THREE.CircleGeometry(0.028, 10);
  const spotMat = new THREE.MeshStandardMaterial({ color: 0x3b2614, roughness: 1, side: THREE.DoubleSide });
  for (let l = 0; l < 11; l++) {
    const a = l * 2.4;
    const r = 0.12 + (1 - l / 11) * 0.06;
    const leaf = new THREE.Mesh(leafGeo, l % 3 === 1 ? healthy : sick);
    leaf.position.set(Math.cos(a) * r, 0.2 + l * 0.065, Math.sin(a) * r);
    leaf.rotation.set(0.2, -a, 0.5);
    leaf.scale.set(1.9, 0.45, 1.1);
    leaf.castShadow = true;
    plant.add(leaf);
    if (l % 3 !== 1) {
      // Blight lesions on the sick leaves.
      for (let k = 0; k < 2; k++) {
        const spot = new THREE.Mesh(spotGeo, spotMat);
        spot.position.copy(leaf.position).add(new THREE.Vector3(Math.cos(a) * (0.12 + k * 0.06), 0.035, Math.sin(a) * (0.12 + k * 0.06)));
        spot.rotation.x = -Math.PI / 2;
        plant.add(spot);
      }
    }
  }
  for (let f = 0; f < 3; f++) {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: f ? 0x6b4a22 : 0xc0452a, roughness: 0.6 }));
    fruit.position.set(Math.cos(f * 2) * 0.1, 0.3 + f * 0.08, Math.sin(f * 2) * 0.1);
    plant.add(fruit);
  }
  plant.userData.materials = [healthy, sick];
  return plant;
}

/* ---------- Rover (local forward = +Z) ---------- */
function makeRover() {
  const rover = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: COLORS.body, roughness: 0.32, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.18 });
  const greenMat = new THREE.MeshStandardMaterial({ color: COLORS.forest, roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: COLORS.dark, roughness: 0.6, metalness: 0.3 });
  const metalMat = new THREE.MeshStandardMaterial({ color: COLORS.metal, roughness: 0.35, metalness: 0.8 });
  const shadow = <T extends THREE.Object3D>(o: T): T => {
    o.castShadow = true;
    o.receiveShadow = true;
    return o;
  };

  const body = shadow(new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.42, 1.7, 4, 0.09), bodyMat));
  body.position.y = 0.74;
  rover.add(body);
  const belly = shadow(new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.16, 1.5, 3, 0.05), darkMat));
  belly.position.y = 0.48;
  rover.add(belly);
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 1.5), greenMat);
    stripe.position.set(side * 0.605, 0.76, 0);
    rover.add(stripe);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: labelTexture() }));
    label.position.set(side * 0.607, 0.76, -0.35);
    label.rotation.y = side * Math.PI / 2;
    label.scale.y = 0.32;
    rover.add(label);
  }
  const solar = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.04, 0.78), new THREE.MeshPhysicalMaterial({ map: solarTexture(), roughness: 0.18, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.05 })));
  solar.position.set(0, 0.98, 0.1);
  rover.add(solar);
  const bumper = shadow(new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.14, 0.12, 2, 0.04), greenMat));
  bumper.position.set(0, 0.62, 0.88);
  rover.add(bumper);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), darkMat);
  antenna.position.set(0.42, 1.22, -0.7);
  rover.add(antenna);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshStandardMaterial({ color: 0xa9db9c, emissive: 0x6ad04a, emissiveIntensity: 1.5 }));
  tip.position.set(0.42, 1.48, -0.7);
  rover.add(tip);

  // Rear deck sensors: FC-37 rain board and the vented DHT22.
  const rain = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.22), new THREE.MeshStandardMaterial({ map: pcbTexture(), roughness: 0.45, metalness: 0.2 })));
  rain.position.set(-0.27, 0.965, -0.52);
  rain.rotation.x = 0.08;
  rover.add(rain);
  const dht = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.16, 0.1, 2, 0.02), new THREE.MeshStandardMaterial({ map: grilleTexture(), roughness: 0.6 })));
  dht.position.set(0.17, 1.03, -0.55);
  rover.add(dht);
  // Glass window over the Raspberry Pi + MCP3008 on the front deck.
  const piWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.2), new THREE.MeshStandardMaterial({ map: circuitTexture(), emissive: 0x2f8a55, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.2 }));
  piWindow.rotation.x = -Math.PI / 2;
  piWindow.position.set(0.05, 0.956, 0.68);
  rover.add(piWindow);

  // Wheels with rocker-bogie arms.
  const wheels: THREE.Group[] = [];
  const tireGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.22, 24);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ map: treadTexture(), roughness: 0.95 });
  const hubGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.235, 16);
  hubGeo.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    for (const z of [-0.62, 0, 0.62]) {
      const spin = new THREE.Group();
      spin.position.set(side * 0.8, 0.27, z);
      spin.add(shadow(new THREE.Mesh(tireGeo, tireMat)));
      const hub = new THREE.Mesh(hubGeo, greenMat);
      spin.add(hub);
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.2), metalMat);
      spin.add(spoke);
      rover.add(spin);
      wheels.push(spin);
    }
    const rocker = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 1.36), metalMat));
    rocker.position.set(side * 0.68, 0.45, 0);
    rover.add(rocker);
    for (const z of [-0.62, 0, 0.62]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), metalMat);
      leg.position.set(side * 0.68, 0.35, z);
      rover.add(leg);
    }
  }

  // Camera mast with pan / tilt head.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.62, 10), metalMat);
  mast.position.set(-0.36, 1.27, 0.62);
  rover.add(mast);
  const pan = new THREE.Group();
  pan.position.set(-0.36, 1.6, 0.62);
  const tilt = new THREE.Group();
  pan.add(tilt);
  const head = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.2, 0.2, 3, 0.05), bodyMat));
  tilt.add(head);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x0a0f0d, roughness: 0.1, metalness: 0.6 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xa9db9c, emissive: 0x7bd36a, emissiveIntensity: 1.2 });
  for (const x of [-0.08, 0.08]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 20), lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, 0, 0.11);
    tilt.add(lens);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 6, 24), ringMat);
    ring.position.set(x, 0, 0.13);
    tilt.add(ring);
  }
  const lensPoint = new THREE.Object3D();
  lensPoint.position.set(0, 0, 0.14);
  tilt.add(lensPoint);
  rover.add(pan);

  // Sensor arm holding the soil probe (shoulder -> elbow -> wrist).
  const L1 = 0.55;
  const L2 = 0.5;
  const PROBE = 0.32;
  const shoulder = new THREE.Group();
  shoulder.position.set(0.48, 0.92, 0.72);
  const base = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.1, 16), greenMat));
  base.position.y = -0.03;
  shoulder.add(base);
  const upper = new THREE.Group();
  shoulder.add(upper);
  const seg = (len: number) => {
    const g = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.08, len, 2, 0.03), bodyMat);
    g.position.z = len / 2;
    return shadow(g);
  };
  upper.add(seg(L1));
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), greenMat);
  upper.add(joint);
  const fore = new THREE.Group();
  fore.position.z = L1;
  fore.add(seg(L2), joint.clone());
  upper.add(fore);
  const wrist = new THREE.Group();
  wrist.position.z = L2;
  fore.add(wrist);
  wrist.add(joint.clone());
  const sensorBox = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.12, 0.1, 2, 0.025), greenMat));
  sensorBox.position.z = 0.08;
  wrist.add(sensorBox);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshStandardMaterial({ color: 0xa9db9c, emissive: 0x6ad04a, emissiveIntensity: 2 }));
  led.position.set(0, 0.065, 0.06);
  wrist.add(led);
  for (const x of [-0.04, 0.04]) {
    const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.004, 0.2, 6), metalMat);
    prong.rotation.x = Math.PI / 2;
    prong.position.set(x, 0, 0.22);
    wrist.add(prong);
  }
  rover.add(shoulder);

  // Rover-local points the final callouts point at.
  const anchors: Record<Exclude<SensorId, 'probe'>, THREE.Vector3> = {
    camera: new THREE.Vector3(-0.36, 1.7, 0.62),
    dht: dht.position.clone().setY(1.11),
    rain: rain.position.clone(),
    pi: piWindow.position.clone(),
    radio: new THREE.Vector3(0.42, 1.48, -0.7),
    solar: new THREE.Vector3(-0.15, 1.0, 0.25),
    drive: new THREE.Vector3(-0.8, 0.55, -0.62),
  };

  return { rover, wheels, pan, tilt, lensPoint, arm: { shoulder, upper, fore, wrist, L1, L2, PROBE }, led, anchors };
}

/* ---------- Public scene API ---------- */
export function createScene(canvas: HTMLCanvasElement, { mobile = false }: { mobile?: boolean } = {}): SceneApi {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xeedcb6, 18, 70);
  scene.add(makeSky());
  // Soft studio reflections on the rover's glossy body and solar panel.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  // Plain sage studio around the hero shot (a mid-tone so the white rover pops); it fades out as the rover leaves.
  const studio = new THREE.Group();
  const studioSky = new THREE.Mesh(
    new THREE.SphereGeometry(STUDIO_RADIUS, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      uniforms: { opacity: { value: 1 }, top: { value: new THREE.Color(0xd3dfcd) }, mid: { value: new THREE.Color(0xb9cbb2) }, floor: { value: new THREE.Color(0xaabea2) } },
      vertexShader: 'varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform float opacity; uniform vec3 top; uniform vec3 mid; uniform vec3 floor; varying vec3 vPos;' +
        'void main(){ float h = vPos.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.7)) : floor; gl_FragColor = vec4(c, opacity);' +
        '\n#include <colorspace_fragment>\n}',
    }),
  );
  const floorTex = canvasTexture(512, (g, size) => {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, '#cddac6');
    grad.addColorStop(0.3, '#bccdb4');
    grad.addColorStop(1, '#a6bb9e');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  });
  const studioFloor = new THREE.Mesh(
    new THREE.CircleGeometry(STUDIO_RADIUS, 64),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.05, transparent: true }),
  );
  studioFloor.rotation.x = -Math.PI / 2;
  studioFloor.position.y = 0.004;
  studioFloor.receiveShadow = true;
  studio.add(studioSky, studioFloor);
  studio.position.set(HERO_X, 0, 0);
  scene.add(studio);

  const camera = new THREE.PerspectiveCamera(mobile ? 50 : 38, 1, 0.05, 600);

  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x6b5233, 1.15));
  const sun = new THREE.DirectionalLight(0xffe2b8, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -6;
  sun.shadow.camera.right = sun.shadow.camera.top = 6;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  makeField(scene, mobile ? { halfX: 22, rows: 13 } : { halfX: 36, rows: 17 });
  const target = makeTargetPlant();
  scene.add(target);
  const bot = makeRover();
  bot.rover.rotation.y = Math.PI / 2; // drive along +X
  scene.add(bot.rover);

  // Vision cone from the camera lens to the plant, plus a sweeping scan ring.
  const coneGeo = new THREE.ConeGeometry(1, 1, 32, 1, true);
  coneGeo.rotateX(-Math.PI / 2);
  coneGeo.translate(0, 0, 0.5);
  const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0x9ff08a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  scene.add(cone);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.01, 6, 48), new THREE.MeshBasicMaterial({ color: 0xb8ff9f, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const roverLocal = (world: THREE.Vector3) => bot.rover.worldToLocal(tmp2.copy(world));
  const plantCenter = new THREE.Vector3().copy(TARGET).setY(0.55);
  const restArm = { yaw: 0.25, a1: 0.95, a2: 0.05 };
  // Points on the plant's canopy; their screen bounds give a tight detection box.
  const canopy: THREE.Vector3[] = [];
  for (const y of [0.18, 0.5, 0.85, 1.0]) {
    for (let a = 0; a < 8; a++) {
      const r = y > 0.95 ? 0.08 : 0.22;
      canopy.push(new THREE.Vector3(TARGET.x + Math.cos((a / 8) * Math.PI * 2) * r, y, TARGET.z + Math.sin((a / 8) * Math.PI * 2) * r));
    }
  }
  const projected = new THREE.Vector3();
  const x0 = KEYS[0].x;

  function solveArm(t: number) {
    // Probe tip goes into the soil just in front of the plant, then 6 cm deeper.
    const soil = tmp.copy(TARGET).add(new THREE.Vector3(0.35, 0.13 - 0.06 * smooth(clamp01((t - 0.75) / 0.25)), 0.35));
    const local = roverLocal(soil);
    const S = bot.arm.shoulder.position;
    const wx = local.x - S.x;
    const wz = local.z - S.z;
    const yaw = Math.atan2(wx, wz);
    const d = Math.hypot(wx, wz);
    const h = local.y + bot.arm.PROBE - S.y;
    const { L1, L2 } = bot.arm;
    const D = Math.min(Math.hypot(d, h), L1 + L2 - 0.001);
    const a1 = Math.atan2(h, d) + Math.acos(clamp01((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D)));
    const gamma = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2))));
    return { yaw, a1, a2: a1 - (Math.PI - gamma) };
  }

  function setArm(t: number) {
    const ik = solveArm(t);
    const k = smooth(clamp01(t / 0.75)); // swing over, then push into soil
    const yaw = lerp(restArm.yaw, ik.yaw, k);
    const a1 = lerp(restArm.a1, ik.a1, k);
    const a2 = lerp(restArm.a2, ik.a2, k);
    bot.arm.shoulder.rotation.y = yaw;
    bot.arm.upper.rotation.x = -a1;
    bot.arm.fore.rotation.x = -(a2 - a1);
    bot.arm.wrist.rotation.x = Math.PI / 2 + a2; // keeps the probe pointing straight down
  }

  let viewW = 1;
  let viewH = 1;
  function resize(width: number, height: number) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    viewW = width;
    viewH = height;
    camera.updateProjectionMatrix();
  }

  /** Render the scene for story progress p (0..1) at time t (seconds). */
  function update(p: number, time: number) {
    const k = sampleKeys(p);
    const studioT = 1 - clamp01((p - 0.1) / 0.06);
    studio.visible = studioT > 0.001;
    (studioSky.material as THREE.ShaderMaterial).uniforms.opacity.value = studioT;
    studioFloor.material.opacity = studioT;
    bot.rover.position.set(k.x, 0, 0);
    bot.wheels.forEach((w) => (w.rotation.x = (k.x - x0) / 0.27));
    bot.rover.updateMatrixWorld();

    // Mast aims at the plant.
    const aim = roverLocal(plantCenter).sub(bot.pan.position);
    bot.pan.rotation.y = lerp(0, Math.atan2(aim.x, aim.z), k.mast);
    bot.tilt.rotation.x = lerp(0, Math.atan2(-aim.y, Math.hypot(aim.x, aim.z)), k.mast);
    setArm(k.arm);
    bot.led.material.emissiveIntensity = 1 + Math.sin(time * 6) * 0.8;

    // Camera follows the rover.
    // Narrow portrait screens need the camera further back to fit the rover.
    const camScale = mobile ? 1.35 : 1;
    camera.position.set(k.x + k.look[0] + (k.cam[0] - k.look[0]) * camScale, k.look[1] + (k.cam[1] - k.look[1]) * camScale, k.look[2] + (k.cam[2] - k.look[2]) * camScale);
    // Looking straight down needs a different "up": rover length across (desktop) or along (mobile) the screen.
    const topT = smooth(clamp01((p - 0.82) / 0.08));
    camera.up.set(0, 1, 0).lerp(mobile ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, -1), topT).normalize();
    camera.lookAt(k.x + k.look[0], k.look[1], k.look[2]);
    // Wide screens: keep the subject right of the text column, re-centring for the top view.
    if (viewW > 760) camera.setViewOffset(viewW, viewH, -viewW * 0.15 * (1 - smooth(clamp01((p - 0.84) / 0.06))), 0, viewW, viewH);
    else camera.clearViewOffset();

    // Shadow frustum follows the action.
    sun.position.set(k.x + 5, 11, 7); // warm key light from the camera side
    sun.target.position.set(k.x + 1, 0, -0.5);

    // Vision effects.
    bot.rover.updateMatrixWorld();
    const lens = bot.lensPoint.getWorldPosition(tmp);
    cone.position.copy(lens);
    cone.lookAt(plantCenter);
    cone.scale.set(0.32, 0.32, lens.distanceTo(plantCenter));
    cone.material.opacity = 0.22 * k.scan * (0.75 + 0.25 * Math.sin(time * 10));
    ring.position.set(TARGET.x, 0.2 + ((time * 0.6) % 1) * 0.75, TARGET.z);
    ring.material.opacity = 0.9 * k.scan;

    // Highlight the sick leaves while the robot looks at them.
    const glow = clamp01((p - 0.34) / 0.05) * (1 - clamp01((p - 0.56) / 0.04));
    (target.userData.materials as THREE.MeshStandardMaterial[])[1].emissive.setRGB(0.22 * glow * (0.6 + 0.4 * Math.sin(time * 5)), 0.05 * glow, 0);

    renderer.render(scene, camera);
  }

  /** Screen-space rectangle (CSS px) of the target plant, for the HTML overlays. */
  function plantRect(width: number, height: number) {
    let x1 = Infinity;
    let y1 = Infinity;
    let x2 = -Infinity;
    let y2 = -Infinity;
    for (const point of canopy) {
      const c = projected.copy(point).project(camera);
      const sx = (c.x * 0.5 + 0.5) * width;
      const sy = (-c.y * 0.5 + 0.5) * height;
      x1 = Math.min(x1, sx); y1 = Math.min(y1, sy); x2 = Math.max(x2, sx); y2 = Math.max(y2, sy);
    }
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  const ANCHOR_IDS: SensorId[] = ['camera', 'probe', 'dht', 'rain', 'pi', 'radio', 'solar', 'drive'];
  const anchorWorld = new THREE.Vector3();
  function anchors(width: number, height: number) {
    bot.rover.updateMatrixWorld();
    return ANCHOR_IDS.map((id) => {
      if (id === 'probe') bot.arm.wrist.getWorldPosition(anchorWorld);
      else bot.rover.localToWorld(anchorWorld.copy(bot.anchors[id]));
      anchorWorld.project(camera);
      return { id, x: (anchorWorld.x * 0.5 + 0.5) * width, y: (-anchorWorld.y * 0.5 + 0.5) * height };
    });
  }

  /** Frees GPU memory when the React component unmounts. */
  function dispose() {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const material of materials) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
    });
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { resize, update, plantRect, anchors, dispose };
}
