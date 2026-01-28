import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg = null;
let ffmpegLoaded = false;

// Initialize FFmpeg
async function loadFFmpeg() {
  if (ffmpeg && ffmpegLoaded) return ffmpeg;
  
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      // Send log to main thread
      self.postMessage({ type: 'log', message });
    });
  }
  
  if (!ffmpegLoaded) {
    if (!self.crossOriginIsolated) {
        self.postMessage({ type: 'log', message: 'WARNING: Cross-Origin Isolation is not enabled. SharedArrayBuffer will not work.' });
    }

    try {
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      ffmpegLoaded = true;
      self.postMessage({ type: 'loaded' });
    } catch (error) {
      self.postMessage({ type: 'error', error: `Failed to load FFmpeg: ${error.message}` });
      ffmpeg = null;
      throw error;
    }
  }
  
  return ffmpeg;
}

// Helpers
async function fileExists(ffmpeg, filename) {
  try {
    const files = await ffmpeg.listDir('/');
    return files.some(file => file.name === filename);
  } catch {
    return false;
  }
}

async function safeDelete(ffmpeg, file) {
  try {
    if (await fileExists(ffmpeg, file)) {
      await ffmpeg.deleteFile(file);
    }
  } catch (error) {
    console.warn(`Could not delete ${file}:`, error.message);
  }
}

