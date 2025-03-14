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

export interface ModelOption {
  label: string;
  value: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  { label: 'GPT 4o-mini', value: 'openai/gpt-4o-mini-2024-07-18' },
  { label: 'GPT 4o', value: 'openai/gpt-4o-2024-11-20' },
  { label: 'GPT o3-mini', value: 'openai/o3-mini' },
  { label: 'GPT o3-mini-high', value: 'openai/o3-mini-high' },
  { label: 'Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
  { label: 'Gemini Flash 2.0', value: 'google/gemini-2.0-flash-exp:free' },
  { label: 'Gemini Pro 2.0', value: 'google/gemini-2.0-pro-exp-02-05:free' }
]; 