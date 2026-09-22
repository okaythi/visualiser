import puppeteer from 'puppeteer';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    frames: 13600,       // 226.667s * 60 FPS
    start: 0,
    fps: 60,
    format: 'both',      // 'both' | '1440p' | '1080p'
    port: 5173,
    nvenc: true,
    audio: 'public/audio/abracadabra-mix.mp3',
    outDir: '.',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--frames' && args[i + 1]) options.frames = parseInt(args[++i], 10);
    else if (arg === '--start' && args[i + 1]) options.start = parseInt(args[++i], 10);
    else if (arg === '--fps' && args[i + 1]) options.fps = parseInt(args[++i], 10);
    else if (arg === '--format' && args[i + 1]) options.format = args[++i].toLowerCase();
    else if (arg === '--port' && args[i + 1]) options.port = parseInt(args[++i], 10);
    else if (arg === '--audio' && args[i + 1]) options.audio = args[++i];
    else if (arg === '--out-dir' && args[i + 1]) options.outDir = args[++i];
    else if (arg === '--no-nvenc') options.nvenc = false;
    else if (arg === '--nvenc') options.nvenc = true;
  }

  return options;
}

// Check if NVENC hardware encoder is available in ffmpeg
function checkNvencAvailable() {
  try {
    const output = execSync('ffmpeg -encoders', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return output.includes('h264_nvenc');
  } catch {
    return false;
  }
}

async function main() {
  const opts = parseArgs();
  console.log('=== Lady Gaga "Abracadabra" 7-Zone Stage Headless Render Pipeline ===');
  console.log(`Target frames: ${opts.frames} (${(opts.frames / opts.fps).toFixed(2)}s @ ${opts.fps} FPS)`);
  console.log(`Format: ${opts.format.toUpperCase()}`);

  const hasNvenc = opts.nvenc && checkNvencAvailable();
  const vcodec = hasNvenc ? 'h264_nvenc' : 'libx264';
  console.log(`Video encoder: ${vcodec} (${hasNvenc ? 'Nvidia Hardware Accelerated' : 'Software Fallback'})`);

  if (!fs.existsSync(opts.audio)) {
    console.error(`ERROR: Audio file not found at ${opts.audio}`);
    process.exit(1);
  }

  // Determine render resolution: if format is 1440p or both, render at 2560x1440
  const is1440 = opts.format === '1440p' || opts.format === 'both';
  const width = is1440 ? 2560 : 1920;
  const height = is1440 ? 1440 : 1080;
  console.log(`Viewport render resolution: ${width}x${height}`);

  const out1440 = path.join(opts.outDir, 'Abracadabra_Stage_1440p60.mp4');
  const out1080 = path.join(opts.outDir, 'Abracadabra_Stage_1080p60.mp4');

  // Launch Puppeteer with GPU acceleration flags FIRST (before spawning FFmpeg)
  console.log('Launching headless browser with GPU acceleration...');
  const launchOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=gl',
      '--enable-gpu-rasterization',
      `--window-size=${width},${height}`,
      '--hide-scrollbars',
      '--mute-audio',
    ],
  };

  // Auto-detect system Chrome on Linux (Google Colab, Debian/Ubuntu)
  const chromeBinaries = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const bin of chromeBinaries) {
    if (fs.existsSync(bin)) {
      launchOptions.executablePath = bin;
      console.log(`Using detected system Chrome binary: ${bin}`);
      break;
    }
  }

  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  const url = `http://localhost:${opts.port}/?render=1`;
  console.log(`Connecting to visualiser at ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });

  console.log('Waiting for stage assets, 3D meshes, and telemetry readiness...');
  await page.waitForFunction(
    () => typeof window.__IS_READY_FOR_CAPTURE__ === 'function' && window.__IS_READY_FOR_CAPTURE__() === true,
    { timeout: 90000 }
  );
  console.log('Stage ready! Starting deterministic frame-by-frame rendering...');

  // Build FFmpeg argument list with explicit input dimensions and per-output stream options
  let ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-s', `${width}x${height}`,
    '-r', `${opts.fps}`,
    '-i', '-',
    '-i', opts.audio,
  ];

  if (opts.format === 'both') {
    console.log(`Outputs will be generated simultaneously:\n  -> ${out1440}\n  -> ${out1080}`);
    ffmpegArgs.push(
      '-filter_complex', '[0:v]split=2[v1440][v1080_in];[v1080_in]scale=1920:1080:flags=lanczos[v1080]',
      '-map', '[v1440]', '-map', '1:a',
      '-c:v', vcodec,
      ...(hasNvenc ? ['-preset', 'p7', '-b:v', '35M'] : ['-preset', 'slow', '-crf', '17']),
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '320k',
      out1440,
      '-map', '[v1080]', '-map', '1:a',
      '-c:v', vcodec,
      ...(hasNvenc ? ['-preset', 'p7', '-b:v', '22M'] : ['-preset', 'slow', '-crf', '18']),
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '320k',
      out1080
    );
  } else if (opts.format === '1440p') {
    ffmpegArgs.push(
      '-c:v', vcodec,
      ...(hasNvenc ? ['-preset', 'p7', '-b:v', '35M'] : ['-preset', 'slow', '-crf', '17']),
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '320k',
      out1440
    );
  } else {
    ffmpegArgs.push(
      '-c:v', vcodec,
      ...(hasNvenc ? ['-preset', 'p7', '-b:v', '22M'] : ['-preset', 'slow', '-crf', '18']),
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '320k',
      out1080
    );
  }

  const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'inherit', 'inherit'] });

  ffmpeg.on('error', (err) => {
    console.error('FFmpeg process error:', err);
    process.exit(1);
  });

  const startTime = Date.now();

  for (let frame = opts.start; frame < opts.frames; frame++) {
    // 1. Advance virtual clock to exact frame timestamp
    await page.evaluate((f) => window.__SEEK_FRAME__(f), frame);

    // 2. Capture uncompressed frame screenshot
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      omitBackground: false,
    });

    // 3. Pipe raw frame to FFmpeg with backpressure handling
    const canWrite = ffmpeg.stdin.write(screenshotBuffer);
    if (!canWrite) {
      await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
    }

    // 4. Progress reporting
    if (frame % opts.fps === 0 || frame === opts.frames - 1) {
      const now = Date.now();
      const elapsedTotalSec = (now - startTime) / 1000;
      const framesDone = frame - opts.start + 1;
      const currentFps = framesDone / elapsedTotalSec;
      const remainingFrames = opts.frames - frame - 1;
      const etaSec = remainingFrames / (currentFps || 1);
      const percent = ((framesDone / (opts.frames - opts.start)) * 100).toFixed(1);
      const songSec = (frame / opts.fps).toFixed(2);

      const etaM = Math.floor(etaSec / 60);
      const etaS = Math.floor(etaSec % 60).toString().padStart(2, '0');

      console.log(
        `[Frame ${frame.toString().padStart(5)}/${opts.frames}] ${percent}% | ` +
        `Song: ${songSec}s | Speed: ${currentFps.toFixed(1)} fps | ETA: ${etaM}m ${etaS}s`
      );
    }
  }

  console.log('All frames rendered! Closing pipe to FFmpeg...');
  ffmpeg.stdin.end();

  await new Promise((resolve) => {
    ffmpeg.on('close', (code) => {
      console.log(`FFmpeg exited with code ${code}`);
      resolve();
    });
  });

  await browser.close();

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== RENDER COMPLETE in ${totalTimeSec}s ===`);

  if (opts.format === 'both' || opts.format === '1440p') {
    if (fs.existsSync(out1440)) {
      const mb = (fs.statSync(out1440).size / (1024 * 1024)).toFixed(2);
      console.log(`  ✓ 1440p60 Master: ${out1440} (${mb} MB)`);
    }
  }
  if (opts.format === 'both' || opts.format === '1080p') {
    if (fs.existsSync(out1080)) {
      const mb = (fs.statSync(out1080).size / (1024 * 1024)).toFixed(2);
      console.log(`  ✓ 1080p60 Master: ${out1080} (${mb} MB)`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal render pipeline error:', err);
  process.exit(1);
});
