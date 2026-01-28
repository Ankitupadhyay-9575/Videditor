import React, { useCallback } from 'react';
import { Upload, Video } from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { isVideoFile } from '../lib/utils';
import { Card } from './ui/card';

export default function VideoUploader() {
  const { setVideoFile } = useEditor();
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (isVideoFile(file)) {
        setVideoFile(file);
      } else {
        alert('Please upload a valid video file (MP4, MOV, WebM, AVI)');
      }
    }
  }, [setVideoFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isVideoFile(file)) {
        setVideoFile(file);
      } else {
        alert('Please upload a valid video file (MP4, MOV, WebM, AVI)');
      }
    }
  }, [setVideoFile]);

  return (
    <div className="flex items-center justify-center min-h-screen w-full p-8 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className="w-full max-w-2xl">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative p-16 border-2 border-dashed rounded-lg transition-all duration-300 cursor-pointer
            ${isDragging 
              ? 'border-primary bg-primary/5 scale-105' 
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/30'
            }
          `}
        >
          <input
            type="file"
            accept="video/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            id="video-upload"
          />
          
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            <div className={`
              p-6 rounded-full transition-all duration-300
              ${isDragging 
                ? 'bg-primary text-primary-foreground scale-110' 
                : 'bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 text-primary'
              }
            `}>
              {isDragging ? (
                <Upload className="w-12 h-12" />
              ) : (
                <Video className="w-12 h-12" />
              )}
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Upload Your Video
              </h2>
              <p className="text-muted-foreground">
                Drag and drop your video here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground/70">
                Supports MP4, MOV, WebM, AVI (Max 500MB recommended)
              </p>
            </div>

            <label 
              htmlFor="video-upload"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors cursor-pointer font-medium"
            >
              Select Video File
            </label>
          </div>
        </div>
      </Card>
    </div>
  );
}
