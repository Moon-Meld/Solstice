import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const svgPath = path.join(rootDir, 'public', 'solstice-logo.svg');
const buildDir = path.join(rootDir, 'build');

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

console.log('Reading SVG from:', svgPath);
const svg = fs.readFileSync(svgPath, 'utf8');

// Render 512x512 icon
const resvg512 = new Resvg(svg, {
  fitTo: {
    mode: 'width',
    value: 512,
  },
});
const pngData512 = resvg512.render();
const pngBuffer512 = pngData512.asPng();
const iconPngPath = path.join(buildDir, 'icon.png');
fs.writeFileSync(iconPngPath, pngBuffer512);
console.log('Generated build/icon.png (512x512)');

// Also generate 1024x1024 for macOS retina
const resvg1024 = new Resvg(svg, {
  fitTo: {
    mode: 'width',
    value: 1024,
  },
});
const pngData1024 = resvg1024.render();
const pngBuffer1024 = pngData1024.asPng();
fs.writeFileSync(path.join(buildDir, 'icon-1024.png'), pngBuffer1024);
console.log('Generated build/icon-1024.png (1024x1024)');

// If on macOS, attempt to generate .icns using iconutil
if (process.platform === 'darwin') {
  try {
    const iconsetDir = path.join(buildDir, 'icon.iconset');
    if (fs.existsSync(iconsetDir)) {
      fs.rmSync(iconsetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(iconsetDir, { recursive: true });

    const sizes = [16, 32, 64, 128, 256, 512];
    for (const size of sizes) {
      const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
      fs.writeFileSync(path.join(iconsetDir, `icon_${size}x${size}.png`), resvg.render().asPng());
      
      const resvg2x = new Resvg(svg, { fitTo: { mode: 'width', value: size * 2 } });
      fs.writeFileSync(path.join(iconsetDir, `icon_${size}x${size}@2x.png`), resvg2x.render().asPng());
    }

    execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(buildDir, 'icon.icns')}"`);
    console.log('Generated build/icon.icns successfully with iconutil');
    fs.rmSync(iconsetDir, { recursive: true, force: true });
  } catch (err) {
    console.warn('macOS iconutil generation warning:', err.message);
  }
}
