
// 审计程序输出结构
export const AUDIT_PROGRAM_SCHEMA = {
    objective: "审计目标概述",
    procedures: [
        {
            id: "程序ID (例如 AP-01)",
            risk: "风险描述",
            riskLevel: "高/中/低 (必须严格选用这三个值之一)",
            control: "控制措施",
            testStep: "详细测试步骤"
        }
    ]
};

// 舞弊案例输出结构 (Updated: SOL-2024-FRAUD-GAP-V1)
export const FRAUD_CASES_SCHEMA = [
    {
        scenario: "舞弊场景描述",
        fraudTriangle: {
            pressure: "压力/动机",
            opportunity: "机会",
            rationalization: "借口/合理化"
        },
        potentialActors: "潜在实施者",
        redFlags: [
            { indicator: "异常指标", metric: "量化方式", threshold: "阈值" }
        ],
        detectionMethods: {
            dataAnalytics: ["数据分析方法1", "数据分析方法2"],
            documentReview: ["文档审查方法1", "文档审查方法2"]
        },
        gapAnalysis: {
            status: "COVERED | EXPOSED | PARTIALLY_COVERED (请严格选用)",
            assessment: "对现有程序是否能发现此舞弊的评估说明，如果已覆盖请引用程序ID",
            suggestedProcedure: { // 仅当 status 不为 COVERED 时需要
                risk: "针对此缺口的具体风险描述",
                control: "应补充的关键控制点",
                testStep: "建议补充的审计测试步骤"
            }
        }
    }
];

// 审计发现分析输出结构
export const FINDING_ANALYSIS_SCHEMA = {
    aiAnalysis: {
        summary: "分析总结",
        rootCauseHypotheses: [
            { category: "类别 (如: 流程设计, 执行偏差)", description: "描述", likelihood: "高/中/低" }
        ],
        systemicVsIsolated: "系统性问题 vs 孤立事件判定",
        "5WhysChain": ["现象", "原因1", "原因2", "根因"]
    },
    actionItems: [
        { text: "建议行动项1" },
        { text: "建议行动项2" }
    ]
};

// 可行性评估输出结构
export const FEASIBILITY_SCHEMA = {
    potentialDifficulties: [
        { dimension: "数据/人员/系统/流程/其他", description: "困难描述" }
    ],
    suggestedStrategies: [
        { difficulty: "对应的困难", strategy: "应对策略" }
    ]
};

// 引导式问卷选项输出结构
export const GUIDANCE_OPTIONS_SCHEMA = {
    options: ["选项1", "选项2", "选项3", "选项4", "选项5"],
    explanation: "为什么推荐这些选项的简要说明"
};
