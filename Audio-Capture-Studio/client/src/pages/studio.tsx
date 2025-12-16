import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { Loader2, AlertCircle } from "lucide-react";
import { SessionHeader } from "@/components/session-header";
import { ParticipantCard } from "@/components/participant-card";
import { RecordingControls } from "@/components/recording-controls";
import { MusicPlayer } from "@/components/music-player";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Participant, RecordingState, MusicPlayerState, SpotifyTrack } from "@shared/schema";

interface SessionData {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
}

export default function Studio() {
  const [, params] = useRoute("/studio/:sessionId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const sessionId = params?.sessionId;
  const urlParams = new URLSearchParams(window.location.search);
  const userName = urlParams.get("name") || "Guest";
  const isHost = urlParams.get("host") === "true";
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isMuted, setIsMuted] = useState(false);
  
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    startTime: null,
    elapsedMs: 0,
  });
  
  const [musicPlayerState, setMusicPlayerState] = useState<MusicPlayerState>({
    currentTrack: null,
    isPlaying: false,
    progress: 0,
    volume: 0.7,
  });
  
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const socketRef = useRef<Socket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // WebRTC refs
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const mixedStreamRef = useRef<MediaStream | null>(null);
  const mixerDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const currentUserIdRef = useRef<string>("");
  const pendingPeersRef = useRef<Set<string>>(new Set());

  // Keep the ref synced with state
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const createPeerConnection = useCallback((remoteParticipantId: string, addTracks = false): RTCPeerConnection => {
    const existingPc = peerConnectionsRef.current.get(remoteParticipantId);
    if (existingPc) {
      // If tracks should be added and we have a media stream, check if tracks are missing
      if (addTracks && mediaStreamRef.current) {
        const existingSenders = existingPc.getSenders();
        const hasTracks = existingSenders.some(sender => sender.track !== null);
        if (!hasTracks) {
          // Add tracks to existing connection that was created before media was ready
          mediaStreamRef.current.getTracks().forEach(track => {
            existingPc.addTrack(track, mediaStreamRef.current!);
          });
        }
      }
      return existingPc;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnectionsRef.current.set(remoteParticipantId, pc);

    // Add local tracks to the connection if requested
    if (addTracks && mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, mediaStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("webrtc-ice-candidate", {
          sessionId,
          fromParticipantId: currentUserIdRef.current,
          toParticipantId: remoteParticipantId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteStream) {
        remoteStreamsRef.current.set(remoteParticipantId, remoteStream);
        
        // Play remote audio - store the element to prevent garbage collection
        let audio = remoteAudioElementsRef.current.get(remoteParticipantId);
        if (!audio) {
          audio = new Audio();
          remoteAudioElementsRef.current.set(remoteParticipantId, audio);
        }
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.play().catch(console.error);
        
        // Update the mixed stream for recording
        updateMixedStream();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${remoteParticipantId}: ${pc.connectionState}`);
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        peerConnectionsRef.current.delete(remoteParticipantId);
        remoteStreamsRef.current.delete(remoteParticipantId);
        // Clean up audio element
        const audio = remoteAudioElementsRef.current.get(remoteParticipantId);
        if (audio) {
          audio.pause();
          audio.srcObject = null;
          remoteAudioElementsRef.current.delete(remoteParticipantId);
        }
        updateMixedStream();
      }
    };

    return pc;
  }, [sessionId]);

  const updateMixedStream = useCallback(() => {
    if (!audioContextRef.current) return;

    // Create a destination node for mixing all audio
    const destination = audioContextRef.current.createMediaStreamDestination();
    mixerDestinationRef.current = destination;

    // Add local stream
    if (mediaStreamRef.current) {
      const localSource = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      localSource.connect(destination);
    }

    // Add all remote streams
    remoteStreamsRef.current.forEach((stream) => {
      const remoteSource = audioContextRef.current!.createMediaStreamSource(stream);
      remoteSource.connect(destination);
    });

    mixedStreamRef.current = destination.stream;
  }, []);

  const initiateWebRTCConnection = useCallback(async (remoteParticipantId: string) => {
    if (!mediaStreamRef.current || !socketRef.current || remoteParticipantId === currentUserIdRef.current) return;

    // Create peer connection with tracks already added
    const pc = createPeerConnection(remoteParticipantId, true);

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current.emit("webrtc-offer", {
      sessionId,
      fromParticipantId: currentUserIdRef.current,
      toParticipantId: remoteParticipantId,
      offer,
    });
  }, [sessionId, createPeerConnection]);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) throw new Error("Session not found");
        const data = await response.json();
        setSession(data);
      } catch (err) {
        setError("Session not found. Please check the link and try again.");
        setLoading(false);
        return;
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}`;
      
      const socket = io(wsUrl, {
        path: "/ws",
        transports: ["websocket"],
      });
      
      socketRef.current = socket;

      socket.on("connect", () => {
        const participantId = crypto.randomUUID();
        setCurrentUserId(participantId);
        
        socket.emit("join-session", {
          sessionId,
          participantId,
          name: userName,
          isHost,
        });
      });

      socket.on("participants-updated", (updatedParticipants: Participant[]) => {
        setParticipants((prevParticipants) => {
          // Find new participants and initiate WebRTC connections with them
          const newParticipantIds = updatedParticipants
            .filter(p => !prevParticipants.find(prev => prev.id === p.id))
            .map(p => p.id);
          
          newParticipantIds.forEach(async (pid) => {
            if (pid !== currentUserIdRef.current) {
              if (mediaStreamRef.current) {
                // Audio is ready, connect immediately
                await initiateWebRTCConnection(pid);
              } else {
                // Audio not ready yet, queue for later
                pendingPeersRef.current.add(pid);
              }
            }
          });
          
          return updatedParticipants;
        });
        setLoading(false);
      });

      socket.on("recording-state-changed", (state: RecordingState) => {
        setRecordingState(state);
      });

      socket.on("music-state-changed", (state: MusicPlayerState) => {
        setMusicPlayerState(state);
        if (audioRef.current && state.currentTrack?.previewUrl) {
          if (state.isPlaying && audioRef.current.paused) {
            audioRef.current.play().catch(console.error);
          } else if (!state.isPlaying && !audioRef.current.paused) {
            audioRef.current.pause();
          }
          audioRef.current.volume = state.volume;
        }
      });

      socket.on("disconnect", () => {
        toast({
          title: "Disconnected",
          description: "Lost connection to the session",
          variant: "destructive",
        });
      });

      // WebRTC signaling handlers
      socket.on("webrtc-offer", async (data: {
        fromParticipantId: string;
        toParticipantId: string;
        offer: RTCSessionDescriptionInit;
      }) => {
        // Only process if this offer is for us
        if (data.toParticipantId !== currentUserIdRef.current) return;
        
        // Create peer connection with tracks already added
        const pc = createPeerConnection(data.fromParticipantId, true);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit("webrtc-answer", {
          sessionId,
          fromParticipantId: currentUserIdRef.current,
          toParticipantId: data.fromParticipantId,
          answer,
        });
      });

      socket.on("webrtc-answer", async (data: {
        fromParticipantId: string;
        toParticipantId: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        if (data.toParticipantId !== currentUserIdRef.current) return;
        
        const pc = peerConnectionsRef.current.get(data.fromParticipantId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      socket.on("webrtc-ice-candidate", async (data: {
        fromParticipantId: string;
        toParticipantId: string;
        candidate: RTCIceCandidateInit;
      }) => {
        if (data.toParticipantId !== currentUserIdRef.current) return;
        
        const pc = peerConnectionsRef.current.get(data.fromParticipantId);
        if (pc && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });

      return () => {
        // Clean up peer connections
        peerConnectionsRef.current.forEach(pc => pc.close());
        peerConnectionsRef.current.clear();
        socket.disconnect();
      };
    };

    fetchSession();
  }, [sessionId, userName, isHost, toast]);

  useEffect(() => {
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const updateLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            const normalizedLevel = Math.min(average / 128, 1);
            setAudioLevel(normalizedLevel);
            
            if (socketRef.current && currentUserIdRef.current) {
              socketRef.current.emit("audio-level", {
                sessionId,
                participantId: currentUserIdRef.current,
                level: normalizedLevel,
                isSpeaking: normalizedLevel > 0.1,
              });
            }
          }
          requestAnimationFrame(updateLevel);
        };
        
        updateLevel();
        
        // Process any pending peer connections now that audio is ready
        pendingPeersRef.current.forEach(async (pid) => {
          await initiateWebRTCConnection(pid);
        });
        pendingPeersRef.current.clear();
        
        // Also renegotiate with any existing peer connections that may have been created
        // before our media stream was ready (e.g., when receiving an offer)
        peerConnectionsRef.current.forEach(async (pc, peerId) => {
          const senders = pc.getSenders();
          const hasTrack = senders.some(sender => sender.track !== null);
          if (!hasTrack && stream) {
            // Add our tracks to this connection
            stream.getTracks().forEach(track => {
              pc.addTrack(track, stream);
            });
            // Create and send a new offer to renegotiate
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socketRef.current?.emit("webrtc-offer", {
                sessionId,
                fromParticipantId: currentUserIdRef.current,
                toParticipantId: peerId,
                offer,
              });
            } catch (err) {
              console.error("Failed to renegotiate with peer:", peerId, err);
            }
          }
        });
      } catch (err) {
        console.error("Failed to access microphone:", err);
        toast({
          title: "Microphone Access Required",
          description: "Please allow microphone access to participate in the recording.",
          variant: "destructive",
        });
      }
    };

    if (!loading && !error) {
      initAudio();
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [loading, error, sessionId, toast, initiateWebRTCConnection]);

  const handleStartRecording = useCallback(() => {
    // Update the mixed stream before starting recording
    updateMixedStream();
    
    // Use mixed stream if available (includes all participants), otherwise use local stream
    const streamToRecord = mixedStreamRef.current || mediaStreamRef.current;
    if (!streamToRecord) return;
    
    recordedChunksRef.current = [];
    
    const mediaRecorder = new MediaRecorder(streamToRecord);
    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.start(1000);
    
    const state: RecordingState = {
      isRecording: true,
      isPaused: false,
      startTime: Date.now(),
      elapsedMs: 0,
    };
    
    setRecordingState(state);
    socketRef.current?.emit("recording-state-change", { sessionId, state });
  }, [sessionId, updateMixedStream]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    
    const state: RecordingState = {
      isRecording: false,
      isPaused: false,
      startTime: null,
      elapsedMs: recordingState.elapsedMs + (recordingState.startTime ? Date.now() - recordingState.startTime : 0),
    };
    
    setRecordingState(state);
    socketRef.current?.emit("recording-state-change", { sessionId, state });
  }, [sessionId, recordingState]);

  const handlePauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
    }
    
    const elapsed = recordingState.startTime ? Date.now() - recordingState.startTime : 0;
    const state: RecordingState = {
      isRecording: true,
      isPaused: true,
      startTime: null,
      elapsedMs: recordingState.elapsedMs + elapsed,
    };
    
    setRecordingState(state);
    socketRef.current?.emit("recording-state-change", { sessionId, state });
  }, [sessionId, recordingState]);

  const handleResumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
    }
    
    const state: RecordingState = {
      isRecording: true,
      isPaused: false,
      startTime: Date.now(),
      elapsedMs: recordingState.elapsedMs,
    };
    
    setRecordingState(state);
    socketRef.current?.emit("recording-state-change", { sessionId, state });
  }, [sessionId, recordingState]);

  const handleDownload = useCallback(() => {
    if (recordedChunksRef.current.length === 0) {
      toast({
        title: "No recording",
        description: "There is no recording to download yet.",
        variant: "destructive",
      });
      return;
    }
    
    const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session?.name || "recording"}-${new Date().toISOString().slice(0, 10)}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: "Your recording is being downloaded.",
    });
  }, [session, toast]);

  const handleToggleMute = useCallback(() => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
        
        socketRef.current?.emit("mute-toggle", {
          sessionId,
          participantId: currentUserId,
          isMuted: !isMuted,
        });
      }
    }
  }, [isMuted, sessionId, currentUserId]);

  const handleSearchMusic = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setSearchResults(data.tracks || []);
    } catch (err) {
      toast({
        title: "Search failed",
        description: "Could not search for music. Make sure Spotify is configured.",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  const handlePlayTrack = useCallback((track: SpotifyTrack) => {
    if (!track.previewUrl) {
      toast({
        title: "No preview available",
        description: "This track doesn't have a preview. Try another one.",
        variant: "destructive",
      });
      return;
    }
    
    if (audioRef.current) {
      audioRef.current.src = track.previewUrl;
      audioRef.current.volume = musicPlayerState.volume;
      audioRef.current.play().catch(console.error);
    }
    
    const state: MusicPlayerState = {
      ...musicPlayerState,
      currentTrack: track,
      isPlaying: true,
      progress: 0,
    };
    
    setMusicPlayerState(state);
    socketRef.current?.emit("music-state-change", { sessionId, state });
  }, [sessionId, musicPlayerState, toast]);

  const handlePauseMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const state: MusicPlayerState = {
      ...musicPlayerState,
      isPlaying: false,
    };
    
    setMusicPlayerState(state);
    socketRef.current?.emit("music-state-change", { sessionId, state });
  }, [sessionId, musicPlayerState]);

  const handleResumeMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
    
    const state: MusicPlayerState = {
      ...musicPlayerState,
      isPlaying: true,
    };
    
    setMusicPlayerState(state);
    socketRef.current?.emit("music-state-change", { sessionId, state });
  }, [sessionId, musicPlayerState]);

  const handleVolumeChange = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    
    const state: MusicPlayerState = {
      ...musicPlayerState,
      volume,
    };
    
    setMusicPlayerState(state);
    socketRef.current?.emit("music-state-change", { sessionId, state });
  }, [sessionId, musicPlayerState]);

  const handleLeave = useCallback(() => {
    socketRef.current?.disconnect();
    setLocation("/");
  }, [setLocation]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    
    audio.addEventListener("timeupdate", () => {
      if (audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        setMusicPlayerState((prev) => ({ ...prev, progress }));
      }
    });
    
    audio.addEventListener("ended", () => {
      setMusicPlayerState((prev) => ({ ...prev, isPlaying: false, progress: 0 }));
    });
    
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Joining session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
          <p className="text-muted-foreground mb-6">
            {error || "This session doesn't exist or has ended."}
          </p>
          <Button onClick={() => setLocation("/")} data-testid="button-go-home">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SessionHeader
        sessionName={session.name}
        sessionId={session.id}
        participantCount={participants.length}
        recordingState={recordingState}
        onLeave={handleLeave}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto p-6 pb-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold mb-4">Participants</h2>
            
            {participants.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  Waiting for participants to join...
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {participants.map((participant) => (
                  <ParticipantCard
                    key={participant.id}
                    participant={participant}
                    isCurrentUser={participant.id === currentUserId}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
        
        <aside className="hidden lg:block w-80">
          <MusicPlayer
            playerState={musicPlayerState}
            searchResults={searchResults}
            isSearching={isSearching}
            onSearch={handleSearchMusic}
            onPlayTrack={handlePlayTrack}
            onPause={handlePauseMusic}
            onResume={handleResumeMusic}
            onVolumeChange={handleVolumeChange}
            isHost={isHost}
          />
        </aside>
      </div>
      
      <RecordingControls
        recordingState={recordingState}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onPauseRecording={handlePauseRecording}
        onResumeRecording={handleResumeRecording}
        onDownload={handleDownload}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        masterLevel={isMuted ? 0 : audioLevel}
        isHost={isHost}
      />
      
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
