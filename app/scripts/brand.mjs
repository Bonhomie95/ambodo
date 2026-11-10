// Generates every icon/splash asset from one vector "bod" mark.  Run: node scripts/brand.mjs
// b = parent one, o = the kid, d = parent two — mirrored around the child.
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const C = { ink: '#141A33', ink2: '#2B2F63', coral: '#FF6B5B', teal: '#2EC4B6', sun: '#FFC94A', cream: '#FFF6EC' };
const ROOT = resolve(import.meta.dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Geometry on a 1024 canvas (bbox ≈ 696×422, centred).
const r = 92, w = 60, cy = 600, top = 300, xb = 286, xd = 738, kid = 70;
// Stem: round top, flat bottom that meets the bowl tangentially at its widest point.
const stem = (x, fill) => `<path d="M${x - w / 2} ${cy}V${top + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${cy}Z" fill="${fill}"/>`;
const parts = ({ b = C.coral, d = C.teal, o = C.sun } = {}) => ({
  b: `<circle cx="${xb}" cy="${cy}" r="${r}" fill="none" stroke="${b}" stroke-width="${w}"/>${stem(xb - r, b)}`,
  d: `<circle cx="${xd}" cy="${cy}" r="${r}" fill="none" stroke="${d}" stroke-width="${w}"/>${stem(xd + r, d)}`,
  o: `<circle cx="512" cy="${cy}" r="${kid}" fill="${o}"/>`,
});
const mark = (scale = 1, colors) => {
  const p = parts(colors);
  return `<g transform="translate(512 511) scale(${scale}) translate(-512 -511)">${p.b}${p.o}${p.d}</g>`;
};
const bg = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.ink2}"/><stop offset="1" stop-color="${C.ink}"/></linearGradient>
<radialGradient id="glow" cx="0.5" cy="0.58" r="0.38"><stop offset="0" stop-color="${C.sun}" stop-opacity="0.28"/><stop offset="1" stop-color="${C.sun}" stop-opacity="0"/></radialGradient></defs>
<rect width="1024" height="1024" fill="url(#g)"/><rect width="1024" height="1024" fill="url(#glow)"/>`;
const svg = (body, size = 1024) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${body}</svg>`;

const tmp = join(tmpdir(), 'ambodo-brand');
mkdirSync(tmp, { recursive: true });
function png(name, body, size = 1024) {
  const html = join(tmp, `${name}.html`);
  writeFileSync(html, `<html><body style="margin:0;background:transparent">${svg(body, size)}</body></html>`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--default-background-color=00000000', `--window-size=${size},${size}`, `--screenshot=${join(ROOT, 'assets/images', name + '.png')}`, `file://${html}`], { stdio: 'ignore' });
}

// Sources for designers / store listing.
writeFileSync(join(ROOT, 'assets/brand/mark.svg'), svg(mark()));
writeFileSync(join(ROOT, 'assets/brand/icon.svg'), svg(bg + mark(0.86)));

// Universal + Android.
png('icon', bg + mark(0.86));                                   // 1024 opaque, fallback/legacy
png('android-icon-foreground', mark(0.72));                     // inside the 66dp safe zone
png('android-icon-background', bg);
png('android-icon-monochrome', mark(0.72, { b: '#fff', d: '#fff', o: '#fff' }));
png('splash-icon', mark(1));                                    // transparent, sized by imageWidth
png('favicon', bg + mark(0.86), 196);

// iOS 26 Icon Composer (.icon): parents and kid on separate glass layers for depth.
const ic = join(ROOT, 'assets/ambodo.icon');
mkdirSync(join(ic, 'Assets'), { recursive: true });
const p = parts();
const big = (body) => svg(`<g transform="translate(512 511) scale(0.98) translate(-512 -511)">${body}</g>`); // ~67% of the canvas, per Apple's icon grid
writeFileSync(join(ic, 'Assets/parents.svg'), big(p.b + p.d));
writeFileSync(join(ic, 'Assets/kid.svg'), big(p.o));
const layer = (n) => ({ 'image-name': `${n}.svg`, name: n, position: { scale: 1, 'translation-in-points': [0, 0] } });
writeFileSync(join(ic, 'icon.json'), JSON.stringify({
  fill: { 'automatic-gradient': 'extended-srgb:0.10980,0.13333,0.30196,1.00000' },
  groups: [
    { layers: [layer('kid')], shadow: { kind: 'layer-color', opacity: 0.6 }, translucency: { enabled: true, value: 0.1 } },
    { layers: [layer('parents')], shadow: { kind: 'neutral', opacity: 0.5 }, translucency: { enabled: true, value: 0.15 } },
  ],
  'supported-platforms': { circles: ['watchOS'], squares: 'shared' },
}, null, 2));
console.log('brand assets written');