// Main message handler
self.onmessage = async (e) => {
  const { type, id, data } = e.data;
  
  try {
    if (type === 'load') {
      await loadFFmpeg();
      self.postMessage({ type: 'complete', id, data: null });
      return;
    }
    
    const ffmpegInstance = await loadFFmpeg();
    
    switch (type) {
      case 'extractAudio':
        await handleExtractAudio(id, ffmpegInstance, data);
        break;
      case 'cutVideo':
        await handleCutVideo(id, ffmpegInstance, data);
        break;
      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    console.error('[FFmpeg Worker] Error:', error);
    self.postMessage({ 
      type: 'error', 
      id, 
      error: error.message || String(error)
    });
  }
};

async function handleExtractAudio(id, ffmpeg, { fileData }) {
  const logProgress = ({ progress }) => {
    self.postMessage({ type: 'progress', id, progress: progress * 100 });
  };
  
  ffmpeg.on('progress', logProgress);
  
  try {
    await safeDelete(ffmpeg, 'input.mp4');
    await safeDelete(ffmpeg, 'audio.wav');
    
    await ffmpeg.writeFile('input.mp4', new Uint8Array(fileData));
    
    const ret = await ffmpeg.exec([
      '-y', '-i', 'input.mp4', '-vn', 
      '-c:a', 'pcm_s16le', '-ar', '16000', '-ac', '1', 
      'audio.wav'
    ]);
    
    if (ret !== 0) {
      throw new Error(`FFmpeg extraction failed with code ${ret}`);
    }
    
    if (!(await fileExists(ffmpeg, 'audio.wav'))) {
      throw new Error('Output file audio.wav was not created');
    }
    
    const data = await ffmpeg.readFile('audio.wav');
    
    await safeDelete(ffmpeg, 'input.mp4');
    await safeDelete(ffmpeg, 'audio.wav');
    
    // Get the underlying ArrayBuffer
    const buffer = data.buffer instanceof ArrayBuffer ? data.buffer : data.buffer.buffer;
    
    self.postMessage({ 
      type: 'complete', 
      id, 
      data: buffer, 
      mimeType: 'audio/wav'
    }, [buffer]);
    
  } catch (error) {
    await safeDelete(ffmpeg, 'input.mp4');
    await safeDelete(ffmpeg, 'audio.wav');
    throw error;
  } finally {
    ffmpeg.off('progress', logProgress);
  }
}

async function handleCutVideo(id, ffmpeg, { fileData, segments, settings }) {
  const logProgress = ({ progress }) => {
    try {
      self.postMessage({ type: 'progress', id, progress: progress * 100 });
    } catch (error) {
      console.error('[FFmpeg Worker] Failed to send progress:', error);
    }
  };
  
  ffmpeg.on('progress', logProgress);
  
  try {
    console.log('[FFmpeg Worker] Starting video cut with', segments.length, 'segments');
    
    await safeDelete(ffmpeg, 'input.mp4');
    await safeDelete(ffmpeg, 'output.mp4');
    
    console.log('[FFmpeg Worker] Writing input file, size:', fileData.byteLength);
    await ffmpeg.writeFile('input.mp4', new Uint8Array(fileData));
    
    // Build filter complex for cutting segments
    const filterParts = [];
    const concatInputs = [];
    
    segments.forEach((segment, index) => {
      const { start, end } = segment;
      console.log(`[FFmpeg Worker] Segment ${index}: ${start}s - ${end}s`);
      filterParts.push(`[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[v${index}]`);
      filterParts.push(`[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[a${index}]`);
      concatInputs.push(`[v${index}][a${index}]`);
    });
    
    const filterComplex = [
      ...filterParts,
      `${concatInputs.join('')}concat=n=${segments.length}:v=1:a=1[outv][outa]`
    ].join(';');
    
    console.log('[FFmpeg Worker] Filter complex:', filterComplex);
    
    // Get quality settings
    const { quality = 'medium', resolution = 'original', format = 'mp4' } = settings || {};
    
    // Quality presets
    const qualitySettings = {
      high: { preset: 'slow', crf: '18', audioBitrate: '192k' },
      medium: { preset: 'medium', crf: '23', audioBitrate: '128k' },
      low: { preset: 'veryfast', crf: '28', audioBitrate: '96k' }
    };
    
    const qualityConfig = qualitySettings[quality] || qualitySettings.medium;
    
    // Resolution settings
    const resolutionFilters = {
      '1080p': 'scale=1920:1080:force_original_aspect_ratio=decrease',
      '720p': 'scale=1280:720:force_original_aspect_ratio=decrease',
      '480p': 'scale=854:480:force_original_aspect_ratio=decrease',
      '360p': 'scale=640:360:force_original_aspect_ratio=decrease',
      'original': null
    };
    
    const scaleFilter = resolutionFilters[resolution];
    
    // Build FFmpeg command
    const ffmpegArgs = [
      '-i', 'input.mp4',
      '-filter_complex', filterComplex,
      '-map', '[outv]',
      '-map', '[outa]'
    ];
    
    // Add scale filter if resolution is not original
    if (scaleFilter) {
      ffmpegArgs.push('-vf', scaleFilter);
    }
    
    // Add encoding settings
    ffmpegArgs.push(
      '-c:v', 'libx264',
      '-preset', qualityConfig.preset,
      '-crf', qualityConfig.crf,
      '-c:a', 'aac',
      '-b:a', qualityConfig.audioBitrate,
      '-movflags', '+faststart', // Enable streaming
      'output.mp4'
    );
    
    console.log('[FFmpeg Worker] Executing FFmpeg with args:', ffmpegArgs.join(' '));
    
    const ret = await ffmpeg.exec(ffmpegArgs);
    
    console.log('[FFmpeg Worker] FFmpeg execution completed with code:', ret);
    
    if (ret !== 0) {
      throw new Error(`FFmpeg cut failed with code ${ret}`);
    }
    
    if (!(await fileExists(ffmpeg, 'output.mp4'))) {
      throw new Error('Output file output.mp4 was not created');
    }
    
    console.log('[FFmpeg Worker] Reading output file');
    const data = await ffmpeg.readFile('output.mp4');
    
    console.log('[FFmpeg Worker] Output file size:', data.byteLength);
    
    await safeDelete(ffmpeg, 'input.mp4');
    await safeDelete(ffmpeg, 'output.mp4');
    
    // Get the underlying ArrayBuffer
    const buffer = data.buffer instanceof ArrayBuffer ? data.buffer : data.buffer.buffer;
    
    console.log('[FFmpeg Worker] Sending result, buffer size:', buffer.byteLength);
    
    self.postMessage({ 
      type: 'complete', 
      id, 
      data: buffer,
      mimeType: 'video/mp4'
    }, [buffer]);
    
  } catch (error) {
    console.error('[FFmpeg Worker] Cut video error:', error);
    await safeDelete(ffmpeg, 'input.mp4');
    await safeDelete(ffmpeg, 'output.mp4');
    throw error;
  } finally {
    ffmpeg.off('progress', logProgress);
  }
}
