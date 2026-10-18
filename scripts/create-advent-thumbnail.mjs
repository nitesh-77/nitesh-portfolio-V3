import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const directory = fileURLToPath(new URL('../public/media/advent-of-code/', import.meta.url));
const source = `${directory}source.png`;
const fps = 24;
const seconds = 4;
const background = 34;
const { data: original, info } = await sharp(source)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const ornaments = [];
const rows = [
  [446, 466],
  [411, 434],
  [376, 398],
  [339, 363],
  [308, 324],
  [272, 288],
  [232, 252],
  [202, 217],
];

for (let y = 80; y < Math.min(478, info.height); y++) {
  const row = rows.findIndex(([top, bottom]) => y >= top && y <= bottom);
  if (row < 0 && y > 177) continue;
  for (let x = 450; x < Math.min(750, info.width); x++) {
    const offset = (y * info.width + x) * 3;
    if (original[offset] > 70 || original[offset + 2] > 80) {
      ornaments.push({ offset, row });
    }
  }
}

function brightnessAt(time, row) {
  if (time >= 3.2) return Math.max(0, (3.5 - time) / 0.3);
  if (row < 0) {
    return Number((time >= 2 && time < 2.14) || (time >= 2.3 && time < 2.44) || time >= 2.55);
  }
  return Math.max(0, Math.min(1, (time - 0.2 - row * 0.225) / 0.08));
}

await sharp(source).webp({ lossless: true }).toFile(`${directory}poster.webp`);

const encoder = spawn(
  'ffmpeg',
  [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'rawvideo',
    '-pixel_format',
    'rgb24',
    '-video_size',
    `${info.width}x${info.height}`,
    '-framerate',
    String(fps),
    '-i',
    'pipe:0',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '12',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    `${directory}thumbnail.mp4`,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);
const completion = once(encoder, 'close');

for (let frame = 0; frame < seconds * fps; frame++) {
  const pixels = Buffer.from(original);
  const time = frame / fps;
  for (const { offset, row } of ornaments) {
    const brightness = brightnessAt(time, row);
    for (let channel = 0; channel < 3; channel++) {
      pixels[offset + channel] = Math.round(
        background + (original[offset + channel] - background) * brightness,
      );
    }
  }
  if (!encoder.stdin.write(pixels)) await once(encoder.stdin, 'drain');
}

encoder.stdin.end();
const [exitCode] = await completion;
if (exitCode !== 0) throw new Error(`Video encoding failed with exit code ${exitCode}.`);

const gif = spawnSync(
  'ffmpeg',
  [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    `${directory}thumbnail.mp4`,
    '-filter_complex',
    'fps=12,scale=600:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
    '-loop',
    '0',
    `${directory}thumbnail.gif`,
  ],
  { stdio: 'inherit' },
);
if (gif.status !== 0) throw new Error(`GIF encoding failed with exit code ${gif.status}.`);

console.log(`Created ${seconds}s row-by-row thumbnail with ${ornaments.length} animated pixels.`);
