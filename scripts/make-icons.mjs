// Generates the PWA / iOS icons as PNGs with no image libraries (Node zlib only).
// A white spade on calm green. Run: npm run icons
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x1f, 0x5c, 0x4a];
const FG = [0xf6, 0xf5, 0xf1];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Is (u,v) in [-1,1]² inside the spade? */
function inSpade(u, v) {
  // Heart curve (x²+y²−1)³ − x²·y³ ≤ 0 in screen coords (y down) gives a point at the top: a spade body.
  const x = u * 1.25, y = v * 1.25 + 0.4;
  const heart = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y <= 0;
  // Stem: a small flared triangle under the body.
  const stem = v > 0.3 && v < 1.05 && Math.abs(u) < 0.04 + Math.pow(Math.max(0, v - 0.3), 2) * 0.55;
  return heart || stem;
}

function icon(size, { scale = 0.56, rounded = false } = {}) {
  const SS = 4;
  return png(size, (px, py) => {
    let inside = 0, inBg = 0;
    for (let sy = 0; sy < SS; sy++)
      for (let sx = 0; sx < SS; sx++) {
        const fx = (px + (sx + 0.5) / SS) / size, fy = (py + (sy + 0.5) / SS) / size;
        if (rounded) {
          const r = 0.22, dx = Math.max(Math.abs(fx - 0.5) - (0.5 - r), 0), dy = Math.max(Math.abs(fy - 0.5) - (0.5 - r), 0);
          if (dx * dx + dy * dy <= r * r) inBg++;
        } else inBg++;
        const u = (fx - 0.5) / (scale / 2), v = (fy - 0.48) / (scale / 2);
        if (inSpade(u, v)) inside++;
      }
    const t = inside / (SS * SS), a = inBg / (SS * SS);
    const mix = (i) => Math.round(BG[i] * (1 - t) + FG[i] * t);
    return [mix(0), mix(1), mix(2), Math.round(255 * a)];
  });
}

const out = (name, buf) => { writeFileSync(new URL(`../public/${name}`, import.meta.url), buf); console.log('wrote', name, buf.length, 'bytes'); };
out('apple-touch-icon.png', icon(180)); // iOS rounds the corners itself; must be opaque
out('icon-192.png', icon(192, { rounded: true }));
out('icon-512.png', icon(512, { rounded: true }));
out('icon-512-maskable.png', icon(512, { scale: 0.42 })); // extra padding for the maskable safe zone
out('favicon.png', icon(64, { rounded: true }));
