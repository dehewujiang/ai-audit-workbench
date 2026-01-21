
export type LLMProvider = 'google' | 'openrouter' | 'anthropic' | 'deepseek' | 'custom';

export interface LLMProfile {
  id: string;
  name: string;
  provider: LLMProvider;
  apiEndpoint: string;
  apiKey: string; 
  modelName: string;
  contextWindow?: number;
}

export interface EntityProfile {
  industry: string;
  scale: string;
  coreSystems: string;
  regulatoryFramework: string;
  riskAppetite: string;
  description: string;
}

export interface WorkflowStep {
  name: string;
  status: 'pending' | 'in_progress' | 'done' | 'error';
  details?: string;
}

export interface ChatMessageAction {
  text: string;
  actionId: string;
  payload?: {
    retryPayload?: {
      functionName: string;
      args: any;
    };
    draftProgram?: AuditProgram;
    reasoning?: string;
    approvedPlan?: string; 
    planContent?: string;
    focusNote?: string;
    fraudPlan?: string;
    findingPlan?: string;
    reportPlan?: string;
    [key: string]: any;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  reasoning?: string;
  timestamp: string;
  isRelevant?: boolean;
  actions?: ChatMessageAction[];
  workflowSteps?: WorkflowStep[];
  processingState?: 'generating' | 'challenging' | 'analyzingFraud' | 'analyzingFinding' | 'loading' | 'reasoning' | 'planning' | 'strategizing' | 'critiquing' | 'refining' | 'writingReport' | null;
}

export interface AuditProcedure {
  id: string;
  risk: string;
  riskLevel: '高' | '中' | '低';
  control: string;
  testStep: string;
  sourceSnippetId?: string;
}

export interface AuditProgram {
  id:string;
  createdAt: string;
  objective: string;
  procedures: AuditProcedure[];
  sourceProgramId?: string;
  revisionReason?: '挑战模式' | '舞弊分析' | '手动修订' | '初始生成' | '自主质检优化';
  reasoningContent?: string;
}

export interface FraudTriangle {
  pressure: string;
  opportunity: string;
  rationalization: string;
}

export interface RedFlag {
  indicator: string;
  metric: string;
  threshold: string;
  observedValue?: string;
}

export interface DetectionMethods {
  dataAnalytics: string[];
  documentReview: string[];
  inquiry: string[];
  observation: string[];
}

// SOL-2024-FRAUD-GAP-V1: Gap Analysis Structure
export interface GapAnalysis {
    status: 'COVERED' | 'EXPOSED' | 'PARTIALLY_COVERED';
    assessment: string; // 裁判的评语：为什么认为已覆盖或未覆盖
    suggestedProcedure?: { // 仅当 status != COVERED 时存在
        risk: string;
        control: string;
        testStep: string;
    };
}

export interface FraudCase {
  scenario: string;
  fraudTriangle: FraudTriangle;
  potentialActors: string;
  redFlags: RedFlag[];
  detectionMethods: DetectionMethods;
  gapAnalysis?: GapAnalysis; // Optional for backward compatibility
}

export interface ExecutionDifficulty {
  dimension: '数据' | '人员' | '系统' | '流程' | '其他';
  description: string;
}

export interface SuggestedStrategy {
  difficulty: string;
  strategy: string;
}

export interface FeasibilityAssessment {
  potentialDifficulties: ExecutionDifficulty[];
  suggestedStrategies: SuggestedStrategy[];
}

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  userInstruction: string;
  modelInfo: string;
  generatedProgramSnapshot: AuditProgram;
}

export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface RootCauseHypothesis {
  category: string;
  description: string;
  likelihood: '高' | '中' | '低' | '待确认';
}

export interface AIAnalysis {
  summary: string;
  rootCauseHypotheses: RootCauseHypothesis[];
  systemicVsIsolated: string;
  '5WhysChain': string[] | string;
}

export interface Finding {
  id:string;
  condition: string;
  criteria: string;
  effect: string;
  cause?: string;
  aiAnalysis: AIAnalysis;
  actionItems: ActionItem[];
  status: 'Open' | 'In Progress' | 'Closed';
  responseAnalysisHistory?: DrillTurn[];
}

export interface KnowledgeSnippet {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  projectName?: string;
  sourceId?: string;
}

export interface DrillTurn {
  actor: 'auditee' | 'user' | 'coach';
  text: string;
  isSimulated?: boolean;
}

export interface AuditeeProfile {
  position: string;
  personality: string;
  professionalAbility: string;
  attitude: string;
}

export interface Folder {
  id: string;
  name: string;
}

export interface KnowledgeFile {
  id: string;
  name: string;
  type: string;
  content: string;
  status: 'parsing' | 'success' | 'error';
  errorMessage?: string;
  folderId: string | null;
}

/**
 * 方案 PROF-2024-AFDP-001: 审计特征脱水上下文
 */
export interface DistilledContext {
    historySummary: string;       // 对 N 轮之前的对话进行的 AFDP 总结
    fraudQualitative: string;     // 舞弊分析产生的定性核心逻辑
    challengeQualitative: string; // 挑战模式产生的逻辑漏洞清单
    findingQualitative: string;   // 审计发现的根因定性总结
    lastCompressionTimestamp: string;
}

