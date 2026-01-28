import createModule from "@transcribe/shout";
import { FileTranscriber } from "@transcribe/transcriber";

let transcriber = null;
let isInitializing = false;
let currentSegmentCallback = null;

/**
 * Load Whisper model via Transcribe.js dynamically
 */
export async function loadWhisper(modelSize = 'tiny', onProgress) {
  // If already initialized, return
  if (transcriber) {
    console.log("[Transcription] Transcriber already loaded");
    return transcriber;
  }

  // If currently initializing, wait for it
  if (isInitializing) {
    console.log("[Transcription] Waiting for initialization...");
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return transcriber;
  }

  isInitializing = true;

  try {
    console.log("[Transcription] Initializing FileTranscriber...");
    
    // Create the transcriber instance with createModule from @transcribe/shout
    transcriber = new FileTranscriber({
      createModule, // Required: WASM module loader from @transcribe/shout
      model: `models/ggml-${modelSize}-q5_1.bin`,
      onProgress: (progress) => {
        console.log("[Transcription] Progress raw:", progress);
        if (onProgress) {
          if (typeof progress === 'number') {
            // Normalize to 0-100
            const percentage = progress <= 1 ? progress * 100 : progress;
            onProgress(percentage);
          } else if (progress.loaded && progress.total) {
            const percent = (progress.loaded / progress.total) * 100;
            onProgress(percent);
          }
        }
      },
      onSegment: (segment) => {
          console.log("[Transcription] Internal onSegment:", segment, "t0:", segment.t0, "t1:", segment.t1);
          if (segment.tokens && segment.tokens.length > 0) {
             console.log("First token sample:", segment.tokens[0]);
          }
          
          if (!currentSegmentCallback) return;

          let words = [];
          
          // Strategy 1: strict token timestamps
          if (segment.tokens && segment.tokens.length > 0) {
            words = segment.tokens.map((token) => {
              if (typeof token.t0 !== 'number' || typeof token.t1 !== 'number') return null;
              
              const startTime = token.t0 / 100;
              const endTime = token.t1 / 100;
              let wordText = (token.text || '').trim();
              wordText = wordText.replace(/\[_.*?\]/g, '').trim();
              
              if (!wordText) return null;
              return {
                word: wordText,
                start: startTime,
                end: endTime,
                confidence: token.p || 0.9,
              };
            }).filter(w => w !== null);
          }
          
          // Strategy 2: Parse text with [_TT_] tags
          if (words.length === 0 && segment.text && segment.text.includes('[_TT_')) {
             const text = segment.text;
             const tokenRegex = /\[_TT_(\d+)\]/g;
             let match;
             let lastIndex = 0;
             let lastTime = 0; 
             
             // Use segment start as initial baseline if available
             if (typeof segment.t0 === 'number') lastTime = segment.t0 / 100;

             while ((match = tokenRegex.exec(text)) !== null) {
               const time = parseInt(match[1]) / 100;
               const content = text.slice(lastIndex, match.index).trim();
               
               if (content) {
                 const contentWords = content.replace(/\[_.*?\]/g, '').trim().split(/\s+/);
                 const duration = Math.max(0.1, time - lastTime);
                 const perWord = duration / Math.max(1, contentWords.length);
                 
                 contentWords.forEach((w, i) => {
                   if (!w) return;
                   words.push({
                     word: w,
                     start: lastTime + (i * perWord),
                     end: lastTime + ((i + 1) * perWord),
                     confidence: 0.85
                   });
                 });
               }
               lastTime = time;
               lastIndex = match.index + match[0].length;
             }
          }

          // Strategy 3: Interpolate over segment duration
          if (words.length === 0 && (segment.tokens || segment.text)) {
              const segStart = typeof segment.t0 === 'number' ? segment.t0 / 100 : 0;
              const segEnd = typeof segment.t1 === 'number' ? segment.t1 / 100 : segStart + 2.0; // Default 2s if unknown
              const duration = Math.max(0.5, segEnd - segStart);
              
              let contentWords = [];
              if (segment.tokens) {
                 contentWords = segment.tokens.map(t => (t.text||'').trim()).filter(t => t && !t.startsWith('['));
              } else if (segment.text) {
                 contentWords = segment.text.replace(/\[_.*?\]/g, '').trim().split(/\s+/).filter(w => w);
              }
              
              if (contentWords.length > 0) {
                  const perWord = duration / contentWords.length;
                  contentWords.forEach((w, i) => {
                      words.push({
                          word: w,
                          start: segStart + (i * perWord),
                          end: segStart + ((i + 1) * perWord),
                          confidence: 0.7 // Low confidence
                      });
                  });
              }
          }
          
          if (words.length > 0) {
             console.log(`[Transcription] Generated ${words.length} words from segment`);
             currentSegmentCallback(words);
          }
      }
    });

    console.log("[Transcription] Calling init()...");
    await transcriber.init();
    
    console.log("[Transcription] Transcriber ready");
    isInitializing = false;
    
    if (onProgress) {
      onProgress(100);
    }
    
    return transcriber;
  } catch (error) {
    isInitializing = false;
    transcriber = null;
    console.error("[Transcription] Failed to initialize:", error);
    console.error("[Transcription] Error stack:", error.stack);
    throw new Error(`Failed to load transcription model: ${error.message}`);
  }
}

/**
 * Transcribe audio or video file
 */
