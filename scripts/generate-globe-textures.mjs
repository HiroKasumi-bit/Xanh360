// Generates the hero globe's surface textures in public/globe/ (run: node scripts/generate-globe-textures.mjs).
// The noise is periodic across the width, so the strip in app/eco-visual.tsx can pan one tile and loop with no seam.
// Textures are pre-rendered instead of drawn with SVG feTurbulence at runtime: no per-visit raster cost on phones,
// identical output in every browser, and Chrome's stitchTiles leaves a visible seam inside the tile.
// Chromium (from @playwright/test) only encodes the pixels as WebP. Set CHROMIUM_PATH to use a specific browser binary.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const LAND_SIZE = 384; // One tile is square: 2x the largest on-screen globe (196px), so coastlines stay crisp.
const CLOUD_SIZE = 256; // Soft clouds survive the upscale.
const outDir = fileURLToPath(new URL("../public/globe/", import.meta.url));

function hash(ix, iy, octave, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(octave + 1, 2246822519) ^ Math.imul(seed, 3266489917);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// Gradient noise whose lattice wraps every `period` cells in x.
function perlin(x, y, period, octave, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const dot = (ix, iy) => {
    const a = hash(((ix % period) + period) % period, iy, octave, seed) * Math.PI * 2;
    return Math.cos(a) * (x - ix) + Math.sin(a) * (y - iy);
  };
  const u = fade(x - x0), v = fade(y - y0);
  return lerp(lerp(dot(x0, y0), dot(x0 + 1, y0), u), lerp(dot(x0, y0 + 1), dot(x0 + 1, y0 + 1), u), v);
}

// Fractal noise over the tile; cellsX/cellsY set the feature size (more cells in y stretches features sideways).
function field(size, cellsX, cellsY, octaves, seed) {
  const out = new Float32Array(size * size);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    let sum = 0, amp = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
      const f = 2 ** o;
      sum += amp * perlin((px / size) * cellsX * f, (py / size) * cellsY * f, cellsX * f, o, seed);
      norm += amp; amp *= 0.5;
    }
    out[py * size + px] = sum / norm;
  }
  return out;
}
const quantile = (values, q) => Float32Array.from(values).sort()[Math.floor(values.length * q)];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

// Land and sea: about a third land. Shallows lighten the water along the coast; land runs from a light coastal green to deep forest inland.
function landTexture() {
  const elevation = field(LAND_SIZE, 2, 2, 6, 21);
  const detail = field(LAND_SIZE, 8, 8, 3, 5);
  const sea = quantile(elevation, 0.64);
  const rgba = new Uint8ClampedArray(LAND_SIZE * LAND_SIZE * 4);
  const deep = hex("#0f4744"), open = hex("#1a6863"), shallow = hex("#2a8077");
  const coast = hex("#6dab69"), forest = hex("#3e8653"), upland = hex("#5b8f55");
  for (let i = 0; i < elevation.length; i++) {
    const e = elevation[i] - sea, d = detail[i];
    let water = mix(deep, open, smooth(-0.22, -0.02, e));
    water = mix(water, shallow, smooth(-0.025, 0, e) * 0.5);
    let land = mix(coast, forest, smooth(0, 0.035, e));
    land = mix(land, upland, smooth(0.13, 0.24, e) * 0.7);
    land = land.map((v) => v * (1 + d * 0.28));
    const c = mix(water, land, smooth(-0.002, 0.004, e));
    rgba.set([c[0], c[1], c[2], 255], i * 4);
  }
  return rgba;
}

// Clouds: thin, sideways-stretched white wisps with soft edges, about a fifth of the sky.
function cloudTexture() {
  const n = field(CLOUD_SIZE, 3, 9, 5, 9);
  const lo = quantile(n, 0.72), hi = quantile(n, 0.93);
  const rgba = new Uint8ClampedArray(CLOUD_SIZE * CLOUD_SIZE * 4);
  for (let i = 0; i < n.length; i++) rgba.set([255, 255, 255, Math.round(smooth(lo, hi, n[i]) * 235)], i * 4);
  return rgba;
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
async function webp(rgba, size, quality) {
  const url = await page.evaluate(([data, size, q]) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(data), size, size), 0, 0);
    return canvas.toDataURL("image/webp", q);
  }, [Array.from(rgba), size, quality]);
  return Buffer.from(url.split(",")[1], "base64");
}
mkdirSync(outDir, { recursive: true });
for (const [name, rgba, size, quality] of [["land.webp", landTexture(), LAND_SIZE, 0.82], ["clouds.webp", cloudTexture(), CLOUD_SIZE, 0.72]]) {
  const file = await webp(rgba, size, quality);
  writeFileSync(outDir + name, file);
  console.log(`public/globe/${name}: ${(file.length / 1024).toFixed(1)} KB`);
}
await browser.close();
