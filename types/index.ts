import { Session } from "next-auth";

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  createdAt: Date;
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

export interface Prospect {
  id: string;
  campaignId: string;
  email: string;
  name?: string;
  company?: string;
  title?: string;
  linkedinUrl?: string;
  status: "pending" | "contacted" | "responded" | "unsubscribed";
  personalizationData?: Record<string, any>;
  createdAt: Date;
}

export interface EmailTemplate {
  id: string;
  userId: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  createdAt: Date;
}

export interface GeneratedEmail {
  id: string;
  prospectId: string;
  templateId: string;
  subject: string;
  body: string;
  personalizedBody: string;
  aiModel: string;
  generatedAt: Date;
  sentAt?: Date;
}

// Extend NextAuth session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      image?: string;
    };
  }
}
