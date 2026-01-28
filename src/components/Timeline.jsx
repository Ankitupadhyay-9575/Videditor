import React, { useRef, useState } from 'react';
import { useEditor } from '../context/EditorContext';
import { formatTime } from '../lib/utils';
import { Scissors, Undo, Redo } from 'lucide-react';

export default function Timeline() {
  const {
    videoDuration,
    currentTime,
    deletedSegments,
    transcript,
    setCurrentTime,
    setIsPlaying,
    deleteTextRange,
    deleteTimeRange,
    undoLastDelete,
  } = useEditor();

  const timelineRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);

  const handleTimelineClick = (e) => {
    if (isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * videoDuration;
    setCurrentTime(newTime);
    setIsPlaying(true);
  };

  const handleMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * videoDuration;
    
    setIsDragging(true);
    setSelectionStart(time);
    setSelectionEnd(time);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const time = percentage * videoDuration;
    
    setSelectionEnd(time);
  };

  const handleMouseUp = () => {
    if (isDragging && selectionStart !== null && selectionEnd !== null) {
      const start = Math.min(selectionStart, selectionEnd);
      const end = Math.max(selectionStart, selectionEnd);
      
      // Only create selection if it's meaningful (> 0.1 seconds)
      if (end - start > 0.1) {
        // Delete the time range directly
        deleteTimeRange(start, end);
        console.log('Deleted time range:', start, 'to', end);
      }
    }
    
    setIsDragging(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const getSegmentStyle = (start, end) => {
    const left = (start / videoDuration) * 100;
    const width = ((end - start) / videoDuration) * 100;
    return { left: `${left}%`, width: `${width}%` };
  };

  const playheadPosition = (currentTime / videoDuration) * 100;

  // Generate time markers
  const generateTimeMarkers = () => {
    const markers = [];
    const interval = videoDuration > 300 ? 60 : videoDuration > 60 ? 30 : 10; // 1min, 30s, or 10s intervals
    
    for (let time = 0; time <= videoDuration; time += interval) {
      const position = (time / videoDuration) * 100;
      markers.push(
        <div
          key={time}
          className="absolute bottom-0 h-2 w-px bg-gray-600"
          style={{ left: `${position}%` }}
        >
          <span className="absolute -top-4 left-1 text-[10px] text-gray-500 font-mono whitespace-nowrap">
            {formatTime(time)}
          </span>
        </div>
      );
    }
    
    return markers;
  };

  return (
    <div className="h-full flex flex-col bg-[#111318]">
      {/* Timeline Toolbar */}
      <div className="h-12 border-b border-[#282e39] flex items-center justify-between px-4 bg-[#161a21]">
        <div className="flex items-center gap-1">
          <button className="p-2 text-primary hover:bg-[#282e39] rounded" title="Selection Tool (Drag on timeline to delete)">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-[#282e39] rounded" title="Razor Tool (Coming soon)">
            <Scissors className="w-5 h-5" />
          </button>
          
          <div className="w-px h-6 bg-[#282e39] mx-2"></div>
          
          <button className="p-2 text-gray-400 hover:text-white hover:bg-[#282e39] rounded" title="Undo" onClick={undoLastDelete}>
            <Undo className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-[#282e39] rounded disabled:opacity-30" title="Redo" disabled>
            <Redo className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Instruction */}
          {deletedSegments.length === 0 && (
            <div className="text-xs text-gray-400 italic">
              Drag on timeline to select and delete segments
            </div>
          )}
          
          {/* Current Time Display */}
          <div className="text-xs font-mono text-gray-300">
            {formatTime(currentTime)} / {formatTime(videoDuration)}
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track Headers */}
        <div className="w-48 bg-[#161a21] border-r border-[#282e39] flex flex-col z-20 shadow-[4px_0_10px_rgba(0,0,0,0.2)]">
          {/* Empty Header for Ruler */}
          <div className="h-8 border-b border-[#282e39] bg-[#161a21]"></div>
          
          {/* Video Track Header */}
          <div className="h-28 border-b border-[#282e39] p-3 flex flex-col justify-between group">
            <div className="flex justify-between items-center text-gray-300">
              <span className="text-xs font-bold tracking-wider">VIDEO 1</span>
            </div>
          </div>
          
          {/* Audio Track Header */}
          <div className="h-20 border-b border-[#282e39] p-3 flex flex-col justify-between group">
            <div className="flex justify-between items-center text-gray-300">
              <span className="text-xs font-bold tracking-wider">AUDIO 1</span>
            </div>
          </div>
        </div>

        {/* Timeline Tracks */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#111318]">
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-px bg-primary z-50 pointer-events-none"
            style={{ left: `${playheadPosition}%` }}
          >
            <div className="absolute -top-0 -left-[5px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-primary"></div>
          </div>

          {/* Time Ruler */}
          <div
            className="h-8 border-b border-[#282e39] flex items-end relative bg-[#111318] sticky top-0 z-40 select-none"
          >
            {generateTimeMarkers()}
          </div>

          {/* Tracks Container */}
          <div className="relative">
            {/* Background Grid */}
            <div
              className="absolute inset-0 z-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: 'linear-gradient(to right, #282e39 1px, transparent 1px)',
                backgroundSize: '150px 100%',
              }}
            ></div>

            {/* Video Track */}
            <div
              ref={timelineRef}
              className="h-28 border-b border-[#282e39]/30 relative py-2 cursor-pointer"
              onClick={handleTimelineClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Video Clip Representation */}
              <div
                className="absolute left-0 right-0 top-2 bottom-2 bg-[#2d3342] rounded-md border border-[#485063] overflow-hidden"
              >
                <div className="h-full w-full flex items-center justify-center">
                  <span className="text-[10px] text-gray-400 font-mono">video_clip.mp4</span>
                </div>
              </div>

              {/* Deleted segments overlay */}
              {deletedSegments.map((segment, index) => (
                <div
                  key={index}
                  className="absolute top-2 bottom-2 bg-red-500/40 backdrop-blur-sm border-l-2 border-r-2 border-red-500 z-10"
                  style={getSegmentStyle(segment.start, segment.end)}
                  title={`Deleted: ${formatTime(segment.start)} - ${formatTime(segment.end)}`}
                >
                  <div className="h-full flex items-center justify-center">
                    <span className="text-xs text-red-200">✕</span>
                  </div>
                </div>
              ))}

              {/* Selection overlay */}
              {isDragging && selectionStart !== null && selectionEnd !== null && (
                <div
                  className="absolute top-2 bottom-2 bg-blue-500/20 border-l-2 border-r-2 border-blue-500 z-20"
                  style={getSegmentStyle(
                    Math.min(selectionStart, selectionEnd),
                    Math.max(selectionStart, selectionEnd)
                  )}
                />
              )}
            </div>

            {/* Audio Track */}
            <div className="h-20 border-b border-[#282e39]/30 relative py-1">
              <div className="absolute left-0 right-0 top-1 bottom-1 bg-[#1a3b32] rounded-md border border-[#2a5e51] overflow-hidden flex items-center px-2">
                {/* Waveform visualization */}
                <svg className="w-full h-full text-green-500/60" preserveAspectRatio="none" viewBox="0 0 1000 50">
                  <path
                    d="M0,25 Q5,5 10,25 T20,25 T30,10 T40,25 T50,40 T60,25 T70,5 T80,25 T90,35 T100,25 T110,15 T120,25 T130,45 T140,25 T150,10 T160,25 T170,30 T180,25 T190,15 T200,25 T210,35 T220,25 T230,15 T240,25 T250,5 T260,25 T270,40 T280,25 T290,15 T300,25 T310,35 T320,25 T330,10 T340,25 T350,40 T360,25 T370,5 T380,25 T390,45 T400,25 T410,15 T420,25 T430,35 T440,25 T450,10 T460,25 T470,40 T480,25 T490,5 T500,25 T510,45 T520,25 T530,15 T540,25 T550,35 T560,25 T570,10 T580,25 T590,40 T600,25 T610,5 T620,25 T630,45 T640,25 T650,15 T660,25 T670,35 T680,25 T690,10 T700,25 T710,40 T720,25 T730,5 T740,25 T750,45 T760,25 T770,15 T780,25 T790,35 T800,25 T810,10 T820,25 T830,40 T840,25 T850,5 T860,25 T870,45 T880,25 T890,15 T900,25 T910,35 T920,25 T930,10 T940,25 T950,40 T960,25 T970,5 T980,25 T990,45 T1000,25"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* Deleted segments on audio */}
              {deletedSegments.map((segment, index) => (
                <div
                  key={index}
                  className="absolute top-1 bottom-1 bg-red-500/40 backdrop-blur-sm border-l-2 border-r-2 border-red-500 z-10"
                  style={getSegmentStyle(segment.start, segment.end)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
