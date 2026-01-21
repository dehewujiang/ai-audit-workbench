
export type ApiMessage = { 
    role: 'user' | 'model' | 'system' | 'assistant'; // 兼容 OpenAI/DeepSeek 的 assistant
    content: string 
};

export type StreamChunk = { 
    type: 'reasoning' | 'content'; 
    text: string 
};

export interface ILlmClient {
    generateStream(params: {
        messages: ApiMessage[]; 
        systemInstruction?: string;
        jsonMode?: boolean;
        signal?: AbortSignal;
    }): AsyncGenerator<StreamChunk>;
}
