
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { ChatMessage, LLMProfile } from '../types';
import { BotIcon, UserIcon, SendIcon, Spinner, CloseIcon, ConversationIcon } from './icons';
import { getChatbotResponseStream } from '../services/aiService';
import { useAuth } from '../AuthContext';
import { useGlobal } from '../contexts/GlobalContext';

interface ChatbotWidgetProps {
    isHidden?: boolean;
}

// PROF-2024-UI-MARKDOWN-ENHANCE: Consistent Typography for Widget
const WIDGET_MARKDOWN_STYLES = `
  prose prose-sm max-w-none text-gray-800 prose-p:my-1 prose-ul:my-1 prose-ul:list-disc prose-ul:pl-4 
  prose-headings:font-bold prose-headings:text-slate-800 prose-headings:text-sm prose-headings:mt-2 prose-headings:mb-1
  prose-pre:bg-slate-800 prose-pre:text-white prose-pre:rounded-md prose-pre:p-2 prose-pre:my-1 prose-pre:text-xs
  prose-code:text-pink-600 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
  prose-a:text-blue-600 prose-a:no-underline prose-a:hover:underline
  prose-blockquote:border-l-2 prose-blockquote:border-blue-400 prose-blockquote:bg-blue-50 prose-blockquote:pl-2 prose-blockquote:py-1 prose-blockquote:text-slate-600 prose-blockquote:italic
`;

const SimpleMessageDisplay: React.FC<{ message: ChatMessage; isProcessing?: boolean; }> = ({ message, isProcessing }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex items-start gap-3 my-3 ${isUser ? 'justify-end' : ''}`}>
            {!isUser && <BotIcon className="h-7 w-7 text-blue-500 flex-shrink-0" />}
            <div className={`p-3 rounded-lg max-w-[85%] text-sm ${isUser ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-100'}`}>
                {isProcessing && message.text === '' ? (
                    <Spinner className="h-5 w-5 text-gray-500" />
                ) : (
                    <div className={isUser ? '' : WIDGET_MARKDOWN_STYLES} dangerouslySetInnerHTML={{ __html: marked.parse(message.text) as string }} />
                )}
            </div>
            {isUser && <UserIcon className="h-7 w-7 text-gray-500 flex-shrink-0" />}
        </div>
    );
};

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ isHidden }) => {
    const { activeLlmProfile: activeProfile } = useGlobal();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: 'bot-init', role: 'model', text: '你好！有什么可以帮您解答的吗？', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const prevIsLoading = useRef(isLoading);
    const { isAuthenticated, user } = useAuth();


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);
    
    useEffect(() => {
        // Refocus after a message is received (when loading is finished)
        if (prevIsLoading.current && !isLoading) {
            inputRef.current?.focus();
        }
        prevIsLoading.current = isLoading;
    }, [isLoading]);
    
    useEffect(() => {
        // Focus when the widget is opened.
        if (isOpen) {
            // Use a small timeout to ensure the element is visible and focusable after the CSS transition.
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSend = useCallback(async () => {
        if (!input.trim()) return;
        
        abortControllerRef.current = new AbortController();
        const userMessage: ChatMessage = { id: `bot-user-${Date.now()}`, role: 'user', text: input.trim(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        const modelMessageId = `bot-model-${Date.now()}`;
        const placeholderModelMessage: ChatMessage = { id: modelMessageId, role: 'model', text: '', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };

        setMessages(prev => [...prev, userMessage, placeholderModelMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (!activeProfile) {
                throw new Error("未检测到激活的模型配置，请检查设置。");
            }

            // PROF-2024-FIX-400: Enhanced Filtering Strategy
            // 1. Exclude UI-only 'bot-init'.
            // 2. Exclude messages with empty or whitespace-only text.
            // 3. Exclude previous error messages to prevent context poisoning.
            const validHistory = messages.filter(m => 
                m.id !== 'bot-init' && 
                m.text && 
                /\S/.test(m.text) && // Check for at least one non-whitespace character
                !m.text.startsWith('抱歉，遇到错误') &&
                !m.text.startsWith('Error:')
            );
            
            // Limit context window to last 10 messages to reduce token usage and risk of bad context
            const recentHistory = validHistory.slice(-10);
            
            const messagesForApi = [...recentHistory, userMessage].map(m => ({ role: m.role, content: m.text }));
            
            // Strictly pass the active profile to the service
            const stream = getChatbotResponseStream({ 
                messages: messagesForApi, 
                signal: abortControllerRef.current.signal,
                user,
                llmProfile: activeProfile
            });
            
            let accumulatedText = "";
            for await (const chunk of stream) {
                // Robust consumption: Check if text exists to avoid processing undefined or 'reasoning' chunks if they slip through
                if (chunk.text) {
                    accumulatedText += chunk.text;
                    setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: accumulatedText } : msg));
                }
            }
        } catch (error) {
            const errorText = (error instanceof Error && error.name === 'AbortError') ? '操作已取消。' : `抱歉，遇到错误: ${(error as Error).message}`;
            setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: errorText } : msg));
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }, [input, messages, activeProfile, user]);
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    
    if (!isAuthenticated) return null; // Don't render the widget if not logged in

    return (
        <>
            {/* FAB */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 z-40 ${isOpen || isHidden ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'}`}
                title="助手问答"
                aria-label="打开AI助手问答"
            >
                <ConversationIcon className="h-7 w-7" />
            </button>
            
            {/* Widget */}
            <div className={`fixed bottom-6 right-6 w-[400px] h-[600px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-3rem)] z-50 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                <div className="flex flex-col h-full bg-gray-100 rounded-lg shadow-2xl border border-gray-200">
                    <header className="flex items-center justify-between p-3 bg-white border-b rounded-t-lg flex-shrink-0">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2"><ConversationIcon className="h-5 w-5 text-blue-500"/>AI 即时问答</h3>
                        <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600">
                            <CloseIcon className="h-5 w-5" />
                        </button>
                    </header>
                    <div className="flex-1 overflow-y-auto p-3 bg-slate-50">
                        {messages.map((msg, index) => <SimpleMessageDisplay key={msg.id} message={msg} isProcessing={isLoading && index === messages.length - 1} />)}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-3 border-t bg-white rounded-b-lg flex-shrink-0">
                         <div className="flex items-center gap-2">
                             <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="在此输入您的问题..." className="w-full px-3 py-2 border rounded-md text-sm bg-gray-50 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all" disabled={isLoading} />
                             <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-2.5 bg-blue-600 text-white rounded-md disabled:bg-blue-300 hover:bg-blue-700 transition-colors">
                                <SendIcon className="h-5 w-5" />
                            </button>
                         </div>
                    </div>
                </div>
            </div>
        </>
    );
}
