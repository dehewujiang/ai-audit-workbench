
import { FINDING_ANALYSIS_SCHEMA } from '../schemas';

export const buildFindingQuestionsPrompt = (args: {condition: string, criteria: string, effect: string, cause?: string}) => {
    return `
# 任务：事实澄清提问
作为审计经理，你审阅了审计师提交的以下初步发现。请提出 3-5 个关键追问，旨在厘清事实、确认根本原因（Root Cause）和潜在影响。

[初步发现]:
- 状况: ${args.condition}
- 标准: ${args.criteria}
- 影响: ${args.effect}
- 初步归因: ${args.cause || "未填写"}

要求：问题要具体、尖锐且有助于后续的 RCA 分析。
`;
};

export const buildFindingAnalysisPlanPrompt = (
    args: {condition: string, criteria: string, effect: string, cause?: string},
    volatileContext?: string
) => {
    let prompt = `
# 任务：根本原因分析 (RCA) 规划
请针对以下审计发现，拟定一个深度挖掘根本原因的分析路径。

[发现状况]: ${args.condition}
[标准]: ${args.criteria}
[影响]: ${args.effect}
[初步原因]: ${args.cause || "未提供"}

请简述你打算如何使用 5-Whys 或 鱼骨图方法进行分析。
`;

    if (volatileContext) {
        prompt += `\n\n# ⚠️ 用户近期临场指令\n${volatileContext}`;
    }

    return prompt;
};

export const buildFindingExecutionPrompt = (args: {condition: string, criteria: string, effect: string, answers: string}) => {
    return `
# 任务：执行根本原因分析 (RCA)
请结合原始发现事实和审计师的补充回答，输出结构化的分析结果。

[原始发现]:
- 状况: ${args.condition}
- 标准: ${args.criteria}
- 影响: ${args.effect}

[审计师补充证据 (Answers)]:
${args.answers || "无补充信息"}

输出要求：返回一个 JSON 对象，严格遵循以下结构。
参考 Schema：
${JSON.stringify(FINDING_ANALYSIS_SCHEMA, null, 2)}
`;
};
