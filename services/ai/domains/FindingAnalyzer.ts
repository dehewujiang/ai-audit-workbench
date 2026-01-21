
import { createLlmClient } from '../core/LLMClient';
import { streamJson } from '../core/jsonStream';
import { buildSystemPrompt } from '../prompts/systemPrompts';
import { 
    buildFindingQuestionsPrompt, 
    buildFindingAnalysisPlanPrompt, 
    buildFindingExecutionPrompt 
} from '../prompts/findingPrompts';
import { validateFindingAnalysis } from '../../../utils/validators';
import { 
    AuditProgramGenerationChunk, 
    WorkflowStep 
} from '../../../types';

export class FindingAnalyzer {

    /**
     * 生成事实澄清提问
     */
    async *generateFindingQuestionsStream(args: {
        condition: string; 
        criteria: string; 
        effect: string; 
        cause?: string;
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
        user?: any;
    }) { 
        const client = createLlmClient(args.llmProfile);
        const prompt = buildFindingQuestionsPrompt({
            condition: args.condition,
            criteria: args.criteria,
            effect: args.effect,
            cause: args.cause
        });
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
     * Step 1: 拟定 RCA 分析路径
     */
    async *generateFindingAnalysisPlanStream(args: {
        condition: string;
        criteria: string;
        effect: string;
        cause?: string;
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
        volatileContext?: string; // New
        user?: any;
    }): AsyncGenerator<AuditProgramGenerationChunk> {
        const client = createLlmClient(args.llmProfile);
        
        yield { type: 'workflow_update', steps: [{ name: '拟定 RCA 路径', status: 'in_progress' }] };
        
        const prompt = buildFindingAnalysisPlanPrompt({
            condition: args.condition,
            criteria: args.criteria,
            effect: args.effect,
            cause: args.cause
        }, args.volatileContext);

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

        yield { type: 'workflow_update', steps: [{ name: '方案就绪', status: 'done' }] };
    }

    /**
     * Step 2: 执行 RCA 根本原因分析 (结构化输出)
     */
    async *executeFindingAnalysisQAStream(args: {
        condition: string;
        criteria: string;
        effect: string;
        answers: string;
        plan: string; // RCA Plan content
        longTextContext: string;
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
        user?: any;
    }): AsyncGenerator<AuditProgramGenerationChunk> {
        const client = createLlmClient(args.llmProfile);
        
        const steps: WorkflowStep[] = [{ name: '根本原因分析', status: 'in_progress' }];
        yield { type: 'workflow_update', steps };
        
        const prompt = buildFindingExecutionPrompt({
            condition: args.condition,
            criteria: args.criteria,
            effect: args.effect,
            answers: args.answers
        });
        const sys = buildSystemPrompt(args.entityProfile, args.projectName, args.collectedGuidanceData);

        const generator = streamJson<any>(
            client, 
            { 
                prompt, 
                systemInstruction: sys, 
                signal: args.signal, 
                validator: validateFindingAnalysis 
            }, 
            false
        );

        while (true) {
            const { value, done } = await generator.next();
            if (done) { 
                if (value) yield { type: 'json_result', data: value }; 
                steps[0].status = 'done'; 
                yield { type: 'workflow_update', steps }; 
                break; 
            }
            yield value as AuditProgramGenerationChunk;
        }
    }
}
