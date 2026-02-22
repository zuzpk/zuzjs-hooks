"use client"
import { useCallback, useEffect, useState } from "react";
import { dynamic } from "./types";

export type WebSocketOptions = {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onRawMessage?: (event: MessageEvent) => void;
  onMessage?: (data: dynamic ) => void;
  onError?: (event: Event) => void;
  reconnect?: boolean;
};

const socketInstances = new Map<string, WebSocket>();
const listenersMap = new Map<string, ((event: MessageEvent) => void)[]>();
const reconnectIntervals = new Map<string, number>(); // Store dynamic reconnect intervals

const useWebSocket = (url: string, options?: WebSocketOptions) => {
  
  const { onOpen, onClose, onRawMessage, onMessage, onError, reconnect = true } = options || {};
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const getReconnectInterval = (url: string) => reconnectIntervals.get(url) ?? 2

  const increaseReconnectInterval = (url: string) => {
    const current = getReconnectInterval(url);
    const next = Math.min(current * 2, 60); // Double each time, max 60s
    reconnectIntervals.set(url, next);
    return next * 1000;
  };

  const resetReconnectInterval = (url: string) => {
    reconnectIntervals.set(url, 2); // Reset to 1s on successful reconnect
  };

  
  const connect = useCallback(() => {

    if (socketInstances.has(url)) {
      const Socket = socketInstances.get(url);
      if ( Socket ){
        Socket.onmessage = (event) => {

          setMessages((prev) => [...prev, event.data]);

          onRawMessage?.(event);

          const raw = JSON.parse(Buffer.isBuffer(event) ? event.toString(`utf8`) : `string` == typeof event ? event : event.data)
          onMessage?.(raw);
        
          listenersMap.get(url)?.forEach((listener) => listener(event));
        };
      }
      return; // Prevent duplicate connection
    }


    const socket = new WebSocket(url);

    socketInstances.set(url, socket);
    listenersMap.set(url, []);

    socket.onopen = (event) => {
      setIsConnected(true);
      resetReconnectInterval(url);
      onOpen?.(event);
    };

    socket.onmessage = (event) => {

      setMessages((prev) => [...prev, event.data]);

      onRawMessage?.(event);

      const raw = JSON.parse(Buffer.isBuffer(event) ? event.toString(`utf8`) : `string` == typeof event ? event : event.data)
      onMessage?.(raw);
      
      listenersMap.get(url)?.forEach((listener) => listener(event));
    };

    socket.onerror = (event) => {
      onError?.(event);
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      onClose?.(event);
      socketInstances.delete(url);
      listenersMap.delete(url);
      if (reconnect && event.code !== 1000) { // 1000 = normal close
        const delay = increaseReconnectInterval(url);
        console.log(`Reconnecting in ${delay / 1000} seconds...`);
        setTimeout(() => {
          if (!socketInstances.has(url)) connect(); // Ensure only one instance reconnects
        }, delay);
      }
    };
  }, [url, onOpen, onClose, onMessage, onError, reconnect]);

  useEffect(() => {
    connect();
    return () => {
      if (listenersMap.get(url)?.length === 0) {
        socketInstances.get(url)?.close();
        socketInstances.delete(url);
        listenersMap.delete(url);
        reconnectIntervals.delete(url);
      }
    };
  }, []);

  useEffect(() => {
    const messageListener = (event: MessageEvent) => setMessages((prev) => [...prev, event.data]);
    listenersMap.get(url)?.push(messageListener);
    return () => {
      const listeners = listenersMap.get(url) || [];
      listenersMap.set(
        url,
        listeners.filter((listener) => listener !== messageListener)
      );
    };
  }, [url]);

  const sendMessage = useCallback((message: string | object) => {
    const socket = socketInstances.get(url);
    if (socket && socket.readyState === WebSocket.OPEN) {
      const data = typeof message === "string" ? message : JSON.stringify(message);
      socket.send(data);
    } else {
      console.log("WebSocket is not connected.");
    }
  }, [url]);

  return { isConnected, messages, sendMessage };
};

export default useWebSocket;