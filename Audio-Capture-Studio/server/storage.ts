import { type User, type InsertUser, type Session, type InsertSession, type Participant } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getSession(id: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined>;
  deleteSession(id: string): Promise<boolean>;
  
  getParticipants(sessionId: string): Promise<Participant[]>;
  addParticipant(sessionId: string, participant: Participant): Promise<Participant>;
  updateParticipant(sessionId: string, participantId: string, updates: Partial<Participant>): Promise<Participant | undefined>;
  removeParticipant(sessionId: string, participantId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private participants: Map<string, Participant[]>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.participants = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const session: Session = {
      ...insertSession,
      createdAt: new Date(),
    };
    this.sessions.set(session.id, session);
    this.participants.set(session.id, []);
    return session;
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: string): Promise<boolean> {
    this.participants.delete(id);
    return this.sessions.delete(id);
  }

  async getParticipants(sessionId: string): Promise<Participant[]> {
    return this.participants.get(sessionId) || [];
  }

  async addParticipant(sessionId: string, participant: Participant): Promise<Participant> {
    const participants = this.participants.get(sessionId) || [];
    participants.push(participant);
    this.participants.set(sessionId, participants);
    return participant;
  }

  async updateParticipant(sessionId: string, participantId: string, updates: Partial<Participant>): Promise<Participant | undefined> {
    const participants = this.participants.get(sessionId);
    if (!participants) return undefined;
    
    const index = participants.findIndex((p) => p.id === participantId);
    if (index === -1) return undefined;
    
    participants[index] = { ...participants[index], ...updates };
    this.participants.set(sessionId, participants);
    return participants[index];
  }

  async removeParticipant(sessionId: string, participantId: string): Promise<boolean> {
    const participants = this.participants.get(sessionId);
    if (!participants) return false;
    
    const index = participants.findIndex((p) => p.id === participantId);
    if (index === -1) return false;
    
    participants.splice(index, 1);
    this.participants.set(sessionId, participants);
    return true;
  }
}

export const storage = new MemStorage();
