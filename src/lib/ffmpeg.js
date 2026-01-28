import { fetchFile } from '@ffmpeg/util';

let worker = null;
const pendingRequests = new Map();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./ffmpeg-worker.js', import.meta.url), {
      type: 'module'
    });
    
    worker.onmessage = ({ data }) => {
      const { type, id, error, progress, data: resultData, mimeType, message } = data;
      
      if (type === 'log') {
        console.log('[FFmpeg Worker]', message);
        return;
      }
      
      if (!id || !pendingRequests.has(id)) return;
      
      const request = pendingRequests.get(id);
      
      switch (type) {
        case 'progress':
          if (request.onProgress) {
            request.onProgress(progress);
          }
          break;
          
        case 'complete': {
          const blob = new Blob([resultData], { type: mimeType });
          request.resolve(blob);
          pendingRequests.delete(id);
          break;
        }
          
        case 'error':
          request.reject(new Error(error));
          pendingRequests.delete(id);
          break;
      }
    };
    
    worker.onerror = (error) => {
      console.error('FFmpeg Worker Error:', error);
    };
  }
  return worker;
}

function runWorkerTask(type, data, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = getWorker();
    const id = Math.random().toString(36).substring(7);
    
    pendingRequests.set(id, { resolve, reject, onProgress });
    
    // Use transferable objects if data contains ArrayBuffer
    const transferables = [];
    if (data.fileData instanceof ArrayBuffer) {
      transferables.push(data.fileData);
    }
    
    if (transferables.length > 0) {
      worker.postMessage({ type, id, data }, transferables);
    } else {
      worker.postMessage({ type, id, data });
    }
  });
}

export function loadFFmpeg() {
  return runWorkerTask('load', {});
}

export async function extractAudio(videoFile, onProgress) {
  const fileData = await fetchFile(videoFile);
  
  // Use transferable objects for better performance
  const buffer = fileData.buffer instanceof ArrayBuffer ? fileData.buffer : fileData.buffer.buffer;
  
  return runWorkerTask(
    'extractAudio', 
    { 
      fileData: buffer,
      fileName: videoFile.name 
    }, 
    onProgress
  );
}

export async function cutVideo(videoFile, segments, settings, onProgress) {
  const fileData = await fetchFile(videoFile);
  
  // Use transferable objects for better performance
  const buffer = fileData.buffer instanceof ArrayBuffer ? fileData.buffer : fileData.buffer.buffer;
  
  return runWorkerTask(
    'cutVideo',
    {
      fileData: buffer,
      segments,
      settings: settings || { quality: 'medium', resolution: 'original', format: 'mp4' }
    },
    onProgress
  );
}

export function getKeptSegments(duration, deletedSegments) {
  if (deletedSegments.length === 0) {
    return [{ start: 0, end: duration }];
  }
  
  const kept = [];
  let currentStart = 0;
  
  // Sort deleted segments
  const sorted = [...deletedSegments].sort((a, b) => a.start - b.start);
  
  sorted.forEach(deleted => {
    if (currentStart < deleted.start) {
      kept.push({ start: currentStart, end: deleted.start });
    }
    currentStart = deleted.end;
  });
  
  // Add final segment if there's content after last deletion
  if (currentStart < duration) {
    kept.push({ start: currentStart, end: duration });
  }
  
  return kept;
}