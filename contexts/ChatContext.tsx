
import React, { createContext, useState, useContext, ReactNode, useCallback, useRef } from 'react';
import { ChatMessage, LoadingStateKey } from '../types';

interface ChatContextType {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string; // Returns the generated ID
  updateMessage: (id: string, updateFn: (msg: ChatMessage) => ChatMessage) => void;
  updateLastModelMessage: (updateFn: (msg: ChatMessage) => ChatMessage) => void;
  deleteMessage: (id: string) => void;
  
  isLoading: boolean;
  isGenerating: boolean;
  isChallenging: boolean;
  isAnalyzingFraud: boolean;
  isAnalyzing: boolean;
  isAssessingFeasibility: boolean;
  isGeneratingReport: boolean;
  isCreatingProject: boolean;
  setLoadingState: (key: LoadingStateKey, value: boolean) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: ReactNode; initialMessages?: ChatMessage[] }> = ({ children, initialMessages = [] }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [loadingStates, setLoadingStates] = useState({
    isLoading: false,
    isGenerating: false,
    isAnalyzing: false,
    isChallenging: false,
    isAnalyzingFraud: false,
    isAssessingFeasibility: false,
    isGeneratingReport: false,
    isCreatingProject: false,
  });

  // PROF-SYNC-FIX-005: Idempotency Guard variables
  const lastFingerprint = useRef<string>('');
  const lastTimestamp = useRef<number>(0);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>): string => {
    // Fingerprint check to prevent duplicates within 800ms
    const fingerprint = `${message.role}:${message.text}`;
    const now = Date.now();
    if (fingerprint === lastFingerprint.current && (now - lastTimestamp.current < 800)) {
        console.warn("Detected duplicate message submission, blocking.", fingerprint);
        return ""; // Silently drop duplicate
    }
    
    lastFingerprint.current = fingerprint;
    lastTimestamp.current = now;

    const newId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setMessages(prev => {
        const newMessage: ChatMessage = {
            ...message,
            id: newId,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        return [...prev, newMessage];
    });
    return newId;
  }, []);

  const updateMessage = useCallback((id: string, updateFn: (msg: ChatMessage) => ChatMessage) => {
      setMessages(prev => prev.map(msg => msg.id === id ? updateFn(msg) : msg));
  }, []);

  const updateLastModelMessage = useCallback((updateFn: (msg: ChatMessage) => ChatMessage) => {
    setMessages(prev => {
        const newMessages = [...prev];
        const lastMsgIndex = newMessages.length - 1;
        if (lastMsgIndex >= 0 && newMessages[lastMsgIndex].role === 'model') {
            newMessages[lastMsgIndex] = updateFn(newMessages[lastMsgIndex]);
        }
        return newMessages;
    });
  }, []);

  const deleteMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const setLoadingState = useCallback((key: LoadingStateKey, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <ChatContext.Provider value={{
      messages,
      setMessages,
      addMessage,
      updateMessage,
      updateLastModelMessage,
      deleteMessage,
      ...loadingStates,
      setLoadingState
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
