import { Mic, MicOff, Crown, Wifi, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AudioVisualizer, LevelMeter } from "@/components/audio-visualizer";
import type { Participant } from "@shared/schema";

interface ParticipantCardProps {
  participant: Participant;
  isCurrentUser?: boolean;
}

export function ParticipantCard({ participant, isCurrentUser }: ParticipantCardProps) {
  const initials = participant.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const connectionIcon = {
    good: <Wifi className="h-3 w-3 text-green-500" />,
    fair: <Wifi className="h-3 w-3 text-yellow-500" />,
    poor: <WifiOff className="h-3 w-3 text-destructive" />,
  };

  return (
    <Card
      className={`relative p-4 transition-all duration-200 ${
        participant.isSpeaking
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
          : ""
      }`}
      data-testid={`card-participant-${participant.id}`}
    >
      <div className="flex items-start gap-4">
        <div className="relative">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg font-medium bg-primary/10 text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {participant.isSpeaking && (
            <div className="absolute -inset-1 rounded-full border-2 border-primary animate-pulse" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-foreground truncate">
              {participant.name}
              {isCurrentUser && (
                <span className="text-muted-foreground text-sm ml-1">(You)</span>
              )}
            </h3>
            {participant.isHost && (
              <Badge variant="secondary" className="gap-1">
                <Crown className="h-3 w-3" />
                Host
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-2">
            <div className={`p-1.5 rounded-md ${participant.isMuted ? "bg-destructive/10" : "bg-green-500/10"}`}>
              {participant.isMuted ? (
                <MicOff className="h-4 w-4 text-destructive" />
              ) : (
                <Mic className="h-4 w-4 text-green-500" />
              )}
            </div>
            
            <AudioVisualizer
              audioLevel={participant.audioLevel}
              isActive={!participant.isMuted && participant.isSpeaking}
            />
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {connectionIcon[participant.connectionQuality]}
            </div>
          </div>
        </div>
        
        <LevelMeter level={participant.isMuted ? 0 : participant.audioLevel} />
      </div>
    </Card>
  );
}
