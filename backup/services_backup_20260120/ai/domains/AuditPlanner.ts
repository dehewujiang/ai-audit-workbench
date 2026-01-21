
import { createLlmClient } from '../core/LLMClient';
import { streamJson } from '../core/jsonStream';
import { buildSystemPrompt } from '../prompts/systemPrompts';
import {
    buildAuditPlanPrompt,
    buildRevisionSystemInstruction,
    buildAutonomousQAPrompt,
    buildChallengePlanPrompt,
    buildChallengeExecutionPrompt,
    buildFeasibilityPrompt
} from '../prompts/auditPrompts';
import { validateAuditProgram, validateFeasibilityAssessment } from '../../../utils/validators';
import { 
    AuditProgram, 
    AuditProgramGenerationChunk, 
    FeasibilityAssessment, 
    WorkflowStep 
} from '../../../types';

export class AuditPlanner {
    
    /**
     * 生成或修订审计规划大纲 (Step 1: Planning)
     */
    async *generateAuditPlanStream(args: {
        projectName: string;
        entityProfile: any;
        llmProfile: any;
        signal?: AbortSignal;
        revisionContext?: any;
        collectedGuidanceData?: any;
        userInput?: string; // New: 用户指令
        volatileContext?: string; // New: 近场上下文
        user?: any;
    }): AsyncGenerator<AuditProgramGenerationChunk> {
        const client = createLlmClient(args.llmProfile);
        
        // 1. 构建 Prompt
        let sys = buildSystemPrompt(args.entityProfile, args.projectName, args.collectedGuidanceData);
        let prompt = buildAuditPlanPrompt(args.projectName, args.revisionContext, args.userInput, args.volatileContext);

        if (args.revisionContext) {
            sys = buildRevisionSystemInstruction(sys);
        }

        // 2. 发送工作流状态更新
        yield { 
            type: 'workflow_update', 
            steps: [{ name: args.revisionContext ? '修订规划大纲' : '构建规划大纲', status: 'in_progress' }] 
        };

        // 3. 执行流式生成
        const stream = client.generateStream({ 
            messages: [{ role: 'user', content: prompt }], 
            systemInstruction: sys, 
            signal: args.signal 
        });

        for await (const chunk of stream) {
            if (chunk.type === 'reasoning') yield { type: 'reasoning', content: chunk.text };
            if (chunk.type === 'content') yield { type: 'result', content: chunk.text };
        }

        // 4. 完成
        yield { type: 'workflow_update', steps: [{ name: '规划就绪', status: 'done' }] };
    }

    /**
     * 执行自主质检并生成结构化程序 (Step 2: Execution & QA)
     */
    async *executeAutonomousQualityAssuranceStream(args: {
        plan: string;
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
        longTextContext?: string; // 暂未深度使用，保留接口兼容
        user?: any;
    }): AsyncGenerator<AuditProgramGenerationChunk> {
        const client = createLlmClient(args.llmProfile);
        
        const workflowSteps: WorkflowStep[] = [{ name: '生成程序草稿', status: 'in_progress' }];
        yield { type: 'workflow_update', steps: workflowSteps };
        
        const prompt = buildAutonomousQAPrompt(args.plan);
        const sys = buildSystemPrompt(args.entityProfile, args.projectName, args.collectedGuidanceData);

        // 使用通用 JSON 流处理器
        const generator = streamJson<AuditProgram>(
            client, 
            { 
                prompt, 
                systemInstruction: sys, 
                signal: args.signal, 
                validator: validateAuditProgram 
            }, 
            false // 不将原始 JSON 文本流式回显给 UI，避免刷屏，只在最后返回对象
        );

        let draft: AuditProgram | null = null;
        
        // 转发 generator 的 reasoning，捕获最终结果
        while (true) {
            const { value, done } = await generator.next();
            if (done) { 
                draft = value as AuditProgram; 
                break; 
            }
            yield value as AuditProgramGenerationChunk;
        }

        if (draft) {
            yield { type: 'json_result', data: draft };
            workflowSteps[0].status = 'done';
            yield { type: 'workflow_update', steps: workflowSteps };
        }
    }

    /**
     * 生成红蓝对抗攻击剧本 (Challenge Mode Step 1)
     */
    async *generateChallengePlanStream(args: {
        latestProgram: AuditProgram;
        focusNote: string;
        longTextContext: string;
        volatileContext?: string; // New: 近场上下文
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
        user?: any;
    }): AsyncGenerator<AuditProgramGenerationChunk> {
        const client = createLlmClient(args.llmProfile);
        
        yield { type: 'workflow_update', steps: [{ name: '拟定红队攻击剧本', status: 'in_progress' }] };
        
        const prompt = buildChallengePlanPrompt(args.latestProgram, args.focusNote, args.longTextContext, args.volatileContext);
        const sys = buildSystemPrompt(args.entityProfile, args.projectName, args.collectedGuidanceData);

        const stream = client.generateStream({ 
            messages: [{ role: 'user', content: prompt }], 
            systemInstruction: sys, 
            signal: args.signal 
        });
        
        for await (const chunk of stream) {
            if (chunk.type === 'reasoning') yield { type: 'reasoning', content: chunk.text };
            if (chunk.type === 'content') yield { type: 'result', content: chunk.text };
        }
        
        yield { type: 'workflow_update', steps: [{ name: '攻击剧本已生成', status: 'done' }] };
    }

    /**
     * 执行红蓝对抗批判 (Challenge Mode Step 2)
     */
    async *executeChallengeQAStream(args: {
        latestProgram: AuditProgram;
        plan: string;
        focusNote: string;
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
        longTextContext?: string;
        user?: any;
    }): AsyncGenerator<AuditProgramGenerationChunk> {
        const client = createLlmClient(args.llmProfile);
        
        const steps: WorkflowStep[] = [{ name: '执行红蓝对抗', status: 'in_progress' }];
        yield { type: 'workflow_update', steps };
        
        const prompt = buildChallengeExecutionPrompt(args.latestProgram, args.plan, args.focusNote);
        const sys = buildSystemPrompt(args.entityProfile, args.projectName, args.collectedGuidanceData);

        const stream = client.generateStream({ 
            messages: [{ role: 'user', content: prompt }], 
            systemInstruction: sys, 
            signal: args.signal 
        });

        for await (const chunk of stream) {
            if (chunk.type === 'reasoning') yield { type: 'reasoning', content: chunk.text };
            if (chunk.type === 'content') yield { type: 'result', content: chunk.text };
        }
        
        steps[0].status = 'done';
        yield { type: 'workflow_update', steps };
    }

    /**
     * 单条程序可行性评估
     */
    async *assessFeasibilityStream(args: {
        procedure: any;
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
        user?: any;
    }) { 
        const client = createLlmClient(args.llmProfile);
        const prompt = buildFeasibilityPrompt(args.procedure);
        const sys = buildSystemPrompt(args.entityProfile, args.projectName, args.collectedGuidanceData);

        const generator = streamJson<FeasibilityAssessment>(
            client, 
            { 
                prompt, 
                systemInstruction: sys, 
                signal: args.signal, 
                validator: validateFeasibilityAssessment 
            }, 
            false
        );

        while (true) {
            const { value, done } = await generator.next();
            if (done) { 
                if (value) yield { data: value as FeasibilityAssessment }; 
                break; 
            }
            yield value;
        }
    }
}
