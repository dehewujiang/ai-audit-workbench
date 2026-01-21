
import { calculateMessagesTokens, THRESHOLDS } from '../../../utils/tokenUtils';
import { DistilledContext } from '../../../types';
import { ApiMessage, StreamChunk } from './types';

/**
 * L0 清洗器：移除推理标签
 */
export const cleanContentL0 = (text: string): string => {
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
};

/**
 * 消息清洗管道 (Sanitization Pipeline)
 * 解决 API 400 错误的核心逻辑
 */
export const sanitizeMessages = (messages: ApiMessage[]): ApiMessage[] => {
    // 1. 过滤空消息
    const nonEmptyMessages = messages.filter(m => m.content && m.content.trim() !== '');

    if (nonEmptyMessages.length === 0) return [];

    // 2. 合并连续同角色消息
    const mergedMessages: ApiMessage[] = [];
    let lastMsg = nonEmptyMessages[0];

    for (let i = 1; i < nonEmptyMessages.length; i++) {
        const currentMsg = nonEmptyMessages[i];
        if (currentMsg.role === lastMsg.role) {
            // 合并内容，用换行符分隔
            lastMsg = { ...lastMsg, content: `${lastMsg.content}\n\n${currentMsg.content}` };
        } else {
            mergedMessages.push(lastMsg);
            lastMsg = currentMsg;
        }
    }
    mergedMessages.push(lastMsg);

    // 3. 确保以 User 开始 (Gemini 限制)
    // 移除开头的 Model 消息 (通常是 "你好" 等欢迎语)
    while (mergedMessages.length > 0 && (mergedMessages[0].role === 'model' || mergedMessages[0].role === 'assistant')) {
        mergedMessages.shift();
    }

    return mergedMessages;
};

/**
 * 动态上下文漏斗管理器 (Context Funnel)
 * 负责根据 Token 负载执行 L1/L2 压缩策略
 */
export const manageContextFunnel = (messages: ApiMessage[], distilled?: DistilledContext): ApiMessage[] => {
    // Step 0: 基础清洗 (移除 <think> 标签)
    let processedMsgs = messages.map(m => ({
        ...m,
        content: cleanContentL0(m.content)
    }));

    // Step 1: 严格的消息清洗 (解决 API 400)
    processedMsgs = sanitizeMessages(processedMsgs);

    const totalTokens = calculateMessagesTokens(processedMsgs);

    // L1: 提取层 - 如果超过 32K，注入已有的特征总结并压缩旧对话
    if (totalTokens > THRESHOLDS.L0_CLEAN && distilled) {
        const historyContext = `[历史特征总结]:\n${distilled.historySummary || "无"}\n[模块定性]:\n${distilled.fraudQualitative || ""}\n${distilled.challengeQualitative || ""}`;
        
        // 保留最近 8 轮对话，之前的全部用 summary 代替
        const recentCount = 8; 
        if (processedMsgs.length > recentCount) {
            processedMsgs = [
                { role: 'system', content: `以下是对话的历史特征摘要，请优先遵循其结论：\n${historyContext}` },
                ...processedMsgs.slice(-recentCount)
            ];
        }
    }
    
    // L2: 骨架层 - 如果依然超过 64K，强制截断所有非 system 消息的详细文本，仅保留最近 2 轮
    if (totalTokens > THRESHOLDS.L1_DISTILL) {
        const systemMsgs = processedMsgs.filter(m => m.role === 'system');
        const recentMsgs = processedMsgs.filter(m => m.role !== 'system').slice(-4);
        processedMsgs = [
            ...systemMsgs,
            ...recentMsgs
        ];
    }

    return processedMsgs;
};

/**
 * 流式思维分离器 (Stream Thinking Splitter)
 * 将混合在 content 中的 <think> 标签分离，路由到 reasoning 通道。
 */
export async function* processMixedStream(rawStream: AsyncGenerator<StreamChunk>): AsyncGenerator<StreamChunk> {
    let isThinking = false;
    let buffer = "";

    for await (const chunk of rawStream) {
        // 1. 原生 reasoning 直接通过
        if (chunk.type === 'reasoning') {
            yield chunk;
            continue;
        }

        // 2. 处理 content 类型
        buffer += chunk.text;

        while (true) {
            if (!isThinking) {
                const startIdx = buffer.indexOf('<think>');
                if (startIdx !== -1) {
                    // 发现开始标签：先把标签前的内容发出去
                    if (startIdx > 0) {
                        yield { type: 'content', text: buffer.substring(0, startIdx) };
                    }
                    // 切换状态，丢弃标签
                    isThinking = true;
                    buffer = buffer.substring(startIdx + 7); // 7 = length of <think>
                } else {
                    // 检查缓冲区末尾是否有部分标签的可能性
                    const lastOpenAngle = buffer.lastIndexOf('<');
                    if (lastOpenAngle !== -1 && buffer.length - lastOpenAngle < 7) {
                        if (lastOpenAngle > 0) {
                            yield { type: 'content', text: buffer.substring(0, lastOpenAngle) };
                            buffer = buffer.substring(lastOpenAngle);
                        }
                        break; 
                    } else {
                        if (buffer.length > 0) {
                            yield { type: 'content', text: buffer };
                            buffer = "";
                        }
                        break;
                    }
                }
            } else {
                const endIdx = buffer.indexOf('</think>');
                if (endIdx !== -1) {
                    // 发现结束标签：先把标签前的推理发出去
                    if (endIdx > 0) {
                        yield { type: 'reasoning', text: buffer.substring(0, endIdx) };
                    }
                    // 切换状态，丢弃标签
                    isThinking = false;
                    buffer = buffer.substring(endIdx + 8); // 8 = length of </think>
                } else {
                    const lastOpenAngle = buffer.lastIndexOf('<');
                    if (lastOpenAngle !== -1 && buffer.length - lastOpenAngle < 8) {
                        if (lastOpenAngle > 0) {
                            yield { type: 'reasoning', text: buffer.substring(0, lastOpenAngle) };
                            buffer = buffer.substring(lastOpenAngle);
                        }
                        break;
                    } else {
                        if (buffer.length > 0) {
                            yield { type: 'reasoning', text: buffer };
                            buffer = "";
                        }
                        break;
                    }
                }
            }
        }
    }
    
    // 流结束，清空缓冲区
    if (buffer.length > 0) {
        yield { type: isThinking ? 'reasoning' : 'content', text: buffer };
    }
}
