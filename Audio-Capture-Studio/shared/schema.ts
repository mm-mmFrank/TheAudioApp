import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  hostId: varchar("host_id", { length: 36 }).notNull(),
  hostName: text("host_name").notNull(),
  isRecording: boolean("is_recording").default(false),
  isPaused: boolean("is_paused").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  createdAt: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  connectionQuality: "good" | "fair" | "poor";
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  durationMs: number;
  previewUrl: string | null;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  startTime: number | null;
  elapsedMs: number;
}

export interface MusicPlayerState {
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
}

export const createSessionSchema = z.object({
  sessionName: z.string().min(1, "Session name is required").max(100),
  hostName: z.string().min(1, "Your name is required").max(50),
});

export const joinSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  guestName: z.string().min(1, "Your name is required").max(50),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type JoinSessionInput = z.infer<typeof joinSessionSchema>;
