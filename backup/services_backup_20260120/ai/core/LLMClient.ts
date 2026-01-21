
import { GoogleGenAI } from "@google/genai";
import { LLMProfile } from '../../../types';
import { ApiMessage, StreamChunk, ILlmClient } from './types';
import { sanitizeMessages } from './streamUtils';

export class GeminiClient implements ILlmClient {
    private modelName: string;
    constructor(profile: LLMProfile) { 
        this.modelName = profile.modelName || 'gemini-3-pro-preview'; 
    }
    
    async *generateStream({ messages, systemInstruction, jsonMode, signal }: any): AsyncGenerator<StreamChunk> {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const safeMessages = sanitizeMessages(messages);
        
        const contents = safeMessages.map((m: ApiMessage) => ({
            role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));
        
        if (contents.length === 0) {
             return;
        }

        try {
            const responseStream = await ai.models.generateContentStream({
                model: this.modelName,
                contents: contents,
                config: { systemInstruction, responseMimeType: jsonMode ? "application/json" : "text/plain" }
            });
            for await (const chunk of responseStream) {
                if (signal?.aborted) throw new Error("Operation aborted");
                if (chunk.text) yield { type: 'content', text: chunk.text };
            }
        } catch (e) { 
            console.error("Gemini Stream Error:", e); 
            throw e; 
        }
    }
}

export class DeepSeekClient implements ILlmClient {
    private apiKey: string;
    private endpoint: string;
    private model: string;

    constructor(profile: LLMProfile) {
        this.apiKey = profile.apiKey;
        this.model = profile.modelName || 'deepseek-chat';
        let ep = profile.apiEndpoint || 'https://api.deepseek.com/chat/completions';
        this.endpoint = ep.trim().endsWith('/chat/completions') ? ep : `${ep.replace(/\/$/, '')}/chat/completions`;
    }

    async *generateStream({ messages, systemInstruction, jsonMode, signal }: any): AsyncGenerator<StreamChunk> {
        if (!this.apiKey) throw new Error("DeepSeek API Key is missing.");
        
        const safeMessages = sanitizeMessages(messages);
        
        const apiMessages = safeMessages.map(m => ({
            role: m.role === 'model' ? 'assistant' : m.role,
            content: m.content
        }));
        
        if (systemInstruction) apiMessages.unshift({ role: 'system', content: systemInstruction });
        
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
            body: JSON.stringify({ 
                model: this.model, 
                messages: apiMessages, 
                stream: true,
                response_format: jsonMode ? { type: "json_object" } : undefined
            }),
            signal
        });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const reader = response.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        try {
            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || "";
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data:')) continue;
                    const jsonStr = trimmed.replace(/^data:\s*/, '');
                    if (jsonStr === '[DONE]') continue;
                    try {
                        const json = JSON.parse(jsonStr);
                        const delta = json.choices?.[0]?.delta;
                        if (delta?.reasoning_content) yield { type: 'reasoning', text: delta.reasoning_content };
                        if (delta?.content) yield { type: 'content', text: delta.content };
                    } catch (e) {}
                }
            }
        } finally { reader?.releaseLock(); }
    }
}

export function createLlmClient(profile?: LLMProfile): ILlmClient {
    if (!profile || profile.provider === 'google') {
        return new GeminiClient(profile || { 
            id: 'default', 
            provider: 'google', 
            name: 'Gemini', 
            apiKey: '', 
            apiEndpoint: '', 
            modelName: 'gemini-3-pro-preview' 
        } as LLMProfile);
    }
    if (profile.provider === 'deepseek') return new DeepSeekClient(profile);
    throw new Error(`Unsupported Provider: ${profile.provider}`);
}
