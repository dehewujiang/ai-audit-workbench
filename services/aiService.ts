
import { User, AuditProgramGenerationChunk, KnowledgeFile } from '../types';
import * as api from './api';

// 导入新的领域服务 (Domain Services)
import { AuditPlanner } from './ai/domains/AuditPlanner';
import { FraudAnalyzer } from './ai/domains/FraudAnalyzer';
import { FindingAnalyzer } from './ai/domains/FindingAnalyzer';
import { Reporter } from './ai/domains/Reporter';
import { ChatService } from './ai/domains/ChatService';

/**
 * 接口定义：确保 ClientSide 和 ServerSide 实现一致性
 */
interface IAiProvider {
    continueConversationStream(args: any): AsyncGenerator<any>;
    distillContextTask(args: any): Promise<string>;
    generateAuditPlanStream(args: any): AsyncGenerator<AuditProgramGenerationChunk>;
    executeAutonomousQualityAssuranceStream(args: any): AsyncGenerator<AuditProgramGenerationChunk>;
    generateChallengePlanStream(args: any): AsyncGenerator<AuditProgramGenerationChunk>;
    executeChallengeQAStream(args: any): AsyncGenerator<AuditProgramGenerationChunk>;
    generateFraudPlanStream(args: any): AsyncGenerator<AuditProgramGenerationChunk>;
    executeFraudAnalysisQAStream(args: any): AsyncGenerator<AuditProgramGenerationChunk>;
    generateFindingAnalysisPlanStream(args: any): AsyncGenerator<AuditProgramGenerationChunk>;
    executeFindingAnalysisQAStream(args: any): AsyncGenerator<AuditProgramGenerationChunk>;
    generateReportPlanStream(args: any): AsyncGenerator<AuditProgramGenerationChunk>;
    executeReportQAStream(args: any): AsyncGenerator<AuditProgramGenerationChunk>;
    generateFindingQuestionsStream(args: any): AsyncGenerator<any>;
    assessFeasibilityStream(args: any): AsyncGenerator<any>;
    generateGuidanceOptions(args: any): Promise<any>;
    getChatbotResponseStream(args: any): AsyncGenerator<any>;
    simulateAuditeeResponseStream(args: any): AsyncGenerator<any>;
    analyzeCommunicationStream(args: any): AsyncGenerator<any>;
    analyzeAuditeeResponseStream(args: any): AsyncGenerator<any>;
}

/**
 * 客户端提供者 (Guest Mode)
 * 直接调用浏览器的领域服务逻辑，不经过后端 API。
 */
class ClientSideProvider implements IAiProvider {
    private auditPlanner = new AuditPlanner();
    private fraudAnalyzer = new FraudAnalyzer();
    private findingAnalyzer = new FindingAnalyzer();
    private reporter = new Reporter();
    private chatService = new ChatService();

    async *continueConversationStream(args: any) { 
        yield * this.chatService.continueConversationStream(args); 
    }
    
    async distillContextTask(args: any): Promise<string> { 
        return this.chatService.distillContextTask(args); 
    }

    async *generateAuditPlanStream(args: any) { 
        yield * this.auditPlanner.generateAuditPlanStream(args); 
    }

    async *executeAutonomousQualityAssuranceStream(args: any) { 
        yield * this.auditPlanner.executeAutonomousQualityAssuranceStream(args); 
    }

    async *generateChallengePlanStream(args: any) { 
        yield * this.auditPlanner.generateChallengePlanStream(args); 
    }

    async *executeChallengeQAStream(args: any) { 
        yield * this.auditPlanner.executeChallengeQAStream(args); 
    }

    async *generateFraudPlanStream(args: any) { 
        // 传递 longTextContext
        yield * this.fraudAnalyzer.generateFraudPlanStream(args); 
    }

    async *executeFraudAnalysisQAStream(args: any) { 
        yield * this.fraudAnalyzer.executeFraudAnalysisQAStream(args); 
    }

    async *generateFindingAnalysisPlanStream(args: any) { 
        yield * this.findingAnalyzer.generateFindingAnalysisPlanStream(args); 
    }

