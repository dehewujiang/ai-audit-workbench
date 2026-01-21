
import { createLlmClient } from '../core/LLMClient';
import { buildSystemPrompt } from '../prompts/systemPrompts';
import { 
    buildReportPlanPrompt, 
    buildReportExecutionPrompt 
} from '../prompts/reportPrompts';
import { 
    AuditProgramGenerationChunk, 
    WorkflowStep 
} from '../../../types';

export class Reporter {

    /**
     * Step 1: 构建审计报告大纲
     */
    async *generateReportPlanStream(args: {
        title: string;
        auditee: string;
        findings: any[]; // Finding[]
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
        volatileContext?: string; // New
        user?: any;
    }): AsyncGenerator<AuditProgramGenerationChunk> {
        const client = createLlmClient(args.llmProfile);
        
        yield { type: 'workflow_update', steps: [{ name: '构建报告大纲', status: 'in_progress' }] };
        
        const prompt = buildReportPlanPrompt({
            title: args.title,
            auditee: args.auditee,
            findings: args.findings
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

        yield { type: 'workflow_update', steps: [{ name: '大纲就绪', status: 'done' }] };
    }

    /**
     * Step 2: 撰写审计报告全文
     */
    async *executeReportQAStream(args: {
        plan: string;
        findings: any[];
        title: string;
        auditee: string;
        auditor: string;
        entityProfile: any;
        projectName: string;
        collectedGuidanceData?: any;
        llmProfile: any;
        signal?: AbortSignal;
        user?: any;
    }): AsyncGenerator<AuditProgramGenerationChunk> {
        const client = createLlmClient(args.llmProfile);
        
        const steps: WorkflowStep[] = [{ name: '撰写全文', status: 'in_progress' }];
        yield { type: 'workflow_update', steps };
        
        const prompt = buildReportExecutionPrompt({
            plan: args.plan,
            findings: args.findings,
            title: args.title,
            auditee: args.auditee,
            auditor: args.auditor
        });
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
}
