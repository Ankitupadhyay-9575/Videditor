import React from 'react';
import { Film } from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { Button } from './ui/button';

export default function Header() {
  const { reset, setShowExportPanel, deletedSegments } = useEditor();

  const handleReset = () => {
    if (confirm('Are you sure you want to reset? This will clear all your work.')) {
      reset();
      window.location.reload();
    }
  };

  return (
    <header className="flex-none flex items-center justify-between border-b border-[#282e39] bg-[#111318] px-6 py-3 z-50">
      <div className="flex items-center gap-4 text-white">
        <Film className="w-8 h-8 text-primary" />
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight">
          VideoTimeline Pro
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Status Info */}
        <div className="hidden md:flex items-center gap-2 mr-4 bg-[#1E232E] px-3 py-1.5 rounded text-xs text-gray-400 font-mono">
          <span className="text-primary font-bold">SAVED</span>
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="h-9 px-4 bg-[#282e39] hover:bg-[#353d4b] text-white text-sm font-bold"
          >
            Reset
          </Button>
          
          <Button
            onClick={() => setShowExportPanel(true)}
            disabled={deletedSegments.length === 0}
            className="h-9 px-4 bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-900/20"
          >
            Export Video
          </Button>
        </div>
      </div>
    </header>
  );
}
