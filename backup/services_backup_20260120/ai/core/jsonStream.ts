
import { ILlmClient, StreamChunk } from './types';
import { extractAndParseJson } from '../../../utils/jsonUtils';
import { AuditProgramGenerationChunk } from '../../../types';

/**
 * 通用 JSON 流式生成器
 * 封装了：重试逻辑、思维链(Thinking)过滤、JSON 提取与解析、验证器调用
 */
export async function* streamJson<T>(
    client: ILlmClient, 
    params: {
        prompt: string;
        systemInstruction?: string;
        validator?: (data: any) => string | null;
        signal?: AbortSignal;
    }, 
    yieldToUI: boolean = false
): AsyncGenerator<AuditProgramGenerationChunk | T> {
    
    let currentPrompt = params.prompt;
    let attempts = 0;
    const maxAttempts = 2; 

    while (attempts < maxAttempts) {
        attempts++;
        
        // 强制开启 jsonMode
        const stream = client.generateStream({ 
            messages: [{ role: 'user', content: currentPrompt }],
            systemInstruction: params.systemInstruction,
            jsonMode: true,
            signal: params.signal
        });

        let fullContent = "";
        
        for await (const chunk of stream) {
            // 1. 如果是推理内容，以 AuditProgramGenerationChunk 形式流式输出给 UI
            if (chunk.type === 'reasoning') {
                yield { type: 'reasoning', content: chunk.text } as AuditProgramGenerationChunk;
            }
            
            // 2. 如果是正文内容
            if (chunk.type === 'content') {
                fullContent += chunk.text;
                // 如果需要将未解析的文本也流式回显给 UI (通常用于长文本生成，而非纯 JSON)
                if (yieldToUI) {
                    yield { type: 'result', content: chunk.text } as AuditProgramGenerationChunk;
                }
            }
        }

        // 3. 后处理：移除可能残留的 <think> 标签 (双重保险)
        const cleanContent = fullContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        
        try {
            // 4. 提取并解析 JSON
            const data = extractAndParseJson(cleanContent);
            
            // 5. 执行业务验证
            if (params.validator) { 
                const err = params.validator(data); 
                if (err) throw new Error(err); 
            }
            
            // 6. 成功返回强类型对象
            return data as T;

        } catch (e) {
            console.warn(`JSON parsing attempt ${attempts} failed:`, e);
            if (attempts >= maxAttempts) throw e;
            
            // 自愈机制：将错误反馈给模型，要求重试
            currentPrompt = `${params.prompt}\n\n纠错: 你上次生成的 JSON 不完整或有误，请重新生成。错误: ${(e as Error).message}`;
        }
    }
    throw new Error("JSON generation failed after max retries.");
}
