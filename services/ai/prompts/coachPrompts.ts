
import { DrillTurn, AuditeeProfile, Finding } from '../../../types';
import { GUIDANCE_OPTIONS_SCHEMA } from '../schemas';

// ============================================================
// 新增: GuidanceContext 类型定义
// ============================================================
interface GuidanceContext {
    projectName: string;
    fieldLabel: string;
    fieldName: string;
    stageNumber: number;
    entityProfile?: {
        industry?: string;
        scale?: string;
        coreSystems?: string;
    };
    collectedData?: Record<string, any>;
}

// ============================================================
// 新增: 辅助函数 - 格式化已收集数据
// ============================================================
const formatCollectedHints = (data: Record<string, any>): string => {
    if (!data || Object.keys(data).length === 0) return "暂无";
    const hints: string[] = [];
    if (data.auditType) hints.push(`审计类型: ${Array.isArray(data.auditType) ? data.auditType.join(', ') : data.auditType}`);
    if (data.objectives) hints.push(`审计目标: ${data.objectives}`);
    if (data.knownRisks) {
        const risks = Array.isArray(data.knownRisks) ? data.knownRisks : [data.knownRisks];
        hints.push(`已识别风险: ${risks.slice(0, 3).join(', ')}${risks.length > 3 ? '...' : ''}`);
    }
    return hints.join('; ') || "暂无";
};

// ============================================================
// 新增: 辅助函数 - 智能推断行业
// ============================================================
const inferIndustry = (projectName: string, entityProfile?: any): string => {
    if (entityProfile?.industry && entityProfile.industry.trim() !== '') {
        return entityProfile.industry;
    }

    const name = projectName.toLowerCase();

    // 基建工程关键词
    if (name.includes('大厦') || name.includes('楼') || name.includes('建筑') ||
        name.includes('工程') || name.includes('施工') || name.includes('项目')) {
        return '基建工程';
    }

    // 制造业关键词
    if (name.includes('厂') || name.includes('制造') || name.includes('生产') ||
        name.includes('车间') || name.includes('设备')) {
        return '制造业';
    }

    // 互联网/科技关键词
    if (name.includes('平台') || name.includes('系统') || name.includes('app') ||
        name.includes('软件') || name.includes('科技') || name.includes('数字化')) {
        return '互联网/科技';
    }

    // 金融关键词
    if (name.includes('银行') || name.includes('金融') || name.includes('保险') ||
        name.includes('证券') || name.includes('投资')) {
        return '金融业';
    }

    // 医疗关键词
    if (name.includes('医院') || name.includes('医疗') || name.includes('医药') ||
        name.includes('健康')) {
        return '医疗健康';
    }

    return '[请补充行业信息]';
};

// --- Original Helpers ---
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

// ============================================================
// 重构: 军工级 Prompt 构建器
// 从玩具级跃升到世界顶级标准
// ============================================================
export const buildGuidanceOptionsPrompt = (context: GuidanceContext): string => {
    const {
        projectName,
        fieldLabel,
        fieldName,
        stageNumber,
        entityProfile,
        collectedData
    } = context;

    const industry = inferIndustry(projectName, entityProfile);
    const collectedHints = formatCollectedHints(collectedData || {});
    const auditType = collectedData?.auditType
        ? (Array.isArray(collectedData.auditType) ? collectedData.auditType.join(', ') : collectedData.auditType)
        : '[待补充]';

    const scale = entityProfile?.scale || '[待补充]';
    const coreSystems = entityProfile?.coreSystems || '[待补充]';

    return `# Role: Senior Audit Manager / Industry Expert
你现在的身份是一位在【${industry}】行业拥有20年经验的资深审计经理。
用户正在填写【${projectName}】项目的背景调查问卷。

# Context (项目背景)
- 行业: ${industry}
- 规模: ${scale}
- 核心系统: ${coreSystems}
- 审计类型: ${auditType}
- 已收集信息: ${collectedHints}
- 当前阶段: 第 ${stageNumber} 阶段
- 聚焦字段: ${fieldLabel} (${fieldName})

# Reasoning Chain (思维链 - 必须按此逻辑思考)
生成建议前，请先完成以下思考步骤：
1. 【领域识别】基于行业"${industry}"和审计类型"${auditType}"，识别该组合的典型风险域（3-5个核心领域）
2. 【场景映射】将风险域映射到当前阶段的具体管理环节"${fieldLabel}"，找出最相关的业务场景
3. 【具象化】将管理环节细化为可观察的业务现象（非审计动作），具体到文档、行为、数据痕迹
4. 【去审计化】严格检查：移除所有"检查/核对/抽样/验证/审阅"等审计动词，保留纯业务描述
5. 【去重排序】对比已收集信息"${collectedHints}"，剔除重复或高度相似的内容，按业务重要性排序

# Task: Smart Autocomplete (智能补全)
请基于上述行业背景和项目特征，预测用户**最可能需要填写**的 3-8 个具体业务事实。

# ⚠️ Critical Constraints (关键约束 - 违反将导致失败)
1. **业务事实，禁止审计动作**
   - ❌ 错误示例: "检查合同台账" / "核对付款记录" / "抽样测试验收单" / "验证供应商资质"
   - ✅ 正确示例: "合同台账与财务付款记录字段定义不一致，存在金额差异"
   - ✅ 正确示例: "供应商资质文件缺失法人签字页，仅提供复印件"
   - ✅ 正确示例: "隐蔽工程验收单无现场影像资料支撑，仅有文字描述"

2. **具体场景，禁止大词空话**
   - ❌ 错误示例: "合规风险" / "内控缺陷" / "操作风险" / "管理不善"
   - ✅ 正确示例(基建): "主材进场未过磅即办理入库，数量验收流于形式"
   - ✅ 正确示例(制造): "废料处置未按定额过磅，实际重量与出库记录差异达15%"
   - ✅ 正确示例(互联网): "用户数据未脱敏即导入测试环境，未做敏感字段替换"
   - ✅ 正确示例(金融): "信贷审批系统未留存评分模型计算日志，无法追溯拒绝原因"

3. **增量价值，禁止重复已知**
   - 已识别的风险域: ${collectedData?.knownRisks ? (Array.isArray(collectedData.knownRisks) ? collectedData.knownRisks.join(', ') : collectedData.knownRisks) : '无'}
   - 已填写的目标: ${collectedData?.objectives || '无'}
   - 严禁输出与上述内容重复或高度相似的建议，必须提供新的视角

4. **置信度诚实标记**
   - 如果信息充足、推理清晰、行业特征明显，标记 confidence: "high"
   - 如果部分信息缺失但可合理推断，标记 confidence: "medium" 并在explanation中说明缺失信息
   - 如果信息严重不足、无法可靠推断，标记 confidence: "low" 并在explanation中明确要求用户补充行业/审计类型信息

# Output Format (JSON Only - 严格遵循)
返回一个 JSON 对象，严格遵循以下结构:
${JSON.stringify(GUIDANCE_OPTIONS_SCHEMA, null, 2)}

重要提醒：
1. options 数组中的每一项都必须是**具体业务现象描述**，严禁出现动词开头的审计程序！
2. category 必须从以下选项中选择: "合规风险", "运营风险", "舞弊风险", "财务风险", "战略风险", "技术风险"
3. reasoningChain 必须简述你的思考过程（2-3句话）
4. 如果 confidence 为 low，请在 explanation 中明确告知用户需要补充哪些信息以获得更好的建议`;
};