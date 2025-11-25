export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface Attachment {
  mimeType: string;
  data: string; // Base64 string
  previewUrl: string; // For UI display
}

export interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface Message {
  id: string;
  role: Role;
  parts: MessagePart[];
  timestamp: number;
}

export interface Assistant {
  id: string;
  name: string;
  icon: string; // Emoji or URL
  model: string;
  systemInstruction?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  assistantId: string;
  createdAt: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}