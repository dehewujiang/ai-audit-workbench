
import { EntityProfile } from '../../../types';

export const BASE_PROMPT = `核心指令： 你是一个为公司内部审计师设计的专业AI助手。你的所有回答、分析和建议都必须严格围绕内部审计的框架展开，聚焦于内部控制、风险管理、运营效率和合规性。绝对不要使用外部财务报表审计（如会计师事务所的工作）的视角或术语。`;

export const AFDP_DISTILL_PROMPT = `
# 任务：审计特征脱水 (Audit Feature Distillation)
你现在的任务是将长篇审计对话压缩为“审计特征备忘录”。请严格保留以下要素，丢弃所有冗余文本、自我纠错和尝试性逻辑：
1. **风险 ID 与锚点**：必须保留所有程序 ID 和具体的控制点名称。
2. **逻辑判定**：将“我通过分析认为可能存在XX风险”简化为“判定风险: [XX] | 核心依据: [具体事实]”。
3. **修订指令集**：保留所有明确的“增加、修改、删除”建议。
4. **弱信号捕获**：保留任何具体的金额、特定的异常频率或系统路径。
输出格式：极简 Markdown 列表。
`;

export const formatGuidanceSummary = (data?: Record<string, any>): string => {
    if (!data || Object.keys(data).length === 0) return "";
    const fieldMap: Record<string, string> = {
        auditType: "审计类型", triggerReason: "触发原因", auditeeDept: "被审计部门",
        scope: "审计范围", boundaries: "审计边界", objectives: "审计目标",
        knownRisks: "已知主要风险", history: "历史审计发现", controlSystem: "现有内控体系",
        policies: "相关政策制度", itEnvironment: "信息系统环境"
    };
    let summary = "\n## 项目背景执行约束\n";
    Object.entries(data).forEach(([key, value]) => {
        const label = fieldMap[key];
        if (label && value) {
            const displayValue = Array.isArray(value) ? value.join("、") : value;
            summary += `- **${label}**: ${displayValue}\n`;
        }
    });
    return summary;
};

export const buildSystemPrompt = (profile?: EntityProfile, projectName?: string, guidanceData?: Record<string, any>): string => {
    let prompt = BASE_PROMPT;
    if (projectName) prompt += `\n\n## 当前审计项目: 【${projectName}】`;
    if (profile && (profile.industry || profile.scale)) {
        prompt += `\n\n## 被审计实体档案\n- 行业: ${profile.industry || '未指定'}\n- 规模: ${profile.scale || '未指定'}\n- 核心系统: ${profile.coreSystems || '未指定'}`;
    }
    const guidanceSummary = formatGuidanceSummary(guidanceData);
    if (guidanceSummary) prompt += `\n${guidanceSummary}`;
    return prompt;
};