export interface AppState {
  messages: ChatMessage[];
  auditPrograms: AuditProgram[];
  auditTrail: AuditTrailEntry[];
  findings: Finding[];
  fraudAnalyses: Record<string, FraudCase[]>;
  conversationStarted: boolean;
  activeTab: 'background' | 'program' | 'workbench' | 'report' | 'snippets' | 'fraud';
  activeProgramId: string | null;
  pinnedFileIds: string[];
  generatedReportContent: string;
  reportGenerationTitle: string;
  guidanceStage: number;
  collectedGuidanceData: Record<string, any>;
  draftProgram: AuditProgram | null;
  currentAuditPlan: string | null;
  currentChallengePlan: string | null;
  lastChallengeResult: string | null;
  currentFraudPlan: string | null;
  lastFraudAnalysisResult: string | null;
  currentReportPlan: string | null;
  pendingReportConfig: { title: string, auditee: string, auditor: string, includedFindingIds: string[] } | null;
  currentFindingAnalysisPlan: string | null;
  pendingFindingData: { condition: string, criteria: string, effect: string, cause?: string, answers: string } | null;
  distilledContext?: DistilledContext; // 新增：特征提取后的上下文存储
}

export interface GlobalState {
  knowledgeFiles: KnowledgeFile[];
  folders: Folder[];
  snippets: KnowledgeSnippet[];
  rightPanelWidthPercent: number;
  actionPanelWidth: number;
  llmProfiles: LLMProfile[];
  activeLlmProfileId: string | null;
  entityProfile: EntityProfile;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  state: AppState;
}

export type AuditProgramGenerationChunk = 
  | { type: 'reasoning'; content: string }
  | { type: 'workflow_update'; steps: WorkflowStep[] }
  | { type: 'result'; content: string }
  | { type: 'json_result'; data: any }
  | { type: 'progress'; message: string }
  | { type: 'error'; message: string };

export interface FieldDiff {
  risk: string;
  control: string;
  testStep: string;
}

export interface DiffResult {
  type: 'added' | 'deleted' | 'modified' | 'unchanged';
  oldIndex?: number;
  newIndex?: number;
  oldProcedure?: AuditProcedure;
  newProcedure?: AuditProcedure;
  fieldDiffs?: FieldDiff;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

export type LoadingStateKey = 'isLoading' | 'isGenerating' | 'isAnalyzing' | 'isChallenging' | 'isAnalyzingFraud' | 'isAssessingFeasibility' | 'isGeneratingReport' | 'isCreatingProject';

export interface ProjectHandlers {
  handleSendMessage: (text: string) => void;
  handleStopGeneration: () => void;
  deleteMessage: (id: string) => void;
  editAndResubmit: (id: string, newText: string) => void;
  resendMessage: (id: string) => void;
  handleGenerateProgram: (text: string) => void;
  handleExecutePlan: (planContent: string) => void;
  handleExecuteChallenge: (planContent: string, focusNote: string) => void; 
  handleAnalyzeFraud: (userInput?: string) => void;
  handleExecuteFraudAnalysis: (planContent: string) => void;
  handleStartAnalysis: () => void;
  handleGenerateFindingQuestions: (data: { condition: string; criteria: string; effect: string; cause?: string; }) => Promise<string>;
  handleSubmitFindingAnalysis: (data: { condition: string; criteria: string; effect: string; cause?: string; answers: string }) => void;
  handleExecuteFindingAnalysis: (planContent: string) => void;
  handleUpdateProgram: (program: AuditProgram, newProcedures: AuditProcedure[]) => void;
  handleUpdateDraft: (program: AuditProgram) => void;
  handleAcceptDraft: () => void;
  switchProgramVersion: (programId: string) => void;
  handleToggleSnippet: (snippetInfo: { sourceId: string; content: string; type: string; }) => void;
  handleChallengeProgram: (focusNote: string) => void;
  handleUpdateFinding: (updatedFinding: Finding) => void;
  handleAssessFeasibility: (procedure: AuditProcedure) => void;
  handleStartCommDrill: (finding: Finding) => void;
  handleStartResponseAnalysis: (finding: Finding) => void;
  handleSimulateAuditeeResponse: (finding: Finding, history: DrillTurn[]) => Promise<string>;
  handleAnalyzeCommunication: (finding: Finding, history: DrillTurn[], userRebuttal: string) => Promise<string>;
  handleAnalyzeAuditeeResponse: (finding: Finding, history: DrillTurn[]) => Promise<string>;
  handleGenerateReportOutline: (data: { title: string, auditee: string, auditor: string, includedFindingIds: string[] }) => Promise<string>;
  handleGenerateReport: (data: { title: string, auditee: string, auditor: string, includedFindingIds: string[] }) => void;
  handleExecuteReport: (planContent: string) => void;
  handleUpdateReportContent: (content: string) => void;
  handleUpdateFraudCases: (programId: string, cases: FraudCase[]) => void;
  handleActionClick: (messageId: string, actionId: string, payload: any) => void;
  handleTogglePinFile: (fileId: string) => void;
  handleGuidanceUpdate: (formData: Record<string, any>, nextStage: number) => void;
  handleGuidanceSave: (formData: Record<string, any>) => void;
  handleDistillContext: () => Promise<void>; // 新增：手动/自动触发脱水
}

export interface ProjectContextType extends ProjectHandlers {
  projects: Project[];
  activeProject: Project | null;
  activeProjectState: AppState; 
  isLoadingState: boolean;
  switchProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  handleCreateProject: (name: string) => void;
  setActiveTab: (tab: AppState['activeTab']) => void;
}
