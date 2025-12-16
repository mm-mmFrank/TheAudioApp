import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { storage } from "./storage";
import { createSessionSchema, type Participant, type RecordingState, type MusicPlayerState, type SpotifyTrack } from "@shared/schema";
import { randomUUID } from "crypto";

interface SessionSocket extends Socket {
  sessionId?: string;
  participantId?: string;
}

const sessionStates = new Map<string, {
  recordingState: RecordingState;
  musicState: MusicPlayerState;
}>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  const io = new SocketIOServer(httpServer, {
    path: "/ws",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: SessionSocket) => {
    console.log("Client connected:", socket.id);

    socket.on("join-session", async (data: {
      sessionId: string;
      participantId: string;
      name: string;
      isHost: boolean;
    }) => {
      const { sessionId, participantId, name, isHost } = data;
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      }

      socket.sessionId = sessionId;
      socket.participantId = participantId;
      socket.join(sessionId);

      const participant: Participant = {
        id: participantId,
        name,
        isHost,
        isMuted: false,
        isSpeaking: false,
        audioLevel: 0,
        connectionQuality: "good",
      };

      await storage.addParticipant(sessionId, participant);
      
      const participants = await storage.getParticipants(sessionId);
      io.to(sessionId).emit("participants-updated", participants);

      const state = sessionStates.get(sessionId);
      if (state) {
        socket.emit("recording-state-changed", state.recordingState);
        socket.emit("music-state-changed", state.musicState);
      }

      console.log(`${name} joined session ${sessionId}`);
    });

    socket.on("audio-level", async (data: {
      sessionId: string;
      participantId: string;
      level: number;
      isSpeaking: boolean;
    }) => {
      const { sessionId, participantId, level, isSpeaking } = data;
      
      await storage.updateParticipant(sessionId, participantId, {
        audioLevel: level,
        isSpeaking,
      });

      const participants = await storage.getParticipants(sessionId);
      io.to(sessionId).emit("participants-updated", participants);
    });

    socket.on("mute-toggle", async (data: {
      sessionId: string;
      participantId: string;
      isMuted: boolean;
    }) => {
      const { sessionId, participantId, isMuted } = data;
      
      await storage.updateParticipant(sessionId, participantId, { isMuted });
      
      const participants = await storage.getParticipants(sessionId);
      io.to(sessionId).emit("participants-updated", participants);
    });

    socket.on("recording-state-change", (data: {
      sessionId: string;
      state: RecordingState;
    }) => {
      const { sessionId, state } = data;
      
      const existingState = sessionStates.get(sessionId) || {
        recordingState: state,
        musicState: {
          currentTrack: null,
          isPlaying: false,
          progress: 0,
          volume: 0.7,
        },
      };
      
      sessionStates.set(sessionId, {
        ...existingState,
        recordingState: state,
      });
      
      io.to(sessionId).emit("recording-state-changed", state);
    });

    socket.on("music-state-change", (data: {
      sessionId: string;
      state: MusicPlayerState;
    }) => {
      const { sessionId, state } = data;
      
      const existingState = sessionStates.get(sessionId) || {
        recordingState: {
          isRecording: false,
          isPaused: false,
          startTime: null,
          elapsedMs: 0,
        },
        musicState: state,
      };
      
      sessionStates.set(sessionId, {
        ...existingState,
        musicState: state,
      });
      
      io.to(sessionId).emit("music-state-changed", state);
    });

    // WebRTC signaling events
    socket.on("webrtc-offer", (data: {
      sessionId: string;
      fromParticipantId: string;
      toParticipantId: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      const { sessionId, fromParticipantId, toParticipantId, offer } = data;
      io.to(sessionId).emit("webrtc-offer", {
        fromParticipantId,
        toParticipantId,
        offer,
      });
      console.log(`WebRTC offer from ${fromParticipantId} to ${toParticipantId}`);
    });

    socket.on("webrtc-answer", (data: {
      sessionId: string;
      fromParticipantId: string;
      toParticipantId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      const { sessionId, fromParticipantId, toParticipantId, answer } = data;
      io.to(sessionId).emit("webrtc-answer", {
        fromParticipantId,
        toParticipantId,
        answer,
      });
      console.log(`WebRTC answer from ${fromParticipantId} to ${toParticipantId}`);
    });

    socket.on("webrtc-ice-candidate", (data: {
      sessionId: string;
      fromParticipantId: string;
      toParticipantId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const { sessionId, fromParticipantId, toParticipantId, candidate } = data;
      io.to(sessionId).emit("webrtc-ice-candidate", {
        fromParticipantId,
        toParticipantId,
        candidate,
      });
    });

    socket.on("disconnect", async () => {
      if (socket.sessionId && socket.participantId) {
        await storage.removeParticipant(socket.sessionId, socket.participantId);
        
        const participants = await storage.getParticipants(socket.sessionId);
        io.to(socket.sessionId).emit("participants-updated", participants);
        
        if (participants.length === 0) {
          sessionStates.delete(socket.sessionId);
        }
        
        console.log(`Participant ${socket.participantId} left session ${socket.sessionId}`);
      }
    });
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const data = createSessionSchema.parse({
        sessionName: req.body.sessionName,
        hostName: req.body.hostName,
      });

      const sessionId = randomUUID().slice(0, 8);
      const hostId = randomUUID();

      const session = await storage.createSession({
        id: sessionId,
        name: data.sessionName,
        hostId,
        hostName: data.hostName,
        isRecording: false,
        isPaused: false,
      });

      sessionStates.set(sessionId, {
        recordingState: {
          isRecording: false,
          isPaused: false,
          startTime: null,
          elapsedMs: 0,
        },
        musicState: {
          currentTrack: null,
          isPlaying: false,
          progress: 0,
          volume: 0.7,
        },
      });

      res.json(session);
    } catch (error) {
      console.error("Failed to create session:", error);
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    const session = await storage.getSession(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.json(session);
  });

  app.get("/api/spotify/search", async (req, res) => {
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      const mockTracks: SpotifyTrack[] = [
        {
          id: "1",
          name: "Sample Track 1",
          artist: "Demo Artist",
          album: "Demo Album",
          albumArt: "",
          durationMs: 210000,
          previewUrl: null,
        },
        {
          id: "2",
          name: "Sample Track 2",
          artist: "Another Artist",
          album: "Another Album",
          albumArt: "",
          durationMs: 185000,
          previewUrl: null,
        },
      ];
      
      return res.json({
        tracks: mockTracks,
        message: "Spotify not configured. Showing demo tracks.",
      });
    }

    try {
      const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: "grant_type=client_credentials",
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get Spotify token");
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!searchResponse.ok) {
        throw new Error("Failed to search Spotify");
      }

      const searchData = await searchResponse.json();
      
      const tracks: SpotifyTrack[] = searchData.tracks.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        artist: item.artists.map((a: any) => a.name).join(", "),
        album: item.album.name,
        albumArt: item.album.images[0]?.url || "",
        durationMs: item.duration_ms,
        previewUrl: item.preview_url,
      }));

      res.json({ tracks });
    } catch (error) {
      console.error("Spotify search error:", error);
      res.status(500).json({ message: "Failed to search Spotify" });
    }
  });

  return httpServer;
}
