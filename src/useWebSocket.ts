"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import { dynamic } from "./types";

type WebSocketHeaders = {
    Authorization: string,
}

export type WebSocketOptions = {
  headers?: WebSocketHeaders & dynamic,
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onRawMessage?: (event: MessageEvent) => void;
  onMessage?: (data: dynamic ) => void;
  onError?: (event: Event) => void;
  autoConnect?: boolean;
  reconnect?: boolean;
};

const socketInstances = new Map<string, WebSocket>();
const listenersMap = new Map<string, ((event: MessageEvent) => void)[]>();
const reconnectIntervals = new Map<string, number>(); // Store dynamic reconnect intervals

const toWebSocketUrl = (input: string) => {
  if (/^wss?:\/\//i.test(input)) return input;
  if (/^https?:\/\//i.test(input)) return input.replace(/^http/i, "ws");

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const path = input.startsWith("/") ? input : `/${input}`;
    return `${protocol}//${window.location.host}${path}`;
  }

  return input;
};

const useWebSocket = (url: string, options?: WebSocketOptions) => {
  
  const { 
    headers, 
    autoConnect = true,
    reconnect = true,
    onOpen, onClose, onRawMessage, onMessage, onError } = options || {};
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const _headers = useRef<WebSocketHeaders | undefined>(headers)
  const socketUrl = toWebSocketUrl(url);

  const getReconnectInterval = (key: string) => reconnectIntervals.get(key) ?? 2

  const increaseReconnectInterval = (key: string) => {
    const current = getReconnectInterval(key);
    const next = Math.min(current * 2, 60); // Double each time, max 60s
    reconnectIntervals.set(key, next);
    return next * 1000;
  };

  const resetReconnectInterval = (key: string) => {
    reconnectIntervals.set(key, 2); // Reset to 1s on successful reconnect
  };

  const parseIncomingData = useCallback((data: MessageEvent["data"]) => {
    if (typeof data !== "string") return data;

    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }, []);

  
  const connect = useCallback((websocketHeaders?: WebSocketHeaders) => {

    if ( websocketHeaders ) _headers.current = websocketHeaders

    if (socketInstances.has(socketUrl)) {
      const Socket = socketInstances.get(socketUrl);
      if ( Socket ){
        Socket.onmessage = (event) => {

          setMessages((prev) => [...prev, event.data]);

          onRawMessage?.(event);

          const raw = parseIncomingData(event.data)
          onMessage?.(raw);
        
          listenersMap.get(socketUrl)?.forEach((listener) => listener(event));
        };
      }
      return; // Prevent duplicate connection
    }


    const socket = new WebSocket(socketUrl, _headers.current ? [`Authorization_${_headers.current.Authorization}`] : undefined);

    socketInstances.set(socketUrl, socket);
    listenersMap.set(socketUrl, []);

    socket.onopen = (event) => {
      setIsConnected(true);
      resetReconnectInterval(socketUrl);
      onOpen?.(event);
    };

    socket.onmessage = (event) => {

      setMessages((prev) => [...prev, event.data]);

      onRawMessage?.(event);

      const raw = parseIncomingData(event.data)
      onMessage?.(raw);
      
      listenersMap.get(socketUrl)?.forEach((listener) => listener(event));
    };

    socket.onerror = (event) => {
      onError?.(event);
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      onClose?.(event);
      socketInstances.delete(socketUrl);
      listenersMap.delete(socketUrl);
      if (reconnect && event.code !== 1000) { // 1000 = normal close
        const delay = increaseReconnectInterval(socketUrl);
        console.log(`Reconnecting in ${delay / 1000} seconds...`);
        setTimeout(() => {
          if (!socketInstances.has(socketUrl)) connect(); // Ensure only one instance reconnects
        }, delay);
      }
    };
  }, [socketUrl, onOpen, onClose, onRawMessage, onMessage, onError, reconnect, parseIncomingData]);

  const disconnect = useCallback(() => {
    socketInstances.get(socketUrl)?.close(1000);
    socketInstances.delete(socketUrl);
    setIsConnected(false);
  }, [socketUrl]);

  useEffect(() => {
    if ( autoConnect ) connect();
    return () => {
      if (listenersMap.get(socketUrl)?.length === 0) {
        socketInstances.get(socketUrl)?.close();
        socketInstances.delete(socketUrl);
        listenersMap.delete(socketUrl);
        reconnectIntervals.delete(socketUrl);
      }
    };
  }, []);

  useEffect(() => {
    const messageListener = (event: MessageEvent) => setMessages((prev) => [...prev, event.data]);
    listenersMap.get(socketUrl)?.push(messageListener);
    return () => {
      const listeners = listenersMap.get(socketUrl) || [];
      listenersMap.set(
        socketUrl,
        listeners.filter((listener) => listener !== messageListener)
      );
    };
  }, [socketUrl]);

  const sendMessage = useCallback((message: string | object) => {
    const socket = socketInstances.get(socketUrl);
    if (socket && socket.readyState === WebSocket.OPEN) {
      const data = typeof message === "string" ? message : JSON.stringify(message);
      socket.send(data);
    } else {
      console.log("WebSocket is not connected.");
    }
  }, [socketUrl]);

  return { isConnected, messages, connect, disconnect, sendMessage };
};

export default useWebSocket;