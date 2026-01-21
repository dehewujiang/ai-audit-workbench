
import { DrillTurn, AuditeeProfile, Finding } from '../../../types';
import { GUIDANCE_OPTIONS_SCHEMA } from '../schemas';

// --- Helpers ---
export const formatDrillHistory = (history: DrillTurn[]): string => {
    if (!history || history.length === 0) return "（暂无历史对话）";
    return history.map((turn, i) => {
        const role = turn.actor === 'auditee' ? '被审计单位' : (turn.actor === 'coach' ? 'AI教练' : '审计师');
        return `[Round ${Math.floor(i/2)+1}] ${role}: ${turn.text}`;
    }).join('\n');
};

// --- Builders ---

export const buildChatbotSystemInstruction = () => {
    return "You are a helpful AI assistant for an internal audit workbench application. Answer concisely.";
};

export const buildAuditeeSimulationPrompt = (finding: Finding, history: DrillTurn[], profile: AuditeeProfile) => {
    return `
# 任务：角色扮演（模拟被审计人）
请基于以下人物画像和对话历史，模拟被审计单位的真实反应。反应应当符合其职位、性格和对审计的态度。不要过于配合，要展现出真实的防御性、推诿或解释。

[人物画像]:
- 职位: ${profile?.position || "未知"}
- 性格: ${profile?.personality || "普通"}
- 能力: ${profile?.professionalAbility || "一般"}
- 态度: ${profile?.attitude || "中立"}

[当前审计议题]:
状况: ${finding.condition}

[对话历史]:
${formatDrillHistory(history)}

请给出下一句回复。
`;
};

export const buildCommunicationAnalysisPrompt = (finding: Finding, history: DrillTurn[], userRebuttal: string) => {
    return `
# 任务：沟通策略点评
作为审计教练，请点评审计师刚才的回复是否得当，并分析被审计人的潜在心理。

[背景]:
${finding.condition}

[对话历史]:
${formatDrillHistory(history)}

[审计师的最新回应]:
"${userRebuttal}"

请点评：
1. 审计师的回应是否逻辑清晰？
2. 是否过于攻击性或过于软弱？
3. 对被审计人可能产生什么影响？
`;
};

export const buildAuditeeResponseAnalysisPrompt = (finding: Finding, history: DrillTurn[], lastTurnText: string) => {
    return `
# 任务：被审计人回复分析
被审计单位给出了最新的回复，请分析其话术背后的逻辑漏洞、转移话题的尝试或潜在的阻挠意图。

[背景]:
${finding.condition}

[对话历史]:
${formatDrillHistory(history.slice(0, -1))}

[被审计人最新回复]:
"${lastTurnText || ''}"

分析重点：
1. 对方是否在回避核心问题？
2. 是否存在逻辑矛盾？
3. 建议审计师下一句该怎么问？（请提供具体的追问话术草稿）
`;
};

export const buildGuidanceOptionsPrompt = (stageNumber: number, fieldLabel: string) => {
    return `任务：针对项目背景调查提供选项建议。\n阶段：${stageNumber} - ${fieldLabel}\n输出要求：返回一个 JSON 对象，严格遵循以下结构。\n参考 Schema：\n${JSON.stringify(GUIDANCE_OPTIONS_SCHEMA, null, 2)}`;
};
