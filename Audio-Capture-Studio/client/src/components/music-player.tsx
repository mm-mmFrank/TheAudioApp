import { useState } from "react";
import { Search, Play, Pause, SkipBack, SkipForward, Volume2, Music2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SpotifyTrack, MusicPlayerState } from "@shared/schema";

interface MusicPlayerProps {
  playerState: MusicPlayerState;
  searchResults: SpotifyTrack[];
  isSearching: boolean;
  onSearch: (query: string) => void;
  onPlayTrack: (track: SpotifyTrack) => void;
  onPause: () => void;
  onResume: () => void;
  onVolumeChange: (volume: number) => void;
  isHost: boolean;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function MusicPlayer({
  playerState,
  searchResults,
  isSearching,
  onSearch,
  onPlayTrack,
  onPause,
  onResume,
  onVolumeChange,
  isHost,
}: MusicPlayerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <Music2 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Music</h2>
        </div>
        
        {isHost && (
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search Spotify..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-music-search"
              />
            </div>
            <Button type="submit" size="icon" disabled={isSearching} data-testid="button-music-search">
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </form>
        )}
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {searchResults.length === 0 && !isSearching && (
            <div className="text-center py-8 text-muted-foreground">
              <Music2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {isHost
                  ? "Search for music to play during your recording"
                  : "The host can play music during the recording"}
              </p>
            </div>
          )}
          
          {searchResults.map((track) => (
            <Card
              key={track.id}
              className="p-3 hover-elevate active-elevate-2 cursor-pointer"
              onClick={() => isHost && onPlayTrack(track)}
              data-testid={`card-track-${track.id}`}
            >
              <div className="flex items-center gap-3">
                {track.albumArt ? (
                  <img
                    src={track.albumArt}
                    alt={track.album}
                    className="h-12 w-12 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                    <Music2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{track.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDuration(track.durationMs)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t border-border bg-muted/30">
        {playerState.currentTrack ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {playerState.currentTrack.albumArt ? (
                <img
                  src={playerState.currentTrack.albumArt}
                  alt={playerState.currentTrack.album}
                  className="h-14 w-14 rounded-md object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center">
                  <Music2 className="h-7 w-7 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" data-testid="text-current-track">
                  {playerState.currentTrack.name}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {playerState.currentTrack.artist}
                </p>
              </div>
            </div>
            
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${playerState.progress}%` }}
              />
            </div>
            
            {isHost && (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => (playerState.isPlaying ? onPause() : onResume())}
                    data-testid="button-play-pause"
                  >
                    {playerState.isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 flex-1 max-w-[120px]">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={[playerState.volume * 100]}
                    max={100}
                    step={1}
                    onValueChange={([value]) => onVolumeChange(value / 100)}
                    className="flex-1"
                    data-testid="slider-volume"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-2 text-muted-foreground text-sm">
            No track playing
          </div>
        )}
      </div>
    </div>
  );
}
