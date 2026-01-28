import React, { useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { formatTime } from '../lib/utils';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Card } from './ui/card';

export default function VideoPlayer() {
  const videoRef = useRef(null);
  const {
    videoUrl,
    currentTime,
    videoDuration,
    isPlaying,
    playbackSpeed,
    deletedSegments,
    setCurrentTime,
    setVideoDuration,
    setIsPlaying,
    setPlaybackSpeed,
  } = useEditor();

  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      
      // Check if current time is inside a deleted segment
      // We look for a segment where time is >= start AND time < end (strictly less than end to avoid loop at the exact boundary)
      const skippedSegment = deletedSegments.find(seg => 
         time >= seg.start && time < seg.end - 0.1 // Small buffer to ensure we don't skip if we are practically at the end
      );
      
      if (skippedSegment) {
        // Jump to the end of the segment
        video.currentTime = skippedSegment.end;
        setCurrentTime(skippedSegment.end);
      } else {
        setCurrentTime(time);
      }
    };

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [setCurrentTime, setVideoDuration, setIsPlaying, deletedSegments]);

  // Sync video currentTime when it changes externally (e.g., from transcript click)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Only update if there's a significant difference (avoid feedback loop)
    if (Math.abs(video.currentTime - currentTime) > 0.1) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(err => console.error('Play error:', err));
    } else {
      video.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = value[0];
    setVolume(newVolume);
    video.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isMuted) {
      video.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const skip = (seconds) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(videoDuration, video.currentTime + seconds));
  };

  const speeds = [0.5, 1, 1.5, 2];

  return (
    <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg shadow-2xl border border-[#282e39] overflow-hidden group">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        preload="metadata"
      />
      
      {/* Overlay Controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
        {/* Timeline Scrubber */}
        <div className="w-full mb-4">
          <Slider
            value={[currentTime]}
            onValueChange={handleSeek}
            max={videoDuration || 100}
            step={0.1}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-300 mt-1 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(videoDuration)}</span>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(-5)}
              className="text-white hover:text-primary hover:bg-white/10"
            >
              <SkipBack className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="text-white hover:text-primary bg-white/10 rounded-full"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(5)}
              className="text-white hover:text-primary hover:bg-white/10"
            >
              <SkipForward className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2 ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:text-primary hover:bg-white/10"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>
              
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.01}
                className="w-20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {speeds.map(speed => (
              <Button
                key={speed}
                variant={playbackSpeed === speed ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPlaybackSpeed(speed)}
                className={playbackSpeed === speed ? 'bg-primary text-white' : 'text-white hover:bg-white/10'}
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Center Play Button */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="bg-black/40 backdrop-blur-sm rounded-full p-6 text-white opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
            <Play className="w-12 h-12 ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}