    async *executeFindingAnalysisQAStream(args: any) { 
        yield * this.findingAnalyzer.executeFindingAnalysisQAStream(args); 
    }

    async *generateReportPlanStream(args: any) { 
        yield * this.reporter.generateReportPlanStream(args); 
    }

    async *executeReportQAStream(args: any) { 
        yield * this.reporter.executeReportQAStream(args); 
    }

    async *generateFindingQuestionsStream(args: any) { 
        yield * this.findingAnalyzer.generateFindingQuestionsStream(args); 
    }

    async *assessFeasibilityStream(args: any) { 
        yield * this.auditPlanner.assessFeasibilityStream(args); 
    }

    async generateGuidanceOptions(args: any) { 
        return this.chatService.generateGuidanceOptions(args); 
    }

    async *getChatbotResponseStream(args: any) { 
        yield * this.chatService.getChatbotResponseStream(args); 
    }

    async *simulateAuditeeResponseStream(args: any) { 
        yield * this.chatService.simulateAuditeeResponseStream(args); 
    }

    async *analyzeCommunicationStream(args: any) { 
        yield * this.chatService.analyzeCommunicationStream(args); 
    }

    async *analyzeAuditeeResponseStream(args: any) { 
        yield * this.chatService.analyzeAuditeeResponseStream(args); 
    }
}

/**
 * 服务端提供者 (Authenticated Mode)
 * 通过 API 代理请求到后端服务器。
 */
class ServerSideProvider implements IAiProvider {
    async *continueConversationStream(args: any) { yield* api.postStream('/ai/chat', args, args.signal); }
    async distillContextTask(args: any) { return api.post('/ai/distill', args); }
    async *generateAuditPlanStream(args: any): AsyncGenerator<AuditProgramGenerationChunk> { const stream = api.postStream('/ai/generate-plan', args, args.signal); for await (const chunk of stream) yield chunk as AuditProgramGenerationChunk; }
    async *executeAutonomousQualityAssuranceStream(args: any): AsyncGenerator<AuditProgramGenerationChunk> { const stream = api.postStream('/ai/execute-qa', args, args.signal); for await (const chunk of stream) yield chunk as AuditProgramGenerationChunk; }
    async *generateChallengePlanStream(args: any): AsyncGenerator<AuditProgramGenerationChunk> { const stream = api.postStream('/ai/generate-challenge-plan', args, args.signal); for await (const chunk of stream) yield chunk as AuditProgramGenerationChunk; }
    async *executeChallengeQAStream(args: any): AsyncGenerator<AuditProgramGenerationChunk> { const stream = api.postStream('/ai/execute-challenge-qa', args, args.signal); for await (const chunk of stream) yield chunk as AuditProgramGenerationChunk; }
    async *generateFraudPlanStream(args: any): AsyncGenerator<AuditProgramGenerationChunk> { const stream = api.postStream('/ai/generate-fraud-plan', args, args.signal); for await (const chunk of stream) yield chunk as AuditProgramGenerationChunk; }
    async *executeFraudAnalysisQAStream(args: any): AsyncGenerator<AuditProgramGenerationChunk> { const stream = api.postStream('/ai/execute-fraud-qa', args, args.signal); for await (const chunk of stream) yield chunk as AuditProgramGenerationChunk; }
    async *generateFindingAnalysisPlanStream(args: any): AsyncGenerator<AuditProgramGenerationChunk> { const stream = api.postStream('/ai/generate-finding-plan', args, args.signal); for await (const chunk of stream) yield chunk as AuditProgramGenerationChunk; }
    async *executeFindingAnalysisQAStream(args: any): AsyncGenerator<AuditProgramGenerationChunk> { const stream = api.postStream('/api/execute-finding-qa', args, args.signal); for await (const chunk of stream) yield chunk as AuditProgramGenerationChunk; }
    async *generateReportPlanStream(args: any): AsyncGenerator<AuditProgramGenerationChunk> { const stream = api.postStream('/ai/generate-report-plan', args, args.signal); for await (const chunk of stream) yield chunk as AuditProgramGenerationChunk; }
    async *executeReportQAStream(args: any): AsyncGenerator<AuditProgramGenerationChunk> { const stream = api.postStream('/ai/execute-report-qa', args, args.signal); for await (const chunk of stream) yield chunk as AuditProgramGenerationChunk; }
    async *generateFindingQuestionsStream(args: any) { yield* api.postStream('/ai/generate-finding-questions', args, args.signal); }
    async *assessFeasibilityStream(args: any) { yield* api.postStream('/ai/assess-feasibility', args, args.signal); }
    async generateGuidanceOptions(args: any) { return api.post('/ai/generate-guidance-options', args); }
    async *getChatbotResponseStream(args: any) { yield* api.postStream('/ai/chatbot', args, args.signal); }
    async *simulateAuditeeResponseStream(args: any) { yield* api.postStream('/ai/simulate-auditee', args, args.signal); }
    async *analyzeCommunicationStream(args: any) { yield* api.postStream('/ai/analyze-communication', args, args.signal); }
    async *analyzeAuditeeResponseStream(args: any) { yield* api.postStream('/api/analyze-auditee-response', args, args.signal); }
}

