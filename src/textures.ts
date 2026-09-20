// Realistic Procedural Textures for Materials using HTML Canvas
import * as THREE from 'three';

let cachedPlasticMaps: { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } | null = null;

// Generates an authentic ABS plastic normal map with realistic "hair scrap" (fine micro-hairline scratches)
export function createPlasticTextureMaps(): { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  if (cachedPlasticMaps) {
    return cachedPlasticMaps;
  }

  const size = 512;
  // 1. Height map canvas for Sobel-based normal computation
  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hCtx = heightCanvas.getContext('2d')!;

  // Neutral plane (mid-gray = 128)
  hCtx.fillStyle = '#808080';
  hCtx.fillRect(0, 0, size, size);

  // Micro surface noise (subtle injection mold grain)
  const hImgData = hCtx.getImageData(0, 0, size, size);
  const hData = hImgData.data;
  for (let i = 0; i < hData.length; i += 4) {
    const noise = (Math.random() - 0.5) * 5;
    const v = Math.min(255, Math.max(0, 128 + noise));
    hData[i] = v;
    hData[i + 1] = v;
    hData[i + 2] = v;
  }
  hCtx.putImageData(hImgData, 0, 0);

  // 2. Draw authentic "hair scrap" (micro hairline scratches and handling abrasions)
  // Scratches are drawn as fine grooved lines with an indented trough and slight raised burr
  hCtx.lineCap = 'round';
  hCtx.lineJoin = 'round';

  const scratchCount = 140;
  for (let i = 0; i < scratchCount; i++) {
    const x0 = Math.random() * size;
    const y0 = Math.random() * size;
    const length = 15 + Math.random() * 65;
    const angle = Math.random() * Math.PI * 2;
    const curveOffset = (Math.random() - 0.5) * 20;

    const x1 = x0 + Math.cos(angle) * length;
    const y1 = y0 + Math.sin(angle) * length;
    const cx = (x0 + x1) / 2 + Math.cos(angle + Math.PI / 2) * curveOffset;
    const cy = (y0 + y1) / 2 + Math.sin(angle + Math.PI / 2) * curveOffset;

    // Outer scratch lip / burr (slight raise)
    hCtx.strokeStyle = `rgba(160, 160, 160, ${0.15 + Math.random() * 0.25})`;
    hCtx.lineWidth = 1.4;
    hCtx.beginPath();
    hCtx.moveTo(x0 + 0.5, y0 + 0.5);
    hCtx.quadraticCurveTo(cx + 0.5, cy + 0.5, x1 + 0.5, y1 + 0.5);
    hCtx.stroke();

    // Inner trough (groove cut into plastic)
    hCtx.strokeStyle = `rgba(80, 80, 80, ${0.35 + Math.random() * 0.35})`;
    hCtx.lineWidth = 0.8;
    hCtx.beginPath();
    hCtx.moveTo(x0, y0);
    hCtx.quadraticCurveTo(cx, cy, x1, y1);
    hCtx.stroke();
  }

  // Linear injection flow hairlines
  for (let i = 0; i < 35; i++) {
    const y = Math.random() * size;
    const x = Math.random() * size;
    const len = 40 + Math.random() * 90;
    hCtx.strokeStyle = `rgba(100, 100, 100, ${0.12 + Math.random() * 0.15})`;
    hCtx.lineWidth = 0.7;
    hCtx.beginPath();
    hCtx.moveTo(x, y);
    hCtx.lineTo(x + len, y + (Math.random() - 0.5) * 3);
    hCtx.stroke();
  }

  // 3. Convert Heightmap to tangent-space Normal Map using Sobel Filter
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nCtx = normalCanvas.getContext('2d')!;
  const nImgData = nCtx.createImageData(size, size);
  const nData = nImgData.data;

  const heightPixels = hCtx.getImageData(0, 0, size, size).data;
  const getH = (x: number, y: number): number => {
    const px = (x + size) % size;
    const py = (y + size) % size;
    return heightPixels[(py * size + px) * 4] / 255;
  };

  const normalStrength = 1.6;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Sobel operator
      const tl = getH(x - 1, y - 1);
      const t = getH(x, y - 1);
      const tr = getH(x + 1, y - 1);
      const l = getH(x - 1, y);
      const r = getH(x + 1, y);
      const bl = getH(x - 1, y + 1);
      const b = getH(x, y + 1);
      const br = getH(x + 1, y + 1);

      const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -dX * normalStrength;
      let ny = -dY * normalStrength;
      let nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;

      const idx = (y * size + x) * 4;
      nData[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      nData[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      nData[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      nData[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nImgData, 0, 0);

  const normalTex = new THREE.CanvasTexture(normalCanvas);
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.repeat.set(1.5, 1.5);

  // 4. Roughness map (smooth polished ABS ~0.20 with hairline scratches increasing roughness to ~0.40)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  rCtx.fillStyle = '#303030'; // Base smooth plastic
  rCtx.fillRect(0, 0, size, size);

  // Draw roughness variation over scratches
  rCtx.drawImage(normalCanvas, 0, 0);
  const rImgData = rCtx.getImageData(0, 0, size, size);
  const rData = rImgData.data;
  for (let i = 0; i < rData.length; i += 4) {
    // Distance from flat normal (128, 128, 255)
    const devX = Math.abs(nData[i] - 128);
    const devY = Math.abs(nData[i + 1] - 128);
    const scratchAmt = (devX + devY) / 128;
    const rough = Math.min(255, Math.max(0, Math.floor(52 + scratchAmt * 75)));
    rData[i] = rough;
    rData[i + 1] = rough;
    rData[i + 2] = rough;
    rData[i + 3] = 255;
  }
  rCtx.putImageData(rImgData, 0, 0);

  const roughTex = new THREE.CanvasTexture(roughCanvas);
  roughTex.wrapS = THREE.RepeatWrapping;
  roughTex.wrapT = THREE.RepeatWrapping;
  roughTex.repeat.set(1.5, 1.5);

  cachedPlasticMaps = { normalMap: normalTex, roughnessMap: roughTex };
  return cachedPlasticMaps;
}

// Generates an architectural studio concrete / carbon matte floor with subtle 0.5m tiles
export function createFloorTextures(): { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Dark studio slate floor
  ctx.fillStyle = '#22252c';
  ctx.fillRect(0, 0, size, size);

  // Micro noise
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // Modular studio panel borders (subtle inset grooves)
  ctx.strokeStyle = '#181a1f';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  // Dot matrix markers for engineering precision
  ctx.fillStyle = '#323742';
  for (let x = 64; x < size; x += 128) {
    for (let y = 64; y < size; y += 128) {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const floorTex = new THREE.CanvasTexture(canvas);
  floorTex.wrapS = THREE.RepeatWrapping;
  floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(60, 60);

  // Floor roughness canvas
  const rCanvas = document.createElement('canvas');
  rCanvas.width = 512;
  rCanvas.height = 512;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.fillStyle = '#c0c0c0'; // ~0.75 roughness
  rCtx.fillRect(0, 0, 512, 512);

  const floorRough = new THREE.CanvasTexture(rCanvas);
  floorRough.wrapS = THREE.RepeatWrapping;
  floorRough.wrapT = THREE.RepeatWrapping;
  floorRough.repeat.set(60, 60);

  return { map: floorTex, roughnessMap: floorRough };
}

// Generates an embossed "BYLDR" logo bump map for stud caps
export function createStudLogoBumpMap(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Neutral bump plane (50% gray = zero displacement)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Outer bevel ring on stud cap
  ctx.strokeStyle = '#a5a5a5';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, (size / 2) - 16, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#5a5a5a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, (size / 2) - 10, 0, Math.PI * 2);
  ctx.stroke();

  // Embossed BYLDR brand typography
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '2px';

  // Lower dark shadow for emboss depth
  ctx.fillStyle = '#484848';
  ctx.fillText('BYLDR', 1.5, 2.5);

  // Upper bright highlight for emboss raise
  ctx.fillStyle = '#dcdcdc';
  ctx.fillText('BYLDR', -1.5, -1.5);

  // Main raised face
  ctx.fillStyle = '#b0b0b0';
  ctx.fillText('BYLDR', 0, 0);

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
