
import { createLlmClient } from '../core/LLMClient';
import { streamJson } from '../core/jsonStream';
import { buildSystemPrompt } from '../prompts/systemPrompts';
import { 
    buildFraudBrainstormPrompt, 
    buildFraudExecutionPrompt 
} from '../prompts/fraudPrompts';
import { validateFraudCases } from '../../../utils/validators';
import { 
    AuditProgram, 
    AuditProgramGenerationChunk, 
    FraudCase, 
    WorkflowStep 
} from '../../../types';

export class FraudAnalyzer {

    /**
     * Step 1: 舞弊风险头脑风暴 (生成分析计划)
     * Updated: PROF-2024-FRAUD-REDTEAM-V2 - Context Injection
     * Updated: PROF-2024-NFC-001 - Volatile Context
     */
    async *generateFraudPlanStream(args: {
        program: AuditProgram;
        userInput: string;
        longTextContext: string; // 文件上下文
        volatileContext?: string; // 近场对话上下文
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
        user?: any;
    }): AsyncGenerator<AuditProgramGenerationChunk> {
        const client = createLlmClient(args.llmProfile);
        
        yield { 
            type: 'workflow_update', 
            steps: [{ name: '红蓝对抗推演 (Red Teaming)', status: 'in_progress' }] 
        };
        
        // Pass context and profile to the new prompt builder
        const prompt = buildFraudBrainstormPrompt(
            args.program, 
            args.longTextContext, 
            args.entityProfile, 
            args.collectedGuidanceData,
            args.volatileContext // Pass NFC
        );
        
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
     * Step 2: 执行舞弊分析 (生成结构化案例 + 差距分析)
     */
    async *executeFraudAnalysisQAStream(args: {
        program: AuditProgram;
        plan: string;
        longTextContext: string;
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
        user?: any;
    }): AsyncGenerator<AuditProgramGenerationChunk> {
        const client = createLlmClient(args.llmProfile);
        
        const steps: WorkflowStep[] = [{ name: '对抗性差距分析 (Gap Analysis)', status: 'in_progress' }];
        yield { type: 'workflow_update', steps };
        
        // SOL-2024-FRAUD-GAP-V1: Inject Phase 1 Plan + Current Program into Phase 2 Prompt
        const prompt = buildFraudExecutionPrompt(args.program, args.plan);
        const sys = buildSystemPrompt(args.entityProfile, args.projectName, args.collectedGuidanceData);

        const generator = streamJson<FraudCase[]>(
            client, 
            { 
                prompt, 
                systemInstruction: sys, 
                signal: args.signal, 
                validator: validateFraudCases 
            }, 
            false
        );

        let cases: FraudCase[] | null = null;
        
        while (true) {
            const { value, done } = await generator.next();
            if (done) { 
                cases = value as FraudCase[]; 
                break; 
            }
            yield value as AuditProgramGenerationChunk;
        }

        if (cases) {
            yield { type: 'json_result', data: cases };
            steps[0].status = 'done';
            yield { type: 'workflow_update', steps };
        }
    }
}