const guestProvider = new ClientSideProvider();
const serverProvider = new ServerSideProvider();

const getProvider = (user: User | null): IAiProvider => { 
    if (user?.id === 'guest-user-001') return guestProvider; 
    return serverProvider; 
};

// --- Exports (保持与旧 API 签名完全一致) ---

export function continueConversationStream(args: any) { return getProvider(args.user).continueConversationStream(args); }
export function distillContextTask(args: any) { return getProvider(args.user).distillContextTask(args); }
export function generateAuditPlanStream(args: any) { return getProvider(args.user).generateAuditPlanStream(args); }
export function executeAutonomousQualityAssuranceStream(args: any) { return getProvider(args.user).executeAutonomousQualityAssuranceStream(args); }
export function generateChallengePlanStream(args: any) { return getProvider(args.user).generateChallengePlanStream(args); }
export function executeChallengeQAStream(args: any) { return getProvider(args.user).executeChallengeQAStream(args); }
export function generateFraudPlanStream(args: any) { return getProvider(args.user).generateFraudPlanStream(args); }
export function executeFraudAnalysisQAStream(args: any) { return getProvider(args.user).executeFraudAnalysisQAStream(args); }
export function generateFindingAnalysisPlanStream(args: any) { return getProvider(args.user).generateFindingAnalysisPlanStream(args); }
export function executeFindingAnalysisQAStream(args: any) { return getProvider(args.user).executeFindingAnalysisQAStream(args); }
export function generateReportPlanStream(args: any) { return getProvider(args.user).generateReportPlanStream(args); }
export function executeReportQAStream(args: any) { return getProvider(args.user).executeReportQAStream(args); }
export function generateFindingQuestionsStream(args: any) { return getProvider(args.user).generateFindingQuestionsStream(args); }
export function assessFeasibilityStream(args: any) { return getProvider(args.user).assessFeasibilityStream(args); }
export function generateGuidanceOptions(args: any) { return getProvider(args.user).generateGuidanceOptions(args); }
export function getChatbotResponseStream(args: any) { return getProvider(args.user).getChatbotResponseStream(args); }
export function simulateAuditeeResponseStream(args: any) { return getProvider(args.user).simulateAuditeeResponseStream(args); }
export function analyzeCommunicationStream(args: any) { return getProvider(args.user).analyzeCommunicationStream(args); }
export function analyzeAuditeeResponseStream(args: any) { return getProvider(args.user).analyzeAuditeeResponseStream(args); }

// 工具函数：保留供 hooks 使用
export const buildContextStringFromFiles = (files: KnowledgeFile[]) => {
    if (files.length === 0) return '';
    return files.map(file => `[文件: ${file.name}]\n${file.content.substring(0, 1000)}...`).join('\n---\n');
};
