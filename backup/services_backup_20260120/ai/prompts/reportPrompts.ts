
// --- Helpers ---
export const formatFindingsSummary = (findings: any[]): string => {
    if (!findings || findings.length === 0) return "（暂无审计发现）";
    return findings.map((f, i) => 
        `发现 ${i+1}:
- 状况: ${f.condition}
- 影响: ${f.effect}
- 根因分析: ${f.aiAnalysis?.summary || '待分析'}`
    ).join('\n');
};

// --- Builders ---

export const buildReportPlanPrompt = (
    args: {title: string, auditee: string, findings: any[]},
    volatileContext?: string
) => {
    let prompt = `
# 任务：构建审计报告大纲
请基于以下已确认的审计发现，构建一份正式的内部审计报告大纲。

[报告基础信息]:
- 标题: ${args.title}
- 被审计单位: ${args.auditee}

[核心审计发现清单]:
${formatFindingsSummary(args.findings)}

要求：大纲应包含摘要、审计范围、正文（按重要性排序的发现）、建议和结语。
`;

    if (volatileContext) {
        prompt += `\n\n# ⚠️ 用户近期临场指令\n${volatileContext}`;
    }

    return prompt;
};

export const buildReportExecutionPrompt = (args: {plan: string, findings: any[], title: string, auditee: string, auditor: string}) => {
    return `任务：根据以下审计大纲和已确认的审计发现，撰写正式的内部审计报告全文。\n[报告大纲]:\n${args.plan}\n[关键审计发现]:\n${args.findings.map((f: any, i: number) => `发现 ${i+1}: 状况(${f.condition}) | 根因(${f.aiAnalysis.summary})`).join('\n')}\n[基本信息]:\n标题: ${args.title}\n被审计单位: ${args.auditee}\n审计师: ${args.auditor}\n要求：专业、客观、严谨，符合国际内审准则 (IPPF) 的表达规范。`;
};
