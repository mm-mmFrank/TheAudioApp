import { useState, useEffect, useCallback } from "react";
import { Circle, Square, Pause, Play, Download, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { LevelMeter } from "@/components/audio-visualizer";
import type { RecordingState } from "@shared/schema";

interface RecordingControlsProps {
  recordingState: RecordingState;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onDownload: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  masterLevel: number;
  isHost: boolean;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function RecordingControls({
  recordingState,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onDownload,
  isMuted,
  onToggleMute,
  masterLevel,
  isHost,
}: RecordingControlsProps) {
  const [displayTime, setDisplayTime] = useState(0);

  useEffect(() => {
    if (recordingState.isRecording && !recordingState.isPaused && recordingState.startTime) {
      const interval = setInterval(() => {
        setDisplayTime(Date.now() - recordingState.startTime! + recordingState.elapsedMs);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setDisplayTime(recordingState.elapsedMs);
    }
  }, [recordingState]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="icon"
              onClick={onToggleMute}
              data-testid="button-toggle-mute"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Input</span>
              <LevelMeter level={isMuted ? 0 : masterLevel} orientation="horizontal" className="w-24" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isHost && (
              <>
                {!recordingState.isRecording ? (
                  <Button
                    onClick={onStartRecording}
                    className="gap-2 bg-destructive hover:bg-destructive/90"
                    data-testid="button-start-recording"
                  >
                    <Circle className="h-4 w-4 fill-current" />
                    Start Recording
                  </Button>
                ) : (
                  <>
                    {recordingState.isPaused ? (
                      <Button
                        onClick={onResumeRecording}
                        variant="secondary"
                        className="gap-2"
                        data-testid="button-resume-recording"
                      >
                        <Play className="h-4 w-4" />
                        Resume
                      </Button>
                    ) : (
                      <Button
                        onClick={onPauseRecording}
                        variant="secondary"
                        className="gap-2"
                        data-testid="button-pause-recording"
                      >
                        <Pause className="h-4 w-4" />
                        Pause
                      </Button>
                    )}
                    
                    <Button
                      onClick={onStopRecording}
                      variant="outline"
                      className="gap-2"
                      data-testid="button-stop-recording"
                    >
                      <Square className="h-4 w-4" />
                      Stop
                    </Button>
                  </>
                )}
              </>
            )}
            
            <div className="flex items-center gap-3 min-w-[140px]">
              {recordingState.isRecording && (
                <div className={`h-3 w-3 rounded-full ${
                  recordingState.isPaused ? "bg-yellow-500" : "bg-destructive animate-pulse"
                }`} />
              )}
              <span className="font-mono text-lg tabular-nums" data-testid="text-recording-time">
                {formatTime(displayTime)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="gap-2"
              onClick={onDownload}
              disabled={displayTime === 0}
              data-testid="button-download-recording"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
