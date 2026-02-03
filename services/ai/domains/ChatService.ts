
import { createLlmClient } from '../core/LLMClient';
import { processMixedStream, manageContextFunnel, sanitizeMessages } from '../core/streamUtils';
import { streamJson } from '../core/jsonStream';
import { ApiMessage } from '../core/types';
import { 
    buildSystemPrompt, 
    AFDP_DISTILL_PROMPT 
} from '../prompts/systemPrompts';
import {
    buildChatbotSystemInstruction,
    buildAuditeeSimulationPrompt,
    buildCommunicationAnalysisPrompt,
    buildAuditeeResponseAnalysisPrompt,
    buildGuidanceOptionsPrompt
} from '../prompts/coachPrompts';
import { DrillTurn, AuditeeProfile, Finding, DistilledContext } from '../../../types';

export class ChatService {

    /**
     * 主对话流 (包含 AFDP 上下文漏斗处理)
     */
    async *continueConversationStream(args: {
        messages: ApiMessage[];
        longTextContext?: string;
        distilledContext?: DistilledContext;
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
    }) {
        const client = createLlmClient(args.llmProfile);
        const sys = buildSystemPrompt(args.entityProfile, args.projectName, args.collectedGuidanceData);
        
        let apiMessages: ApiMessage[] = args.longTextContext 
            ? [{ role: 'user', content: `## 补充上下文\n${args.longTextContext}` }, { role: 'model', content: "已收到。" }, ...args.messages]
            : args.messages;
        
        // 核心：应用 AFDP 上下文压缩策略
        apiMessages = manageContextFunnel(apiMessages, args.distilledContext);
        
        const rawStream = client.generateStream({ 
            messages: apiMessages, 
            systemInstruction: sys, 
            signal: args.signal 
        });
        
        // 核心：处理 <think> 标签分离
        const processedStream = processMixedStream(rawStream);

        for await (const chunk of processedStream) {
            if (chunk.type === 'reasoning') yield { type: 'reasoning', text: chunk.text };
            if (chunk.type === 'content') yield { text: chunk.text };
        }
    }

    /**
     * 执行 AFDP 上下文脱水任务
     */
    async distillContextTask(args: {
        messages: ApiMessage[];
        llmProfile: any;
        user: any;
    }): Promise<string> {
        const client = createLlmClient(args.llmProfile);
        
        // 构造脱水指令
        const distillMessages: ApiMessage[] = [
            { role: 'system', content: AFDP_DISTILL_PROMPT },
            { role: 'user', content: `请提取以下审计对话的核心特征：\n\n${args.messages.map((m) => `${m.role}: ${m.content}`).join('\n')}` }
        ];
        
        let summary = "";
        const stream = client.generateStream({ messages: distillMessages });
        
        for await (const chunk of stream) { 
            if (chunk.type === 'content') summary += chunk.text; 
        }
        return summary;
    }

    /**
     * 生成背景调查引导选项
     */
    async generateGuidanceOptions(args: {
        stageNumber: number;
        fieldLabel: string; // Used in prompt logic if needed
        fieldName: string;  // Added to match usage
        entityProfile: any;
        projectName: string;
        collectedData: any;
        llmProfile: any;
    }) { 
        const client = createLlmClient(args.llmProfile);
        // PROF-REFACTOR-001: 重构为 GuidanceContext，注入完整项目背景
        const prompt = buildGuidanceOptionsPrompt({
            projectName: args.projectName,
            fieldLabel: args.fieldLabel,
            fieldName: args.fieldName,
            stageNumber: args.stageNumber,
            entityProfile: args.entityProfile,
            collectedData: args.collectedData
        });
        const sys = buildSystemPrompt(args.entityProfile, args.projectName, args.collectedData);

        const generator = streamJson<{options: string[], explanation: string}>(
            client, 
            { 
                prompt, 
                systemInstruction: sys, 
                validator: (d: any) => d.options ? null : "error" 
            }, 
            false
        );

        while (true) { 
            const { value, done } = await generator.next(); 
            if (done) return value; 
        }
    }
    
    /**
     * 悬浮窗简易问答
     */
    async *getChatbotResponseStream(args: {
        messages: ApiMessage[];
        llmProfile: any;
        user?: any;
        signal?: AbortSignal;
    }) { 
        if (!args.llmProfile) throw new Error("Model configuration is missing.");

        const client = createLlmClient(args.llmProfile);
        const sanitizedMsgs = sanitizeMessages(args.messages);
        const sys = buildChatbotSystemInstruction();

        const rawStream = client.generateStream({ 
            messages: sanitizedMsgs, 
            systemInstruction: sys, 
            signal: args.signal 
        });
        
        const processedStream = processMixedStream(rawStream);
        
        for await (const chunk of processedStream) { 
            // 悬浮窗暂不展示 reasoning，只输出 content
            if (chunk.type === 'content') yield { text: chunk.text }; 
        }
    }

    /**
     * 模拟被审计人回复 (Communication Drill)
     */
    async *simulateAuditeeResponseStream(args: {
        finding: Finding;
        history: DrillTurn[];
        auditeeProfile: AuditeeProfile;
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
    }) {
        const client = createLlmClient(args.llmProfile);
        const prompt = buildAuditeeSimulationPrompt(args.finding, args.history, args.auditeeProfile);
        const sys = buildSystemPrompt(args.entityProfile, args.projectName, args.collectedGuidanceData);

        const stream = client.generateStream({ 
            messages: [{role:'user', content: prompt}], 
            systemInstruction: sys, 
            signal: args.signal 
        });

        for await (const chunk of stream) { 
            if (chunk.type === 'content') yield { text: chunk.text }; 
        }
    }

    /**
     * AI 教练点评沟通策略
     */
    async *analyzeCommunicationStream(args: {
        finding: Finding;
        history: DrillTurn[];
        userRebuttal: string;
        auditeeProfile?: AuditeeProfile; // Not strictly used in prompt but passed in legacy
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
    }) {
        const client = createLlmClient(args.llmProfile);
        const prompt = buildCommunicationAnalysisPrompt(args.finding, args.history, args.userRebuttal);
        const sys = buildSystemPrompt(args.entityProfile, args.projectName, args.collectedGuidanceData);

        const stream = client.generateStream({ 
            messages: [{role:'user', content: prompt}], 
            systemInstruction: sys, 
            signal: args.signal 
        });

        for await (const chunk of stream) { 
            if (chunk.type === 'content') yield { text: chunk.text }; 
        }
    }

    /**
     * 分析被审计人的真实回复
     */
    async *analyzeAuditeeResponseStream(args: {
        finding: Finding;
        history: DrillTurn[];
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
    }) {
        const client = createLlmClient(args.llmProfile);
        const lastTurn = args.history[args.history.length - 1];
        const prompt = buildAuditeeResponseAnalysisPrompt(args.finding, args.history, lastTurn?.text || '');
        const sys = buildSystemPrompt(args.entityProfile, args.projectName, args.collectedGuidanceData);

        const stream = client.generateStream({ 
            messages: [{role:'user', content: prompt}], 
            systemInstruction: sys, 
            signal: args.signal 
        });

        for await (const chunk of stream) { 
            if (chunk.type === 'content') yield { text: chunk.text }; 
        }
    }
}
