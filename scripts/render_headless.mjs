import puppeteer from 'puppeteer';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';

// Check if a server is already listening on the given port
async function isServerRunning(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Built-in zero-dependency static file server for dist/
function startStaticServer(port = 5173, rootDir = 'dist') {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.fbx': 'application/octet-stream',
    '.bin': 'application/octet-stream',
    '.hdr': 'application/octet-stream',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };

  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

    let filePath = path.join(rootDir, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(rootDir, 'index.html');
    }

    try {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('File Not Found');
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '0.0.0.0', () => {
      console.log(`✓ Started built-in static server on port ${port} serving '${rootDir}'`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

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
    imageType: 'jpeg',   // 'jpeg' (15x faster) or 'png'
    quality: 95,         // JPEG quality (visually lossless for video)
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
    else if (arg === '--png') options.imageType = 'png';
    else if (arg === '--jpeg') options.imageType = 'jpeg';
    else if (arg === '--quality' && args[i + 1]) options.quality = parseInt(args[++i], 10);
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

  // Ensure server is reachable, or launch internal zero-dependency static server
  let internalServer = null;
  const isUp = await isServerRunning(opts.port);
  if (!isUp) {
    console.log(`No active server on port ${opts.port}. Checking production build...`);
    if (!fs.existsSync('dist/index.html')) {
      console.log('Building production client bundle (npm run build)...');
      execSync('npm run build', { stdio: 'inherit' });
    }
    internalServer = await startStaticServer(opts.port, 'dist');
  } else {
    console.log(`✓ Active server detected on port ${opts.port}`);
  }

  // Launch Puppeteer with GPU acceleration flags FIRST (before spawning FFmpeg)
  console.log('Launching headless browser with GPU acceleration...');
  const launchOptions = {
    headless: 'new',
    ignoreDefaultArgs: true, // Prevents Puppeteer from injecting --use-angle=swiftshader-webgl
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--headless=new',
      '--enable-gpu',
      '--use-angle=vulkan',
      '--enable-features=Vulkan',
      '--disable-vulkan-surface',
      '--enable-unsafe-webgpu',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
      '--enable-gpu-rasterization',
      '--disable-dev-shm-usage',
      '--disable-features=Translate',
      '--no-first-run',
      '--no-default-browser-check',
      `--window-size=${width},${height}`,
      '--hide-scrollbars',
      '--mute-audio',
      '--enable-automation',
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

  const glRenderer = await page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'Generic WebGL';
    } catch (e) {
      return `GL query error: ${e.message}`;
    }
  });
  const isHardwareGpu = !glRenderer.toLowerCase().includes('swiftshader') && !glRenderer.toLowerCase().includes('llvmpipe');
  console.log('================================================================');
  console.log(`  RENDER ACCELERATOR:  ${glRenderer}`);
  console.log(`  HARDWARE GPU ACTIVE: ${isHardwareGpu ? 'YES (Nvidia Hardware Acceleration)' : 'NO (CPU SwiftShader Fallback - run Cell 3 to install libnvidia-gl)'}`);
  console.log('================================================================');
  console.log(`Capture format: ${opts.imageType.toUpperCase()}${opts.imageType === 'jpeg' ? ` (quality: ${opts.quality})` : ''}`);
  console.log('Stage ready! Starting deterministic frame-by-frame rendering...');

  // Build FFmpeg argument list with explicit input dimensions and per-output stream options
  let ffmpegArgs = [
    '-hide_banner',
    '-loglevel', 'warning',
    '-y',
    '-thread_queue_size', '512',
    '-f', 'image2pipe',
    '-vcodec', opts.imageType === 'jpeg' ? 'mjpeg' : 'png',
    '-s', `${width}x${height}`,
    '-r', `${opts.fps}`,
    '-i', '-',
    '-thread_queue_size', '512',
    '-i', opts.audio,
  ];

  if (opts.format === 'both') {
    console.log(`Outputs will be generated simultaneously:\n  -> ${out1440}\n  -> ${out1080}`);
    ffmpegArgs.push(
      '-filter_complex', '[0:v]split=2[v1440][v1080_in];[v1080_in]scale=1920:1080:flags=bicubic[v1080]',
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
  let renderStartTime = startTime;

  for (let frame = opts.start; frame < opts.frames; frame++) {
    // 1. Advance virtual clock & grab WebGL canvas buffer directly (bypasses CDP screenshot pipeline)
    const qualityNorm = opts.quality / 100;
    const base64Url = await page.evaluate((f, q) => {
      return typeof window.__SEEK_FRAME__ === 'function'
        ? window.__SEEK_FRAME__(f, q)
        : null;
    }, frame, qualityNorm);

    let frameBuffer;
    if (base64Url && typeof base64Url === 'string' && base64Url.startsWith('data:image/jpeg;base64,')) {
      frameBuffer = Buffer.from(base64Url.slice(23), 'base64');
    } else {
      const screenshotOpts = {
        type: opts.imageType,
        omitBackground: false,
      };
      if (opts.imageType === 'jpeg') {
        screenshotOpts.quality = opts.quality;
      }
      frameBuffer = await page.screenshot(screenshotOpts);
    }

    // 2. Pipe raw frame to FFmpeg with backpressure handling
    const canWrite = ffmpeg.stdin.write(frameBuffer);
    if (!canWrite) {
      await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
    }

    // Warmup frame handling: calibrate active timer after first frame
    if (frame === opts.start) {
      renderStartTime = Date.now();
      console.log(`[Frame ${frame.toString().padStart(5)}/${opts.frames}] GPU pipeline & shaders calibrated. Starting render stream...`);
      continue;
    }

    // 4. Progress reporting (every 10 frames for live real-time feedback)
    const logInterval = 10;
    if (frame % logInterval === 0 || frame === opts.frames - 1) {
      const now = Date.now();
      const elapsedActiveSec = (now - renderStartTime) / 1000;
      const framesRendered = frame - opts.start;
      const currentFps = framesRendered / (elapsedActiveSec || 0.001);
      const remainingFrames = opts.frames - frame - 1;
      const etaSec = remainingFrames / (currentFps || 1);
      const percent = ((framesRendered / (opts.frames - opts.start)) * 100).toFixed(1);
      const songSec = (frame / opts.fps).toFixed(2);

      const etaM = Math.floor(etaSec / 60);
      const etaS = Math.floor(etaSec % 60).toString().padStart(2, '0');

      console.log(
        `[Frame ${frame.toString().padStart(5)}/${opts.frames}] ${percent.padStart(5)}% | ` +
        `Song: ${songSec.padStart(6)}s | Speed: ${currentFps.toFixed(1)} fps | ETA: ${etaM}m ${etaS}s`
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

  if (internalServer) {
    console.log('Shutting down internal static server...');
    internalServer.close();
  }

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
