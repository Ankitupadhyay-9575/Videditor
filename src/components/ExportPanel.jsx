import React, { useState } from 'react';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { exportEditedVideo } from '../lib/video-processor';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';

export default function ExportPanel() {
  const {
    videoFile,
    videoDuration,
    deletedSegments,
    isExporting,
    exportProgress,
    exportedVideoUrl,
    setIsExporting,
    setExportProgress,
    setExportedVideoUrl,
  } = useEditor();

  const [exportSettings, setExportSettings] = useState({
    format: 'mp4',
    quality: 'high',
    resolution: 'original',
  });

  const [statusMessage, setStatusMessage] = useState('');

  const handleExport = async () => {
    if (!videoFile) {
      alert('No video file loaded.');
      return;
    }

    setIsExporting(true);
    setStatusMessage('Preparing export...');
    setExportProgress(0);
    
    try {
      console.log('[ExportPanel] Starting export with settings:', exportSettings);
      console.log('[ExportPanel] Deleted segments:', deletedSegments);
      console.log('[ExportPanel] Video duration:', videoDuration);
      
      const resultBlob = await exportEditedVideo(
        videoFile,
        deletedSegments,
        videoDuration,
        exportSettings,
        (progress, message) => {
          console.log('[ExportPanel] Progress:', progress, message);
          setExportProgress(progress);
          setStatusMessage(message || 'Processing...');
        }
      );
      
      console.log('[ExportPanel] Export complete, blob size:', resultBlob.size);
      
      const url = URL.createObjectURL(resultBlob);
      setExportedVideoUrl(url);
      setStatusMessage('Export complete!');
      setExportProgress(100);
    } catch (error) {
      console.error('[ExportPanel] Export error:', error);
      const errorMsg = error.message || String(error);
      setStatusMessage('Export failed: ' + errorMsg);
      alert('Export failed: ' + errorMsg + '\n\nCheck the console for more details.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    if (!exportedVideoUrl) return;
    
    const a = document.createElement('a');
    a.href = exportedVideoUrl;
    a.download = `edited-video-${Date.now()}.mp4`;
    a.click();
  };

  const deletedDuration = deletedSegments.reduce((total, seg) => 
    total + (seg.end - seg.start), 0
  );

  const remainingDuration = videoDuration - deletedDuration;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
      <CardHeader className="border-b bg-background/50">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <span>🎬</span>
          Export Video
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-background rounded-lg border">
            <div className="text-sm text-muted-foreground">Original Duration</div>
            <div className="text-2xl font-bold text-foreground">
              {Math.floor(videoDuration / 60)}:{Math.floor(videoDuration % 60).toString().padStart(2, '0')}
            </div>
          </div>
          
          <div className="p-4 bg-background rounded-lg border">
            <div className="text-sm text-muted-foreground">After Editing</div>
            <div className="text-2xl font-bold text-primary">
              {Math.floor(remainingDuration / 60)}:{Math.floor(remainingDuration % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>

        {deletedSegments.length > 0 && (
          <div className="p-3 bg-background rounded-lg border border-destructive/30">
            <div className="text-sm font-medium text-destructive">
              {deletedSegments.length} segment{deletedSegments.length > 1 ? 's' : ''} will be removed
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Saving {Math.floor(deletedDuration)} seconds
            </div>
          </div>
        )}

        {/* Export settings */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Format</label>
            <select
              value={exportSettings.format}
              onChange={(e) => setExportSettings({ ...exportSettings, format: e.target.value })}
              className="w-full px-3 py-2 rounded-md border bg-background"
              disabled={isExporting}
            >
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Quality</label>
            <select
              value={exportSettings.quality}
              onChange={(e) => setExportSettings({ ...exportSettings, quality: e.target.value })}
              className="w-full px-3 py-2 rounded-md border bg-background"
              disabled={isExporting}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Resolution</label>
            <select
              value={exportSettings.resolution}
              onChange={(e) => setExportSettings({ ...exportSettings, resolution: e.target.value })}
              className="w-full px-3 py-2 rounded-md border bg-background"
              disabled={isExporting}
            >
              <option value="original">Original</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
            </select>
          </div>
        </div>

        {/* Export progress */}
        {isExporting && (
          <div className="space-y-2 p-4 bg-background rounded-lg border">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium">{statusMessage}</span>
            </div>
            <Progress value={exportProgress} />
            <div className="text-xs text-muted-foreground text-right">
              {Math.round(exportProgress)}%
            </div>
          </div>
        )}

        {/* Export success */}
        {exportedVideoUrl && !isExporting && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Export Complete!</span>
            </div>
            <Button
              onClick={handleDownload}
              className="w-full"
              variant="default"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Edited Video
            </Button>
          </div>
        )}

        {/* Export button */}
        {!exportedVideoUrl && (
          <Button
            onClick={handleExport}
            disabled={isExporting || !videoFile || deletedSegments.length === 0}
            className="w-full"
            size="lg"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Export Video
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
