export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'pending' | 'processing' | 'processed' | 'error';
}

export interface ChatSession {
  _id: string;
  name: string;
  lastActivity: string;
  isProcessing: boolean;
  messages: Message[];
  files: File[];
}

export interface ChatHistoryResponse {
  messages: Message[];
  files: File[];
} 