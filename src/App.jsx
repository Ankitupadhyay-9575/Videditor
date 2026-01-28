import React, { useEffect } from 'react';
import { Film } from 'lucide-react';
import { EditorProvider, useEditor } from './context/EditorContext';
import { loadFFmpeg } from './lib/ffmpeg';
import Header from './components/Header';
import VideoUploader from './components/VideoUploader';
import VideoPlayer from './components/VideoPlayer';
import TranscriptEditor from './components/TranscriptEditor';
import Timeline from './components/Timeline';
import ExportPanel from './components/ExportPanel';

function AppContent() {
  const { videoFile, setFfmpegLoaded, isPlaying, setIsPlaying, currentTime, setCurrentTime, videoDuration, showExportPanel, setShowExportPanel } = useEditor();

  useEffect(() => {
    // Check for dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true' || (!savedDarkMode && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }

    // Load FFmpeg on mount
    loadFFmpeg()
      .then(() => {
        setFfmpegLoaded(true);
        console.log('FFmpeg loaded successfully');
      })
      .catch(error => {
        console.error('Failed to load FFmpeg:', error);
        alert('FFmpeg failed to load. The app may not work correctly. Please refresh the page.');
      });
  }, [setFfmpegLoaded]);

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyPress = (e) => {
      // Space - Play/Pause
      if (e.code === 'Space' && videoFile && !e.target.matches('input, textarea')) {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }
      
      // Arrow keys - Seek
      if (e.code === 'ArrowLeft' && videoFile && !e.target.matches('input, textarea')) {
        e.preventDefault();
        setCurrentTime(Math.max(0, currentTime - 5));
      }
      
      if (e.code === 'ArrowRight' && videoFile && !e.target.matches('input, textarea')) {
        e.preventDefault();
        setCurrentTime(Math.min(videoDuration, currentTime + 5));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [videoFile, isPlaying, setIsPlaying, currentTime, setCurrentTime, videoDuration]);

  if (!videoFile) {
    return (
      <div className="min-h-screen bg-[#0d0f14]">
        <VideoUploader />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0d0f14] text-white">
      <Header />
      
      {/* Export Panel Modal */}
      {showExportPanel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#111318] rounded-lg border border-[#282e39] w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
            {/* Export Panel Header */}
            <div className="flex items-center justify-between border-b border-[#282e39] px-6 py-4">
              <div className="flex items-center gap-3">
                <Film className="w-6 h-6 text-primary" />
                <h2 className="text-white text-lg font-bold">Export Settings</h2>
              </div>
              <button
                onClick={() => setShowExportPanel(false)}
                className="flex items-center justify-center size-10 bg-[#282e39] hover:bg-[#353d4b] text-white rounded-lg transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            
            {/* Export Panel Content */}
            <div className="flex-1 overflow-hidden">
              <ExportPanel />
            </div>
          </div>
        </div>
      )}
      
      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center: Video Player */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0d0f14]">
          {/* Video Player Area */}
          <div className="flex-1 flex items-center justify-center p-6">
            <VideoPlayer />
          </div>
          
          {/* Timeline Section */}
          <div className="h-64 border-t border-[#282e39] bg-[#111318]">
            <Timeline />
          </div>
        </div>

        {/* Right Sidebar: Transcript */}
        <div className="w-[400px] bg-[#111318] border-l border-[#282e39] flex flex-col hidden lg:flex">
          <div className="flex-1 overflow-hidden">
            <TranscriptEditor />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <EditorProvider>
      <AppContent />
    </EditorProvider>
  );
}

export default App;
