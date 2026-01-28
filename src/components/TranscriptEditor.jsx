import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2, Download, Trash2 } from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { processVideoTranscription } from '../lib/video-processor';
import { exportTranscriptAsSRT, exportTranscriptAsVTT, loadWhisper } from '../lib/transcription';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

export default function TranscriptEditor() {
  const {
    videoFile,
    transcript,
    currentTime,
    isTranscribing,
    transcriptionProgress,
    searchQuery,
    deletedSegments,
    language,
    setTranscript,
    setIsTranscribing,
    setTranscriptionProgress,
    setSearchQuery,
    setCurrentTime,
    setIsPlaying,
    deleteWord,
    setLanguage,
    clearDeletedSegments,
  } = useEditor();

  const [selectedWords, setSelectedWords] = useState(new Set());
  const transcriptRef = useRef(null);
  const progressRef = useRef(0);
  const [statusMessage, setStatusMessage] = useState('');

  const startTranscription = React.useCallback(async () => {
    console.log('[TranscriptEditor] Starting transcription...');
    setIsTranscribing(true);
    setTranscriptionProgress(0);
    setStatusMessage('Loading Whisper model...');
    
    // Clear any previous deleted segments to prevent strike-through bug
    if (clearDeletedSegments) {
      clearDeletedSegments();
    }
    
    try {
      // Step 1: Load the Whisper model first
      await loadWhisper('tiny', (progress) => {
        setTranscriptionProgress(progress);
        setStatusMessage('Loading Whisper model...');
      });
      
      setStatusMessage('Starting transcription...');
      
      let result;
      
      const processVideo = async () => {
        let lastUpdate = 0;
        
        return await processVideoTranscription(
          videoFile,
          language,
          (progress, message) => {
            const now = Date.now();
            console.log('[TranscriptEditor] Progress:', progress, message);
            // Update if > 1% change or > 100ms elapsed or complete
            if (
              Math.abs(progress - progressRef.current) > 1 || 
              now - lastUpdate > 100 || 
              progress === 100 ||
              progress === 0
            ) {
              setTranscriptionProgress(progress);
              progressRef.current = progress;
              setStatusMessage(message || 'Processing...');
              lastUpdate = now;
            }
          }
        );
      };
      
      result = await processVideo();
      
      console.log('[TranscriptEditor] Transcription complete, result:', result);
      
      if (!result || result.length === 0) {
        throw new Error('Transcription returned no results');
      }
      
      setTranscript(result);
      setStatusMessage('Transcription complete!');
      setTranscriptionProgress(100);
      
      setTimeout(() => {
        setIsTranscribing(false);
      }, 500);
      
    } catch (error) {
      console.error('[TranscriptEditor] Transcription error:', error);
      setStatusMessage('Transcription failed: ' + error.message);
      alert('Transcription failed: ' + error.message);
      setIsTranscribing(false);
    }
  }, [videoFile, language, setIsTranscribing, setTranscriptionProgress, setTranscript, clearDeletedSegments]);

  useEffect(() => {
    if (videoFile && transcript.length === 0 && !isTranscribing) {
      startTranscription();
    }
  }, [videoFile, transcript.length, isTranscribing, startTranscription]);

  const handleWordClick = (wordIndex, word) => {
    setCurrentTime(word.start);
    setIsPlaying(true);
    
    const newSelection = new Set(selectedWords);
    if (newSelection.has(wordIndex)) {
      newSelection.delete(wordIndex);
    } else {
      newSelection.add(wordIndex);
    }
    setSelectedWords(newSelection);
  };

  const handleDeleteSelected = () => {
    if (selectedWords.size === 0) return;
    
    console.log('Deleting words:', Array.from(selectedWords));
    console.log('Current deleted segments BEFORE:', deletedSegments);
    
    // Delete each selected word
    Array.from(selectedWords).sort((a, b) => b - a).forEach(index => {
      const word = transcript[index];
      console.log('Deleting word:', index, word);
      deleteWord(index);
    });
    
    // Check segments after deletion
    setTimeout(() => {
      console.log('Deleted segments AFTER:', deletedSegments);
    }, 100);
    
    setSelectedWords(new Set());
  };

  const isWordDeleted = (word) => {
    const deleted = deletedSegments.some(seg => 
      word.start >= seg.start && word.end <= seg.end
    );
    
    // Debug logging - remove after fixing
    if (deleted) {
      console.log('Word deleted:', word.word, 'time:', word.start, '-', word.end, 'segments:', deletedSegments);
    }
    
    return deleted;
  };

  const isWordActive = (index) => {
    const word = transcript[index];
    if (!word) return false;
    return currentTime >= word.start && currentTime <= word.end;
  };

  const downloadTranscript = (format) => {
    let content, filename, mimeType;
    
    if (format === 'srt') {
      content = exportTranscriptAsSRT(transcript);
      filename = 'transcript.srt';
      mimeType = 'text/srt';
    } else {
      content = exportTranscriptAsVTT(transcript);
      filename = 'transcript.vtt';
      mimeType = 'text/vtt';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTranscript = searchQuery
    ? transcript.map((word, index) => ({
        word,
        index,
        matches: word.word.toLowerCase().includes(searchQuery.toLowerCase())
      })).filter(item => item.matches)
    : transcript.map((word, index) => ({ word, index, matches: true }));

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">📝</span>
            Transcript Editor
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-1.5 rounded-md border bg-background text-sm"
              disabled={isTranscribing || transcript.length > 0}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
            </select>
            
            {transcript.length > 0 && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadTranscript('srt')}
                  title="Download SRT"
                >
                  <Download className="w-4 h-4 mr-1" />
                  SRT
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadTranscript('vtt')}
                  title="Download VTT"
                >
                  <Download className="w-4 h-4 mr-1" />
                  VTT
                </Button>
              </div>
            )}
          </div>
        </div>

        {transcript.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {selectedWords.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleDeleteSelected}
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedWords.size})
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-6">
        {isTranscribing ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="text-center space-y-2 w-full max-w-md">
              <p className="text-lg font-medium">{statusMessage}</p>
              <Progress value={transcriptionProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {Math.round(transcriptionProgress)}%
              </p>
            </div>
          </div>
        ) : transcript.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="text-6xl">🎤</div>
            <p className="text-lg text-muted-foreground">
              Waiting to transcribe video...
            </p>
          </div>
        ) : (
          <div 
            ref={transcriptRef}
            className="h-full overflow-y-auto space-y-1 px-2"
          >
            <p className="text-sm text-muted-foreground mb-4">
              Click words to jump to that moment • Select multiple words and delete to remove segments
            </p>
            
            <div className="leading-relaxed text-lg">
              {filteredTranscript.map(({ word, index }) => {
                const isDeleted = isWordDeleted(word);
                const isActive = isWordActive(index);
                const isSelected = selectedWords.has(index);
                const isLowConfidence = word.confidence < 0.7;
                
                return (
                  <span
                    key={index}
                    onClick={() => handleWordClick(index, word)}
                    className={`
                      word-clickable inline-block mx-0.5 my-0.5 transition-all duration-150 cursor-pointer
                      ${isActive ? 'word-active font-semibold scale-105' : ''}
                      ${isDeleted ? 'word-deleted' : ''}
                      ${isSelected ? 'bg-yellow-200 dark:bg-yellow-800 font-medium' : ''}
                      ${isLowConfidence ? 'word-low-confidence' : ''}
                      ${searchQuery && word.word.toLowerCase().includes(searchQuery.toLowerCase()) ? 'bg-green-100 dark:bg-green-900' : ''}
                    `}
                    title={`${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s (confidence: ${(word.confidence * 100).toFixed(0)}%)`}
                  >
                    {word.word}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}