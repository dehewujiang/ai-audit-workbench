
import { AuditProgram, FraudCase, FeasibilityAssessment, AIAnalysis, ActionItem } from '../types';

export function validateAuditProgram(data: any): string | null {
    if (!data || typeof data !== 'object') return "返回的不是一个有效的对象结构。";
    if (typeof data.objective !== 'string' || !data.objective.trim()) return "缺少 'objective' 字段或内容为空。";
    if (!Array.isArray(data.procedures)) return "'procedures' 字段必须是一个数组。";
    
    const validLevels = ['高', '中', '低'];
    
    for (let i = 0; i < data.procedures.length; i++) {
        const proc = data.procedures[i];
        if (!proc) return `程序项 ${i + 1} 为空。`;
        if (typeof proc.id !== 'string' || !proc.id) return `程序 ${i + 1} 缺少 'id'。`;
        if (typeof proc.risk !== 'string' || !proc.risk) return `程序 ${i + 1} 缺少 'risk' 描述。`;
        
        if (typeof proc.riskLevel !== 'string' || !validLevels.includes(proc.riskLevel)) {
            return `程序 ${i + 1} (ID: ${proc.id}) 的 'riskLevel' 无效。当前值: "${proc.riskLevel || '空'}"。必须为 ['高', '中', '低'] 之一。`;
        }
        
        if (typeof proc.control !== 'string' || !proc.control) return `程序 ${i + 1} 缺少 'control' 描述。`;
        if (typeof proc.testStep !== 'string' || !proc.testStep) return `程序 ${i + 1} 缺少 'testStep' 描述。`;
    }

    return null;
}

export function validateFraudCases(data: any): string | null {
    if (!Array.isArray(data)) return "返回的不是一个数组。";

    for (let i = 0; i < data.length; i++) {
        const fraudCase = data[i];
        if (!fraudCase || typeof fraudCase !== 'object') return `案例 ${i + 1} 无效。`;
        if (typeof fraudCase.scenario !== 'string' || !fraudCase.scenario) return `案例 ${i + 1} 缺少 'scenario'。`;
        
        if (!fraudCase.fraudTriangle || typeof fraudCase.fraudTriangle !== 'object') return `案例 ${i + 1} 缺少 'fraudTriangle' 对象。`;
        
        const triangle = fraudCase.fraudTriangle;
        if (typeof triangle.pressure !== 'string' || triangle.pressure.trim() === '') return `案例 ${i + 1} 的舞弊三角缺少有效的 'pressure' 描述。`;
        if (typeof triangle.opportunity !== 'string' || triangle.opportunity.trim() === '') return `案例 ${i + 1} 的舞弊三角缺少有效的 'opportunity' 描述。`;
        if (typeof triangle.rationalization !== 'string' || triangle.rationalization.trim() === '') return `案例 ${i + 1} 的舞弊三角缺少有效的 'rationalization' 描述。`;
        
        if (!Array.isArray(fraudCase.redFlags)) return `案例 ${i + 1} 的 'redFlags' 必须是一个数组。`;
        for (let j = 0; j < fraudCase.redFlags.length; j++) {
            const flag = fraudCase.redFlags[j];
            if (typeof flag.indicator !== 'string' || !flag.indicator) return `案例 ${i + 1} 的危险信号 ${j + 1} 缺少 'indicator'。`;
        }

        if (!fraudCase.detectionMethods || typeof fraudCase.detectionMethods !== 'object') return `案例 ${i + 1} 缺少 'detectionMethods' 对象。`;
        const methods = fraudCase.detectionMethods;
        if (!Array.isArray(methods.dataAnalytics) || !Array.isArray(methods.documentReview)) return `案例 ${i + 1} 的检测方法分类结构不完整。`;
    }
    
    return null;
}

export function validateFindingAnalysis(data: any): string | null {
    if (!data || typeof data !== 'object') return "返回的不是一个对象。";
    
    const analysis = data.aiAnalysis as AIAnalysis;
    if (!analysis || typeof analysis !== 'object') return "缺少 'aiAnalysis' 对象。";
    if (typeof analysis.summary !== 'string' || !analysis.summary.trim()) return "'aiAnalysis' 中缺少 'summary'。";
    if (!Array.isArray(analysis.rootCauseHypotheses)) return "'aiAnalysis' 中的 'rootCauseHypotheses' 必须是一个数组。";
    
    if (typeof analysis.systemicVsIsolated !== 'string') return "'aiAnalysis' 缺少 'systemicVsIsolated' 判定。";
    // 允许 5WhysChain 为数组（新格式）或字符串（兼容旧格式，但应校验）
    if (!analysis['5WhysChain']) return "'aiAnalysis' 缺少 '5WhysChain' 分析内容。";

    const actionItems = data.actionItems;
    if (!Array.isArray(actionItems)) return "'actionItems' 必须是一个数组。";
    for(let i=0; i < actionItems.length; i++) {
        if(typeof actionItems[i].text !== 'string' || !actionItems[i].text.trim()) return `行动项 ${i+1} 缺少文本内容。`;
    }

    return null;
}

export function validateFeasibilityAssessment(data: any): string | null {
    if (!data || typeof data !== 'object') return "返回的不是一个对象。";

    const difficulties = data.potentialDifficulties as FeasibilityAssessment['potentialDifficulties'];
    if (!Array.isArray(difficulties)) return "'potentialDifficulties' 必须是一个数组。";
    for(let i=0; i < difficulties.length; i++) {
        if(typeof difficulties[i].dimension !== 'string') return `困难项 ${i+1} 缺少 'dimension' 字段。`;
        if(typeof difficulties[i].description !== 'string') return `困难项 ${i+1} 缺少 'description' 字段。`;
    }

    const strategies = data.suggestedStrategies as FeasibilityAssessment['suggestedStrategies'];
    if (!Array.isArray(strategies)) return "'suggestedStrategies' 必须是一个数组。";
    for(let i=0; i < strategies.length; i++) {
        if(typeof strategies[i].difficulty !== 'string') return `策略项 ${i+1} 缺少 'difficulty' 字段。`;
        if(typeof strategies[i].strategy !== 'string') return `策略项 ${i+1} 缺少 'strategy' 字段。`;
    }

    return null;
}