export async function transcribeAudio(file, language = 'en', onProgress, onPartialTranscript) {
  console.log("[Transcription] Starting transcription...");
  
  if (!transcriber) {
    throw new Error("FileTranscriber not initialized. Call loadWhisper() first.");
  }

  try {
    const allWords = [];
    
    // Set up the global callback to route segments to our local variables
    currentSegmentCallback = (newWords) => {
        allWords.push(...newWords);
        if (onPartialTranscript) {
            console.log("[Transcription] Sending partial update with", allWords.length, "total words");
            onPartialTranscript([...allWords]);
        }
    };
    
    const result = await transcriber.transcribe(file, {
      lang: language, 
      token_timestamps: true, 
      // onProgress and onSegment are now handled in constructor or global
    });
    
    // Clear callback
    currentSegmentCallback = null;

    console.log("[Transcription] Complete, result:", result);
    console.log("[Transcription] Result structure:", JSON.stringify(result, null, 2));
    
    let finalWords = [];
    
    // Check result.transcription array (actual API format)
    if (result.transcription && Array.isArray(result.transcription)) {
      result.transcription.forEach(segment => {
        if (segment.tokens && segment.tokens.length > 0) {
            const words = segment.tokens.map((token) => {
              if (typeof token.t0 !== 'number' || typeof token.t1 !== 'number') return null;

              const startTime = token.t0 / 100;
              const endTime = token.t1 / 100;
              
              return {
                word: (token.text || '').trim(),
                start: startTime,
                end: endTime,
                confidence: token.p || 0.9,
              };
            }).filter(w => w !== null && w.word.length > 0);
          
          finalWords.push(...words);
        }
      });
    }
    
    // Fallback to allWords from onSegment
    if (finalWords.length === 0 && allWords.length > 0) {
      finalWords = allWords;
    }
    
    // Last resort: split text into words with estimated timestamps
    // Fallback if result.transcription exists but tokens are missing or generic
    if (finalWords.length === 0 && result.text) {
      const text = result.text;
      const tokenRegex = /\[_TT_(\d+)\]/g;
      let match;
      let lastIndex = 0;
      let lastTime = 0;
      
      const words = [];
      
      // Parse text looking for [_TT_time] Word [_TT_time] pattern
      // Example: [_TT_100] Hello [_TT_150] World [_TT_200]
      while ((match = tokenRegex.exec(text)) !== null) {
        const time = parseInt(match[1]) / 100; // Convert 1364 -> 13.64s
        const content = text.slice(lastIndex, match.index).trim();
        
        // If there was content before this timestamp tag
        if (content) {
          // Verify it's not just another tag (should be handled by slice but let's be safe)
          // Split by spaces to get individual words
          const contentWords = content.replace(/\[_.*?\]/g, '').trim().split(/\s+/);
          
          const duration = Math.max(0.1, time - lastTime);
          const perWord = duration / contentWords.length;
          
          contentWords.forEach((w, i) => {
             if (!w) return;
             words.push({
               word: w,
               start: lastTime + (i * perWord),
               end: lastTime + ((i + 1) * perWord),
               confidence: 0.8
             });
          });
        }
        
        lastTime = time;
        lastIndex = match.index + match[0].length;
      }
      
      // Handle remaining text after last token
      const remaining = text.slice(lastIndex).trim();
      if (remaining) {
        const cleanRemaining = remaining.replace(/\[_.*?\]/g, '').trim();
        const contentWords = cleanRemaining.split(/\s+/);
        contentWords.forEach((w, i) => {
           if (!w) return;
           words.push({
             word: w,
             start: lastTime + (i * 0.5), // Estimate 0.5s per word
             end: lastTime + ((i + 1) * 0.5),
             confidence: 0.8
           });
        });
      }
      
      finalWords = words;
    }

    if (finalWords.length === 0 && result.transcription && result.transcription.length > 0) {
      // Old fallback: split text into words with estimated timestamps
      const fullText = result.transcription.map(s => s.text).join(' ');
      const words = fullText.replace(/\[_.*?\]/g, '').split(/\s+/).filter(w => w.trim());
      
      // Get duration from last segment
      const lastSegment = result.transcription[result.transcription.length - 1];
      const duration = lastSegment.t1 ? lastSegment.t1 / 100 : 60;
      const timePerWord = duration / Math.max(1, words.length);
      
      finalWords = words.map((word, index) => ({
        word: word,
        start: index * timePerWord,
        end: (index + 1) * timePerWord,
        confidence: 0.7, // Lower confidence for fallback
      }));
    }

    console.log("[Transcription] Returning", finalWords.length, "words");
    
    return {
      text: result.transcription ? result.transcription.map(s => s.text).join(' ') : '',
      words: finalWords,
    };
  } catch (error) {
    console.error("[Transcription] Transcription failed:", error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

export function exportTranscriptAsSRT(transcript) {
  let srt = '';
  transcript.forEach((word, index) => {
    srt += `${index + 1}\n`;
    srt += `${formatSRTTime(word.start)} --> ${formatSRTTime(word.end)}\n`;
    srt += `${word.word}\n\n`;
  });
  return srt;
}

export function exportTranscriptAsVTT(transcript) {
  let vtt = 'WEBVTT\n\n';
  transcript.forEach((word, index) => {
    vtt += `${index + 1}\n`;
    vtt += `${formatVTTTime(word.start)} --> ${formatVTTTime(word.end)}\n`;
    vtt += `${word.word}\n\n`;
  });
  return vtt;
}

function formatSRTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')},${ms.toString().padStart(3,'0')}`;
}

function formatVTTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}`;
}
