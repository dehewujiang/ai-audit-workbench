
import { AuditProgram } from '../../../types';
import { AUDIT_PROGRAM_SCHEMA, FEASIBILITY_SCHEMA } from '../schemas';

// --- Helpers ---
export const simplifyProgramForAI = (program: AuditProgram): any => {
    return {
        objective: program.objective,
        procedures: program.procedures.slice(0, 40).map(p => ({ 
            id: p.id, 
            risk: p.risk, 
            riskLevel: p.riskLevel,
            control: p.control, 
            testStep: p.testStep 
        }))
    };
};

// --- Constants ---
const EXCLUSION_RULES = `严格约束：1. **禁止**生成任何关于人员分工、团队建设、预算编制的内容。2. **禁止**生成具体的时间进度表（Timeline）或日历安排。3. 这是一个纯粹的“审计执行程序”设计任务，而非“项目管理”任务。`;
const FOCUS_AREAS = `请聚焦于以下核心内容生成【审计执行方案】：1. 核心审计目标与范围界定。2. 识别关键业务风险点（固有风险与控制风险）。3. 针对上述风险的拟定审计应对策略（控制测试与实质性程序的方向）。`;

const REVISION_GUIDANCE_PROMPT = `
## 增量修订任务说明 (Incremental Revision Task)
你当前的任务不是重新开始，而是基于已有的审计程序及其衍生出的专项风险分析进行【深度修订与优化】。
`;

const ATOMICITY_INSTRUCTION = `
[CRITICAL: ATOMICITY RULE / 原子性强制规则]
你必须输出一份**完整的、独立的**审计程序快照。
1. 🚫 **绝对禁止引用**：严禁使用 "同上"、"参考原有步骤"、"执行原程序步骤 1-5"、"其余步骤不变" 等引用性描述。
2. ✅ **全量复写**：即使某些步骤没有变化，你也必须将其**完整地、逐字地**包含在本次输出中。
3. 🎯 **独立执行**：你输出的每一个 Procedure 必须包含完整的风险描述、控制措施和测试步骤。这份程序将被直接打印给审计师使用，任何省略都会导致审计失败。
`;

// --- Builders ---

export const buildAuditPlanPrompt = (
    projectName: string, 
    revisionContext?: any, 
    userInput?: string, 
    volatileContext?: string
) => {
    let prompt = `请为项目【${projectName}】设计详细的审计执行方案。\n${EXCLUSION_RULES}\n${FOCUS_AREAS}`;
    
    if (revisionContext) {
        prompt = `对现有审计程序进行增量修订。\n${EXCLUSION_RULES}\n\n[当前程序]:\n${revisionContext.currentProgram}\n\n[舞弊风险结论]:\n${revisionContext.fraudCases}\n\n[红蓝挑战建议]:\n${revisionContext.challengeResults}\n\n[审计事实发现]:\n${revisionContext.auditFindings}\n\n${ATOMICITY_INSTRUCTION}`;
    }

    // NFC 注入
    if (volatileContext || userInput) {
        prompt += `\n\n# ⚠️ 用户近期临场指令 (Volatile Context)\n(注意：以下是用户在触发此任务前的最新沟通。如果包含对本次任务的指示（如关注点、排除项），请将其作为**最高优先级**约束条件执行。)\n\n${volatileContext || ""}\n${userInput ? `User (Latest): ${userInput}` : ""}`;
    }

    return prompt;
};

export const buildRevisionSystemInstruction = (baseSysPrompt: string) => {
    return baseSysPrompt + "\n" + REVISION_GUIDANCE_PROMPT;
};

export const buildAutonomousQAPrompt = (plan: string) => {
    return `任务：将规划大纲转化为详细的可执行审计程序。输出要求：必须严格遵循以下 JSON 结构返回数据。\n参考 Schema：${JSON.stringify(AUDIT_PROGRAM_SCHEMA, null, 2)}\n输入规划大纲：${plan}\n\n${ATOMICITY_INSTRUCTION}`;
};

export const buildChallengePlanPrompt = (
    latestProgram: AuditProgram, 
    focusNote: string, 
    contextFiles: string,
    volatileContext?: string
) => {
    let prompt = `
# Role: Red Team / Malicious Insider
你现在是一名试图挪用资产或操纵报表的高级内部攻击者（如资深财务主管或采购经理）。你对业务流程和系统逻辑了如指掌。

[Information Access]
- 你的对手（现有审计程序）：${JSON.stringify(simplifyProgramForAI(latestProgram))}
- 你掌握的内部情报（制度/背景/文件）：${contextFiles || "暂无额外文件"}
- 攻击目标指引（用户指令）：${focusNote || "自由发挥，寻找最薄弱环节"}

# Task: Develop Exploit Scenarios
请不要进行常规的“文档评审”或给出建设性意见。
请利用你对业务逻辑的深刻理解，构思 3-5个具体的**攻击剧本 (Exploit Scenarios)**，演示如何绕过现有审计程序的侦测。

# Output Requirements
对于每个剧本，请包含：
1. **漏洞点 (The Vulnerability)**: 审计程序中哪个具体步骤是无效的、过于宽泛的或可被绕过的？（例如：“程序只检查了发票金额，未检查发票日期”）
2. **攻击路径 (The Attack Script)**: 第一人称描述。例如：“我知道审计师只抽查金额大于 50 万的合同，所以我将 200 万的合同拆分为 5 份...”
3. **反侦测手段 (Stealth)**: 你如何利用数据量大、系统复杂性或文档伪造来掩盖痕迹？

请集中火力寻找最致命的逻辑漏洞。
`;

    // NFC 注入
    if (volatileContext) {
        prompt += `\n\n# ⚠️ 用户近期临场指令 (Volatile Context)\n${volatileContext}`;
    }

    return prompt;
};

export const buildChallengeExecutionPrompt = (latestProgram: AuditProgram, plan: string, focusNote: string) => {
    return `# 任务：执行红蓝对抗（Red-Team Execution）\n你现在是高级恶意内部操纵者。请基于以下部署图和战术大纲，执行深入的批判分析。\n[环境部署]:\n${JSON.stringify(simplifyProgramForAI(latestProgram))}\n[既定战术大纲]:\n${plan}\n[用户特别关注点]:\n${focusNote || "无"}\n\n任务要求：1.指出逻辑死角。2.揭露可绕过路径。3.给出精准批判。`;
};

export const buildFeasibilityPrompt = (procedure: any) => {
    return `
任务：评估以下审计程序在实际执行中的可行性，并识别潜在障碍。
输出要求：返回一个 JSON 对象，严格遵循以下结构。

[待评估程序]:
- 风险: ${procedure.risk}
- 控制: ${procedure.control}
- 测试步骤: ${procedure.testStep}

参考 Schema：
${JSON.stringify(FEASIBILITY_SCHEMA, null, 2)}
`;
};
