export type ChatRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'sending' | 'complete' | 'error';

export interface AttachmentMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  previewUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  status?: MessageStatus;
  attachments?: AttachmentMeta[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export type Theme = 'dark' | 'light' | 'system';

export interface AppSettings {
  theme: Theme;
  saveHistory: boolean;
  demoMode: boolean;
  userName: string;
  userEmail: string;
  userAvatar: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}
