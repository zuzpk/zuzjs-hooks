import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AgentChat,
  AgentChatSummary,
  AgentClientEvent,
  AgentController,
  AgentMessage,
  UseAgentOptions,
} from './types';

const now = () => Date.now();
const optimisticId = () => `optimistic-${now()}-${Math.random().toString(36).slice(2, 9)}`;

function sortChats(chats: AgentChatSummary[]): AgentChatSummary[] {
  return [...chats].filter((chat) => !chat.archived).sort((a, b) => b.updatedAt - a.updatedAt);
}

export default function useAgent({ client }: UseAgentOptions): AgentController {
  const [chats, setChats] = useState<AgentChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<AgentChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<import('./types').AgentPermissionRequest | null>(null);
  const [queuedMessages, setQueuedMessages] = useState<import('./types').AgentQueuedMessage[]>([]);
  const lastSendRef = useRef<string | null>(null);
  const requestRef = useRef(0);
  const activeChatRef = useRef<AgentChat | null>(null);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const applyEvent = useCallback((event: AgentClientEvent) => {
    if (event.type === 'connection') return;
    if (event.type === 'permission') {
      setPermission(event.permission ?? null);
      return;
    }
    const current = activeChatRef.current;
    if (!current || current.summary.id !== event.chatId) return;

    if (event.type === 'failed') {
      setRunning(false);
      setError(event.error);
      return;
    }

    setActiveChat((chat) => {
      if (!chat || chat.summary.id !== event.chatId) return chat;
      if (event.type === 'message_completed') {
        const index = chat.messages.findIndex((message) => message.id === event.message.id);
        const messages = index >= 0
          ? chat.messages.map((message, itemIndex) => itemIndex === index ? event.message : message)
          : [...chat.messages, event.message];
        return { ...chat, messages };
      }
      if (event.type === 'message_delta') {
        const index = chat.messages.findIndex((message) => message.id === event.messageId);
        const messages = index >= 0
          ? chat.messages.map((message, itemIndex) => itemIndex === index
            ? { ...message, content: `${message.content}${event.delta}`, streaming: true }
            : message)
          : [...chat.messages, {
            id: event.messageId,
            role: 'assistant' as const,
            content: event.delta,
            createdAt: now(),
            streaming: true,
          }];
        return { ...chat, messages };
      }
      const messageId = event.messageId;
      if (event.type === 'activity') {
        return {
          ...chat,
          messages: chat.messages.map((message) =>
            !messageId || message.id === messageId ? { ...message, activity: event.activity } : message
          ),
        };
      }
      if (event.type === 'terminal') {
        return {
          ...chat,
          messages: chat.messages.map((message) =>
            !messageId || message.id === messageId ? { ...message, terminal: event.terminal } : message
          ),
        };
      }
      if (event.type === 'stats') {
        return {
          ...chat,
          messages: chat.messages.map((message) =>
            !messageId || message.id === messageId ? { ...message, stats: event.stats } : message
          ),
        };
      }
      return chat;
    });
  }, []);

  const selectChat = useCallback(async (chatId: string) => {
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const chat = await client.loadChat(chatId);
      if (request !== requestRef.current) return;
      setActiveChat(chat);
      if (client.listQueued) setQueuedMessages(await client.listQueued(chatId));
      else setQueuedMessages([]);
      setChats((current) => sortChats([
        chat.summary,
        ...current.filter((item) => item.id !== chat.summary.id),
      ]));
    } catch (cause) {
      if (request === requestRef.current) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [client]);

  const createChat = useCallback(async (input?: Parameters<AgentController['createChat']>[0]) => {
    setLoading(true);
    setError(null);
    try {
      const chat = await client.createChat(input);
      setActiveChat(chat);
      setChats((current) => sortChats([
        chat.summary,
        ...current.filter((item) => item.id !== chat.summary.id),
      ]));
      return chat;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const send = useCallback(async (rawMessage: string, options?: Parameters<AgentController['send']>[1]) => {
    const message = rawMessage.trim();
    if (!message) return;
    if (running) {
      const chatId = activeChatRef.current?.summary.id;
      if (!chatId || !client.queue) return;
      const queued = { id: optimisticId(), content: message, createdAt: now() };
      setQueuedMessages((current) => [...current, queued]);
      try {
        await client.queue({ chatId, message, options });
      } catch (cause) {
        setQueuedMessages((current) => current.filter((item) => item.id !== queued.id));
        setError(cause instanceof Error ? cause.message : String(cause));
        throw cause;
      }
      return;
    }
    setError(null);

    let chat = activeChatRef.current;
    try {
      const createdForFirstMessage = !chat;
      if (!chat) chat = await createChat({ firstMessage: message });
      const chatId = chat.summary.id;
      lastSendRef.current = message;
      setRunning(true);

      // A host that persists the first message during createChat returns it on
      // the chat object. Avoid rendering an optimistic duplicate in that case.
      const alreadyPresent = chat.messages.some((item) => item.role === 'user' && item.content === message);
      if (!alreadyPresent) {
        const optimistic: AgentMessage = {
          id: optimisticId(),
          role: 'user',
          content: message,
          createdAt: now(),
        };
        setActiveChat((current) => current && current.summary.id === chatId
          ? { ...current, messages: [...current.messages, optimistic] }
          : current);
      }

      const result = await client.send({
        chatId,
        message,
        firstMessageAlreadyPersisted: createdForFirstMessage,
        options,
      });
      if (result) {
        setActiveChat(result);
        setChats((current) => sortChats([
          result.summary,
          ...current.filter((item) => item.id !== result.summary.id),
        ]));
      } else {
        // A generic client may acknowledge a send without returning a
        // transcript. Reload durable state rather than assuming a provider
        // event stream exists.
        const refreshed = await client.loadChat(chatId);
        setActiveChat(refreshed);
        setChats((current) => sortChats([
          refreshed.summary,
          ...current.filter((item) => item.id !== refreshed.summary.id),
        ]));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    } finally {
      setRunning(false);
      setQueuedMessages([]);
    }
  }, [client, createChat, running]);

  const retry = useCallback(async () => {
    if (lastSendRef.current) await send(lastSendRef.current);
  }, [send]);

  const respondToPermission = useCallback(async (input: { permissionId: string; approved: boolean; response?: string }) => {
    const chatId = activeChatRef.current?.summary.id;
    if (!chatId || !client.respondToPermission) return;
    try {
      await client.respondToPermission({ chatId, ...input });
      setPermission(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    }
  }, [client]);

  const archiveChat = useCallback(async (chatId?: string) => {
    const targetId = chatId ?? activeChatRef.current?.summary.id;
    if (!targetId || !client.archiveChat) return;
    setError(null);
    try {
      await client.archiveChat(targetId);
      setChats((current) => current.filter((chat) => chat.id !== targetId));
      if (activeChatRef.current?.summary.id === targetId) {
        setActiveChat(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [client]);

  const cancel = useCallback(async () => {
    const chatId = activeChatRef.current?.summary.id;
    if (!chatId || !client.cancel) return;
    try {
      await client.cancel(chatId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [client]);


  useEffect(() => {
    let live = true;
    const initialize = async () => {
      setLoading(true);
      try {
        const result = await client.initialize();
        if (!live) return;
        const nextChats = sortChats(result.chats);
        setChats(nextChats);
        const activeChatId = result.activeChatId ?? nextChats[0]?.id;
        if (activeChatId) await selectChat(activeChatId);
      } catch (cause) {
        if (live) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (live) setLoading(false);
      }
    };
    void initialize();
    const unsubscribe = client.subscribe?.(applyEvent);
    return () => {
      live = false;
      unsubscribe?.();
    };
  }, [applyEvent, client, selectChat]);

  return {
    chats,
    activeChat,
    activeChatId: activeChat?.summary.id ?? null,
    messages: activeChat?.messages ?? [],
    loading,
    running,
    error,
    permission,
    queuedMessages,
    respondToPermission,
    selectChat,
    createChat,
    send,
    retry,
    archiveChat,
    cancel,
    setChats,
  };
}
