// Renders ad.html to frames, then encodes a 1080x1920 30fps MP4 with ffmpeg.
// Usage: node render.js [outDir] [--stills t1,t2,...]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FPS = 30, DURATION = 30;
const outDir = process.argv[2] || path.join(__dirname, 'out');
const stillsArg = process.argv.indexOf('--stills');

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(__dirname, 'ad.html'));
  await page.evaluate(() => document.fonts.ready);

  if (stillsArg > -1) {
    for (const t of process.argv[stillsArg + 1].split(',').map(Number)) {
      await page.evaluate(t => window.renderAt(t), t);
      await page.screenshot({ path: path.join(outDir, `still_${t}.png`) });
    }
    await browser.close();
    return;
  }

  const framesDir = path.join(outDir, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });
  for (let i = 0; i < FPS * DURATION; i++) {
    await page.evaluate(t => window.renderAt(t), i / FPS);
    await page.screenshot({ path: path.join(framesDir, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 95 });
  }
  await browser.close();

  execFileSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(framesDir, 'f%04d.jpg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    path.join(outDir, 'online-coaching-ad.mp4')], { stdio: 'inherit' });
})();
