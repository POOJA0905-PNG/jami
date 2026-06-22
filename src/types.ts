/**
 * Types for the CEO Email Dashboard Application
 */

export type Priority = 'P1' | 'P2' | 'P3';

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  date: string;
  snippet: string;
  body: string;
}

export interface ContactProfile {
  email: string;
  name: string;
  company: string;
  title: string;
  bio: string;
  priority: Priority | null;
}

export interface EmailSummary {
  email: string;
  subject: string;
  summary: string;
  suggestedReply: string;
  priority: Priority | null;
}

export interface CombinedEmail {
  gmail: EmailMessage;
  profile: ContactProfile | null;
  summary: EmailSummary | null;
  priority: Priority; // Resolved priority (P1 > P2 > P3)
}

export interface AppSettings {
  clientId: string;
  spreadsheetId: string;
  profilesRange: string;
  summariesRange: string;
}
