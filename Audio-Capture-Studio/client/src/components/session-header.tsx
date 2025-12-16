import { useState } from "react";
import { Copy, Check, Users, Radio, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import type { RecordingState } from "@shared/schema";

interface SessionHeaderProps {
  sessionName: string;
  sessionId: string;
  participantCount: number;
  recordingState: RecordingState;
  onLeave: () => void;
}

export function SessionHeader({
  sessionName,
  sessionId,
  participantCount,
  recordingState,
  onLeave,
}: SessionHeaderProps) {
  const [copied, setCopied] = useState(false);

  const joinLink = `${window.location.origin}/join/${sessionId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(joinLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-16 border-b border-border bg-card px-4 flex items-center justify-between gap-4 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
            <Radio className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight" data-testid="text-session-name">
              {sessionName}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>ID: {sessionId.slice(0, 8)}...</span>
            </div>
          </div>
        </div>
        
        {recordingState.isRecording && (
          <Badge
            variant="destructive"
            className={`gap-1.5 ${!recordingState.isPaused ? "animate-pulse" : ""}`}
          >
            <div className={`h-2 w-2 rounded-full ${
              recordingState.isPaused ? "bg-yellow-400" : "bg-white"
            }`} />
            {recordingState.isPaused ? "PAUSED" : "RECORDING"}
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span data-testid="text-participant-count">{participantCount}</span>
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={copyLink}
              data-testid="button-copy-link"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy Invite Link"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{joinLink}</p>
          </TooltipContent>
        </Tooltip>
        
        <ThemeToggle />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onLeave}
          className="text-muted-foreground"
          data-testid="button-leave-session"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
