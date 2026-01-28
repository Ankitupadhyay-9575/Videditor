import React, { createContext, useContext, useState, useCallback } from 'react';
import { mergeSegments } from '../lib/segments';

const EditorContext = createContext();

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider');
  }
  return context;
};

export const EditorProvider = ({ children }) => {
  // Video state
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Transcript state
  const [transcript, setTranscriptData] = useState([]);
  const [transcriptText, setTranscriptText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [language, setLanguage] = useState('en');
  
  // Editing state
  const [deletedSegments, setDeletedSegments] = useState([]);
  const [selectedWordIndex, setSelectedWordIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedVideoUrl, setExportedVideoUrl] = useState(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  
  // FFmpeg state
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  // Actions
  const handleSetVideoFile = useCallback((file) => {
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
  }, []);

  const setTranscript = useCallback((transcriptData) => {
    const text = transcriptData.map(w => w.word).join(' ');
    setTranscriptData(transcriptData);
    setTranscriptText(text);
  }, []);

  const deleteTextRange = useCallback((startIndex, endIndex) => {
    const startTime = transcript[startIndex]?.start;
    const endTime = transcript[endIndex]?.end;
    
    if (startTime !== undefined && endTime !== undefined) {
      setDeletedSegments(prevSegments => {
        const newSegments = [...prevSegments, { start: startTime, end: endTime }];
        return mergeSegments(newSegments);
      });
    }
  }, [transcript]);

  const deleteTimeRange = useCallback((startTime, endTime) => {
    setDeletedSegments(prevSegments => {
      const newSegments = [...prevSegments, { start: startTime, end: endTime }];
      return mergeSegments(newSegments);
    });
  }, []);

  const deleteWord = useCallback((wordIndex) => {
    const word = transcript[wordIndex];
    
    if (word) {
      setDeletedSegments(prevSegments => {
        const newSegments = [...prevSegments, { start: word.start, end: word.end }];
        return mergeSegments(newSegments);
      });
    }
  }, [transcript]);

  const undoLastDelete = useCallback(() => {
    setDeletedSegments(prevSegments => {
      if (prevSegments.length === 0) return prevSegments;
      return prevSegments.slice(0, -1);
    });
  }, []);

  const clearDeletedSegments = useCallback(() => {
    setDeletedSegments([]);
  }, []);

  const reset = useCallback(() => {
    setVideoFile(null);
    setVideoUrl(null);
    setVideoDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setTranscriptData([]);
    setTranscriptText('');
    setDeletedSegments([]);
    setSelectedWordIndex(null);
    setExportedVideoUrl(null);
  }, []);

  const value = {
    // State
    videoFile,
    videoUrl,
    videoDuration,
    currentTime,
    isPlaying,
    playbackSpeed,
    transcript,
    transcriptText,
    isTranscribing,
    transcriptionProgress,
    language,
    deletedSegments,
    selectedWordIndex,
    searchQuery,
    isExporting,
    exportProgress,
    exportedVideoUrl,
    showExportPanel,
    ffmpegLoaded,
    
    // Actions
    setVideoFile: handleSetVideoFile,
    setVideoDuration,
    setCurrentTime,
    setIsPlaying,
    setPlaybackSpeed,
    setTranscript,
    setIsTranscribing,
    setTranscriptionProgress,
    setLanguage,
    deleteTextRange,
    deleteTimeRange,
    deleteWord,
    undoLastDelete,
    clearDeletedSegments,
    setSelectedWordIndex,
    setSearchQuery,
    setIsExporting,
    setExportProgress,
    setExportedVideoUrl,
    setShowExportPanel,
    setFfmpegLoaded,
    reset,
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

