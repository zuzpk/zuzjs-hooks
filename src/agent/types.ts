import type { Dispatch, SetStateAction } from 'react';

export type AgentRole = 'user' | 'assistant' | 'system';
export type AgentContextMode = 'general' | 'coding';

export type AgentActivity = {
  id: string;
  kind: 'thinking' | 'tool' | 'status' | 'verification' | 'retry';
  title: string;
  detail?: string;
  state: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
};

export type AgentTerminalExecution = {
  id: string;
  command: string;
  output: string;
  state: 'running' | 'completed' | 'failed';
  exitCode?: number;
};

export type AgentPermissionRequest = {
  id: string;
  tool: string;
  command: string;
  description: string;
  riskTier: string;
  requiredPhrase?: string;
  options?: string[];
};

export type AgentConnectionState = 'connecting' | 'connected' | 'reconnecting';

export type AgentRunStats = {
  latencyMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  tokensPerSecond?: number;
  contextTokens?: number;
  contextLimit?: number;
};

export type AgentMessage = {
  id: string;
  role: AgentRole;
  content: string;
  createdAt: number;
  streaming?: boolean;
  failed?: boolean;
  activity?: AgentActivity[];
  terminal?: AgentTerminalExecution[];
  stats?: AgentRunStats;
};

export type AgentChatSummary = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
  contextMode?: AgentContextMode;
};

export type AgentChat = {
  summary: AgentChatSummary;
  messages: AgentMessage[];
};

/** A follow-up held until the current turn has reached a terminal state. */
export type AgentQueuedMessage = {
  id: string;
  content: string;
  createdAt: number;
};

export type AgentThinkingLevel = 'low' | 'medium' | 'high';

export type AgentSendOptions = {
  model?: string;
  thinkingLevel?: AgentThinkingLevel;
};

export type AgentClientEvent =
  | { type: 'message_delta'; chatId: string; messageId: string; delta: string }
  | { type: 'message_completed'; chatId: string; message: AgentMessage }
  | { type: 'activity'; chatId: string; messageId?: string; activity: AgentActivity[] }
  | { type: 'terminal'; chatId: string; messageId?: string; terminal: AgentTerminalExecution[] }
  | { type: 'stats'; chatId: string; messageId?: string; stats: AgentRunStats }
  | { type: 'permission'; chatId: string; permission?: AgentPermissionRequest }
  | { type: 'connection'; state: AgentConnectionState }
  | { type: 'failed'; chatId: string; error: string };

export interface AgentClient {
  initialize(): Promise<{ chats: AgentChatSummary[]; activeChatId?: string }>;
  loadChat(chatId: string): Promise<AgentChat>;
  createChat(input?: {
    firstMessage?: string;
    contextMode?: AgentContextMode;
  }): Promise<AgentChat>;
  send(input: {
    chatId: string;
    message: string;
    firstMessageAlreadyPersisted?: boolean;
    options?: AgentSendOptions;
  }): Promise<AgentChat | void>;
  archiveChat?(chatId: string): Promise<void>;
  cancel?(chatId: string): Promise<void>;
  queue?(input: { chatId: string; message: string; options?: AgentSendOptions }): Promise<void>;
  listQueued?(chatId: string): Promise<AgentQueuedMessage[]>;
  respondToPermission?(input: { chatId: string; permissionId: string; approved: boolean; response?: string }): Promise<AgentChat | void>;
  subscribe?(listener: (event: AgentClientEvent) => void): () => void;
}

export type AgentCapabilities = {
  sessions: boolean;
  archive: boolean;
  cancel: boolean;
  queue?: boolean;
  activity: boolean;
  contextMode: boolean;
};

export type UseAgentOptions = {
  client: AgentClient;
};

export type AgentController = {
  chats: AgentChatSummary[];
  activeChat: AgentChat | null;
  activeChatId: string | null;
  messages: AgentMessage[];
  loading: boolean;
  running: boolean;
  error: string | null;
  permission: AgentPermissionRequest | null;
  queuedMessages: AgentQueuedMessage[];
  respondToPermission: (input: { permissionId: string; approved: boolean; response?: string }) => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  createChat: (input?: { firstMessage?: string; contextMode?: AgentContextMode }) => Promise<AgentChat>;
  send: (message: string, options?: AgentSendOptions) => Promise<void>;
  retry: () => Promise<void>;
  archiveChat: (chatId?: string) => Promise<void>;
  cancel: () => Promise<void>;
  setChats: Dispatch<SetStateAction<AgentChatSummary[]>>;
};
