// Renders the hero's 3D Saigon skyline (app/saigon-3d/scene.ts) to the still images the page shows before the visitor
// turns the live view on: public/hero/saigon-3d-2400.webp and saigon-3d-1200.webp, transparent above the skyline.
// Run: node scripts/render-saigon-3d.mjs [outDir]. Set CHROMIUM_PATH to use a specific browser binary. Chromium renders
// with SwiftShader when there is no GPU, which is slow but gives the same frame as the live view at yaw 0, time 0.
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = process.argv[2] ?? `${root}public/hero/`;
mkdirSync(outDir, {recursive: true});

const bundle = await build({
  stdin: {
    contents: `
      import * as THREE from 'three';
      import {buildSaigonScene} from './app/saigon-3d/scene.ts';
      window.renderStill = (width, height) => {
        const canvas = document.createElement('canvas');
        const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, preserveDrawingBuffer: true});
        renderer.setPixelRatio(1);
        renderer.setSize(width, height, false);
        renderer.setClearColor(0x000000, 0);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        const view = buildSaigonScene(renderer, {shadowMapSize: 4096, waterTextureSize: 512});
        view.setViewport(width, height);
        view.tick(0);
        renderer.render(view.scene, view.camera);
        const url = canvas.toDataURL('image/webp', 0.9);
        view.dispose();
        renderer.dispose();
        return url;
      };`,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'iife',
  write: false,
  logLevel: 'error',
});

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', error => console.error(error));
await page.setContent('<!doctype html><body></body>');
await page.addScriptTag({content: bundle.outputFiles[0].text});
for (const width of [2400, 1200]) {
  const height = Math.round(width / 4.2);
  const url = await page.evaluate(([w, h]) => window.renderStill(w, h), [width, height]);
  const file = Buffer.from(url.split(',')[1], 'base64');
  writeFileSync(`${outDir}/saigon-3d-${width}.webp`, file);
  console.log(`saigon-3d-${width}.webp: ${width}x${height}, ${(file.length / 1024).toFixed(1)} KB`);
}
await browser.close();
