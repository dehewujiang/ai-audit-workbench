
import { useCallback, useRef } from 'react';
import { 
    Project, AuditProgram, AuditProcedure, ChatMessage, Finding, FraudCase, DrillTurn, 
    LoadingStateKey, ProjectHandlers, KnowledgeSnippet, DistilledContext 
} from '../types';
import { useAuth } from '../AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useAudit } from '../contexts/AuditContext';
import { useGlobal } from '../contexts/GlobalContext';
import { useUI } from '../contexts/UIContext';
import * as aiService from '../services/aiService';
import { calculateMessagesTokens, THRESHOLDS } from '../utils/tokenUtils';

export const useProjectHandlers = (activeProject: Project | null): ProjectHandlers => {
    const { user } = useAuth();
    const chatCtx = useChat();
    const auditCtx = useAudit();
    const globalCtx = useGlobal();
    const { 
        showModal, closeModal, setNotification,
        setSelectedFinding, setCurrentAssessment, setAssessmentError,
        currentAuditeeProfile, setLoadingState: setUILoadingState,
        setSelectedItemId 
    } = useUI();

    // PROF-FIX: 修正了 AbortController 的拼写错误
    const abortControllerRef = useRef<AbortController | null>(null);

    // PROF-2024-NFC-001: 提取近场上下文 (Near-Field Context)
    // 获取最近 N 条对话记录（排除 System 消息，仅保留 User/Model）
    const getVolatileContext = useCallback((count: number = 4): string => {
        const history = chatCtx.messages
            // FIX: ChatMessage role is typed as 'user' | 'model', so checking for 'system' causes a type error.
            .filter(m => m.id !== 'init' && !m.id.startsWith('init-'))
            .slice(-count);
        
        if (history.length === 0) return "";

        return history.map(m => {
            // 简单的文本清洗，移除过长的思考过程
            const content = m.text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            const role = m.role === 'user' ? 'User' : 'Assistant';
            return `${role}: ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`;
        }).join('\n\n');
    }, [chatCtx.messages]);

    const finalizeMsgProcess = useCallback((msgId: string, loadingKey: LoadingStateKey, errorMsg?: string, retryPayload?: any) => {
        chatCtx.setLoadingState(loadingKey, false);
        chatCtx.updateMessage(msgId, msg => ({
            ...msg,
            processingState: null,
            ...(errorMsg ? { 
                text: msg.text + (msg.text ? "\n\n" : "") + `⚠️ **操作中断**: ${errorMsg}`,
                actions: retryPayload ? [{ text: '重新执行', actionId: 'retry', payload: { retryPayload } }] : msg.actions
            } : {})
        }));

        // PROF-2024-AFDP-001: 对话结束后触发特征提取检查
        if (!errorMsg) {
            handleAutoDistillCheck();
        }
    }, [chatCtx]);

    /**
     * 自动特征提取检查
     */
    const handleAutoDistillCheck = useCallback(async () => {
        const currentTokens = calculateMessagesTokens(chatCtx.messages.map(m => ({ role: m.role, content: m.text })));
        
        // 如果达到 L0 警戒线，且最近没有提取过，执行提取
        if (currentTokens > THRESHOLDS.L0_CLEAN) {
            console.log("Context Pressure High. Triggering AFDP Distillation...");
            await handleDistillContext();
        }
    }, [chatCtx.messages]);

    const handleDistillContext = useCallback(async () => {
        if (!user) return;
        
        try {
            // 对除最近 3 轮以外的消息进行脱水
            const messagesToDistill = chatCtx.messages.slice(0, -6).map(m => ({ role: m.role, content: m.text }));
            if (messagesToDistill.length < 2) return;

            const summary = await aiService.distillContextTask({
                messages: messagesToDistill,
                llmProfile: globalCtx.activeLlmProfile,
                user
            });

            const newDistilled: DistilledContext = {
                historySummary: summary,
                fraudQualitative: auditCtx.lastFraudAnalysisResult || "",
                challengeQualitative: auditCtx.lastChallengeResult || "",
                findingQualitative: auditCtx.findings.map(f => f.aiAnalysis.summary).join('; '),
                lastCompressionTimestamp: new Date().toISOString()
            };

            auditCtx.updateAuditState({ distilledContext: newDistilled });
            console.log("AFDP Distillation Success.");
        } catch (e) {
            console.error("AFDP Distillation Failed:", e);
        }
    }, [user, chatCtx.messages, globalCtx.activeLlmProfile, auditCtx]);

    const buildContextString = useCallback(() => {
        if (!auditCtx.pinnedFileIds.length) return '';
        const pinnedFiles = globalCtx.globalState.knowledgeFiles.filter(f => auditCtx.pinnedFileIds.includes(f.id) && f.status === 'success');
        return aiService.buildContextStringFromFiles(pinnedFiles);
    }, [auditCtx.pinnedFileIds, globalCtx.globalState.knowledgeFiles]);

    const handleProgressChunk = useCallback((modelMsgId: string, message: string) => {
        chatCtx.updateMessage(modelMsgId, msg => {
            const steps = [...(msg.workflowSteps || [])];
            const activeIdx = steps.findIndex(s => s.status === 'in_progress');
            if (activeIdx !== -1) steps[activeIdx] = { ...steps[activeIdx], details: message };
            return { ...msg, workflowSteps: steps };
        });
    }, [chatCtx]);

    const getRevisionArtifacts = useCallback(() => {
        const activeProg = auditCtx.auditPrograms.find(p => p.id === auditCtx.activeProgramId);
        if (!activeProg) return null;
        const fraudCases = auditCtx.fraudAnalyses[activeProg.id] || [];
        const fraudCasesText = fraudCases.length > 0 
            ? fraudCases.map((c, i) => `[案例 ${i+1}] 场景: ${c.scenario}\n手法: ${c.potentialActors} 利用 ${c.fraudTriangle.opportunity}`).join('\n---\n')
            : "";
        const combinedFraudContext = `
[舞弊定性分析结论]:
${auditCtx.lastFraudAnalysisResult || "未提供文字总结"}

[识别到的具体场景]:
${fraudCasesText || "未生成具体场景"}
        `.trim();
        const findingsText = auditCtx.findings.length > 0
            ? auditCtx.findings.map((f, i) => `[已确认发现 ${i+1}] 状况: ${f.condition}\n影响: ${f.effect}\nAI RCA分析结论: ${f.aiAnalysis.summary}`).join('\n---\n')
            : "";
        return {
            currentProgram: JSON.stringify({objective: activeProg.objective, procedures: activeProg.procedures.slice(0, 40)}),
            fraudCases: combinedFraudContext,
            challengeResults: auditCtx.lastChallengeResult || "",
            auditFindings: findingsText
        };
    }, [auditCtx.auditPrograms, auditCtx.activeProgramId, auditCtx.fraudAnalyses, auditCtx.lastChallengeResult, auditCtx.findings, auditCtx.lastFraudAnalysisResult]);

    const deleteMessage = useCallback((id: string) => chatCtx.deleteMessage(id), [chatCtx]);
    const editAndResubmit = useCallback((id: string, newText: string) => {
        const index = chatCtx.messages.findIndex(m => m.id === id);
        if (index === -1) return;
        const messagesToKeep = chatCtx.messages.slice(0, index);
        chatCtx.setMessages(messagesToKeep);
        handleSendMessage(newText);
    }, [chatCtx]);

    const handleAcceptDraft = useCallback(() => {
        if (!auditCtx.draftProgram) return;
        const newProgram = { ...auditCtx.draftProgram, id: `prog-${Date.now()}` };
        auditCtx.setAuditPrograms(prev => [...prev, newProgram]);
        auditCtx.setActiveProgramId(newProgram.id);
        auditCtx.updateAuditState({ draftProgram: null });
        chatCtx.addMessage({ role: 'model', text: `✅ 审计程序已入库。` });
        auditCtx.setActiveTab('program');
        closeModal();
    }, [auditCtx, chatCtx, closeModal]);

    const handleAnalyzeAuditeeResponse = useCallback(async (finding: Finding, history: DrillTurn[]) => {
        const controller = new AbortController(); abortControllerRef.current = controller;
        const stream = aiService.analyzeAuditeeResponseStream({ finding, history, signal: controller.signal, entityProfile: globalCtx.globalState.entityProfile, projectName: activeProject?.name || '项目', llmProfile: globalCtx.activeLlmProfile || undefined, user, collectedGuidanceData: auditCtx.collectedGuidanceData });
        let text = ""; for await (const chunk of stream) text += chunk.text;
        return text;
    }, [user, globalCtx, activeProject, auditCtx.collectedGuidanceData]);

    const handleAnalyzeCommunication = useCallback(async (finding: Finding, history: DrillTurn[], userRebuttal: string) => {
        const controller = new AbortController(); abortControllerRef.current = controller;
        const stream = aiService.analyzeCommunicationStream({ finding, history, userRebuttal, auditeeProfile: currentAuditeeProfile, signal: controller.signal, entityProfile: globalCtx.globalState.entityProfile, projectName: activeProject?.name || '项目', llmProfile: globalCtx.activeLlmProfile || undefined, user, collectedGuidanceData: auditCtx.collectedGuidanceData });
        let text = ""; for await (const chunk of stream) text += chunk.text;
        return text;
    }, [user, currentAuditeeProfile, globalCtx, activeProject, auditCtx.collectedGuidanceData]);

    const handleAnalyzeFraud = useCallback(async (userInput: string = "") => {
        if (!user) return; closeModal();
        const activeProgram = auditCtx.auditPrograms.find(p => p.id === auditCtx.activeProgramId);
        if (!activeProgram) { setNotification({ message: '无可用程序。', type: 'error' }); return; }
        
        // PROF-2024-FRAUD-REDTEAM-V2: 组装上下文
        const contextString = buildContextString();
        // PROF-2024-NFC-001: 获取近场上下文
        const volatileContext = getVolatileContext();
        
        chatCtx.addMessage({ role: 'user', text: userInput || '开始舞弊风险分析' });
        chatCtx.setLoadingState('isAnalyzingFraud', true);
        const modelMsgId = chatCtx.addMessage({ role: 'model', text: '', processingState: 'reasoning' });
        const controller = new AbortController(); abortControllerRef.current = controller;
        try {
            const stream = aiService.generateFraudPlanStream({ 
                program: activeProgram, 
                userInput, 
                longTextContext: contextString, // 注入文件上下文
                volatileContext, // 注入近场对话上下文
                signal: controller.signal, 
                entityProfile: globalCtx.globalState.entityProfile, 
                projectName: activeProject?.name || '项目', 
                llmProfile: globalCtx.activeLlmProfile || undefined, 
                user, 
                collectedGuidanceData: auditCtx.collectedGuidanceData 
            });
            let acc = "";
            for await (const chunk of stream) {
                if (chunk.type === 'reasoning') chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, reasoning: (msg.reasoning || '') + chunk.content }));
                if (chunk.type === 'result') { acc += chunk.content; chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, text: acc })); }
                if (chunk.type === 'workflow_update') chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, workflowSteps: chunk.steps }));
            }
            auditCtx.updateAuditState({ currentFraudPlan: acc });
            chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, processingState: null, actions: [{ text: '💡 执行分析', actionId: 'execute_fraud_analysis', payload: { fraudPlan: acc } }] }));
        } catch(e) { finalizeMsgProcess(modelMsgId, 'isAnalyzingFraud', (e as Error).message); }
    }, [user, auditCtx, chatCtx, globalCtx, activeProject, closeModal, setNotification, finalizeMsgProcess, buildContextString, getVolatileContext]);

    const handleAssessFeasibility = useCallback(async (procedure: AuditProcedure) => {
        showModal('feasibility'); setCurrentAssessment(null); setAssessmentError(null); setUILoadingState('isAssessingFeasibility', true);
        const controller = new AbortController(); abortControllerRef.current = controller;
        try {
            const stream = aiService.assessFeasibilityStream({ procedure, signal: controller.signal, entityProfile: globalCtx.globalState.entityProfile, projectName: activeProject?.name || '项目', llmProfile: globalCtx.activeLlmProfile || undefined, user, collectedGuidanceData: auditCtx.collectedGuidanceData });
            for await (const chunk of stream) { if (chunk?.data) setCurrentAssessment(chunk.data); }
        } catch(e) { setAssessmentError((e as Error).message); } finally { setUILoadingState('isAssessingFeasibility', false); }
    }, [user, globalCtx, activeProject, showModal, setCurrentAssessment, setAssessmentError, setUILoadingState, auditCtx.collectedGuidanceData]);

    const handleChallengeProgram = useCallback(async (focusNote: string) => {
        if (!user) return; closeModal();
        const latestProgram = auditCtx.auditPrograms.find(p => p.id === auditCtx.activeProgramId);
        if (!latestProgram) return;
        
        // PROF-REDTEAM-HACKER-MODE-002: Inject Context (Files + Note)
        const contextString = buildContextString();
        // PROF-2024-NFC-001: 获取近场上下文
        const volatileContext = getVolatileContext();
        
        chatCtx.addMessage({ role: 'user', text: `启动挑战者模式${focusNote ? `，重点关注：${focusNote}` : ''}` });
        chatCtx.setLoadingState('isChallenging', true);
        const modelMsgId = chatCtx.addMessage({ role: 'model', text: '', processingState: 'strategizing' });
        const controller = new AbortController(); abortControllerRef.current = controller;
        
        try {
            // Updated call with new parameters
            const stream = aiService.generateChallengePlanStream({ 
                latestProgram, 
                focusNote, 
                longTextContext: contextString, // Pass the built context
                volatileContext, // Pass near-field context
                signal: controller.signal, 
                entityProfile: globalCtx.globalState.entityProfile, 
                projectName: activeProject?.name || '项目', 
                llmProfile: globalCtx.activeLlmProfile || undefined, 
                user, 
                collectedGuidanceData: auditCtx.collectedGuidanceData 
            });
            
            let acc = "";
            for await (const chunk of stream) {
                if (chunk.type === 'reasoning') chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, reasoning: (msg.reasoning || '') + chunk.content }));
                if (chunk.type === 'result') { acc += chunk.content; chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, text: acc })); }
            }
            auditCtx.updateAuditState({ currentChallengePlan: acc });
            chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, processingState: null, actions: [{ text: '⚔️ 执行挑战', actionId: 'execute_challenge', payload: { planContent: acc, focusNote } }] }));
        } catch(e) { finalizeMsgProcess(modelMsgId, 'isChallenging', (e as Error).message); }
    }, [user, auditCtx, chatCtx, globalCtx, activeProject, closeModal, buildContextString, finalizeMsgProcess, getVolatileContext]);

    const handleExecuteChallenge = useCallback(async (planContent: string, focusNote: string) => {
        if (!user) return;
        const latestProgram = auditCtx.auditPrograms.find(p => p.id === auditCtx.activeProgramId);
        if (!latestProgram) return;
        auditCtx.updateAuditState({ currentChallengePlan: null });
        chatCtx.setLoadingState('isChallenging', true);
        const modelMsgId = chatCtx.addMessage({ role: 'model', text: '', processingState: 'challenging' });
        const controller = new AbortController(); abortControllerRef.current = controller;
        try {
            const stream = aiService.executeChallengeQAStream({ latestProgram, plan: planContent, focusNote, longTextContext: buildContextString(), signal: controller.signal, entityProfile: globalCtx.globalState.entityProfile, projectName: activeProject?.name || '项目', llmProfile: globalCtx.activeLlmProfile || undefined, user, collectedGuidanceData: auditCtx.collectedGuidanceData });
            let acc = "";
            for await (const chunk of stream) {
                if (chunk.type === 'reasoning') chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, reasoning: (msg.reasoning || '') + chunk.content }));
                if (chunk.type === 'result') { acc += chunk.content; chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, text: acc })); }
            }
            auditCtx.updateAuditState({ lastChallengeResult: acc });
            finalizeMsgProcess(modelMsgId, 'isChallenging');
        } catch (e) { finalizeMsgProcess(modelMsgId, 'isChallenging', (e as Error).message); }
    }, [user, auditCtx, chatCtx, globalCtx, activeProject, buildContextString, finalizeMsgProcess]);

    const handleExecuteFindingAnalysis = useCallback(async (planContent: string) => {
        if (!user || !auditCtx.pendingFindingData) return;
        auditCtx.updateAuditState({ currentFindingAnalysisPlan: null });
        chatCtx.setLoadingState('isAnalyzing', true);
        const modelMsgId = chatCtx.addMessage({ role: 'model', text: '🤖 正在分析 RCA...', processingState: 'analyzingFinding' });
        const controller = new AbortController(); abortControllerRef.current = controller;
        try {
            const stream = aiService.executeFindingAnalysisQAStream({ ...auditCtx.pendingFindingData, plan: planContent, longTextContext: buildContextString(), signal: controller.signal, entityProfile: globalCtx.globalState.entityProfile, projectName: activeProject?.name || '项目', llmProfile: globalCtx.activeLlmProfile || undefined, user, collectedGuidanceData: auditCtx.collectedGuidanceData });
            let resultData = null;
            for await (const chunk of stream) {
                if (chunk.type === 'reasoning') chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, reasoning: (msg.reasoning || '') + chunk.content }));
                if (chunk.type === 'workflow_update') chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, workflowSteps: chunk.steps })); // PROF-FIX-003: Added workflow update
                if (chunk.type === 'json_result') resultData = chunk.data;
            }
            if (resultData) {
                const newFindingId = `finding-${Date.now()}`;
                auditCtx.addFinding({ id: newFindingId, ...auditCtx.pendingFindingData, aiAnalysis: resultData.aiAnalysis, actionItems: resultData.actionItems.map((item: any, i: number) => ({ id: `act-${i}`, text: item.text, completed: false })), status: 'Open', responseAnalysisHistory: [] });
                
                // PROF-FIX-003: Explicit Success State Update
                chatCtx.updateMessage(modelMsgId, msg => ({
                    ...msg,
                    text: '✅ 根本原因分析已完成，已记入工作底稿。',
                    processingState: null,
                    actions: [{ text: '🚩 查看详情', actionId: 'view_finding', payload: { findingId: newFindingId } }]
                }));

                auditCtx.setActiveTab('workbench');
                finalizeMsgProcess(modelMsgId, 'isAnalyzing');
            }
        } catch(e) { finalizeMsgProcess(modelMsgId, 'isAnalyzing', (e as Error).message); }
    }, [user, auditCtx, chatCtx, globalCtx, activeProject, buildContextString, finalizeMsgProcess]);

    const handleExecuteFraudAnalysis = useCallback(async (planContent: string) => {
        if (!user) return;
        const activeProgram = auditCtx.auditPrograms.find(p => p.id === auditCtx.activeProgramId);
        if (!activeProgram) return;
        auditCtx.updateAuditState({ currentFraudPlan: null });
        chatCtx.setLoadingState('isAnalyzingFraud', true);
        const modelMsgId = chatCtx.addMessage({ role: 'model', text: '🤖 正在深度分析舞弊场景...', processingState: 'analyzingFraud' });
        const controller = new AbortController(); abortControllerRef.current = controller;
        try {
            const stream = aiService.executeFraudAnalysisQAStream({ program: activeProgram, plan: planContent, longTextContext: buildContextString(), signal: controller.signal, entityProfile: globalCtx.globalState.entityProfile, projectName: activeProject?.name || '项目', llmProfile: globalCtx.activeLlmProfile || undefined, user, collectedGuidanceData: auditCtx.collectedGuidanceData });
            let cases = null;
            let reasoningAcc = ""; 
            for await (const chunk of stream) {
                if (chunk.type === 'reasoning') {
                    reasoningAcc += chunk.content;
                    chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, reasoning: reasoningAcc }));
                }
                if (chunk.type === 'json_result') cases = chunk.data;
            }
            if (cases) {
                auditCtx.setFraudAnalyses(prev => ({ ...prev, [activeProgram.id]: cases! }));
                auditCtx.updateAuditState({ lastFraudAnalysisResult: reasoningAcc });
                chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, processingState: null, text: '✅ **舞弊分析已完成**。' }));
                auditCtx.setActiveTab('fraud');
                finalizeMsgProcess(modelMsgId, 'isAnalyzingFraud');
            }
        } catch (e) { finalizeMsgProcess(modelMsgId, 'isAnalyzingFraud', (e as Error).message); }
    }, [user, auditCtx, chatCtx, globalCtx, activeProject, buildContextString, finalizeMsgProcess]);

    const handleExecutePlan = useCallback(async (planContent: string) => {
        auditCtx.updateAuditState({ currentAuditPlan: null });
        chatCtx.setLoadingState('isGenerating', true);
        const modelMsgId = chatCtx.addMessage({ role: 'model', text: '🤖 正在生成程序草稿...', processingState: 'generating' });
        const controller = new AbortController(); abortControllerRef.current = controller;
        try {
            const stream = aiService.executeAutonomousQualityAssuranceStream({ plan: planContent, longTextContext: buildContextString(), signal: controller.signal, user, collectedGuidanceData: auditCtx.collectedGuidanceData, entityProfile: globalCtx.globalState.entityProfile, projectName: activeProject?.name || '项目', llmProfile: globalCtx.activeLlmProfile || undefined });
            let programData = null;
            for await (const chunk of stream) {
                if (chunk.type === 'reasoning') chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, reasoning: (msg.reasoning || '') + chunk.content }));
                if (chunk.type === 'workflow_update') chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, workflowSteps: chunk.steps })); // PROF-FIX-003: Added workflow update
                if (chunk.type === 'json_result') programData = chunk.data;
            }
            if (programData) {
                auditCtx.updateAuditState({ draftProgram: { ...programData, id: `draft-${Date.now()}`, createdAt: new Date().toISOString() } });
                
                // PROF-FIX-003: Explicit Success State Update
                chatCtx.updateMessage(modelMsgId, msg => ({
                    ...msg,
                    text: '✅ 审计程序草稿已生成，请审查。',
                    processingState: null,
                    actions: [{ text: '📊 审查草稿', actionId: 'review_draft', payload: { } }]
                }));

                showModal('draftReview');
                finalizeMsgProcess(modelMsgId, 'isGenerating');
            }
        } catch (e) { finalizeMsgProcess(modelMsgId, 'isGenerating', (e as Error).message); }
    }, [user, auditCtx, chatCtx, globalCtx, activeProject, buildContextString, showModal, finalizeMsgProcess]);

    const handleExecuteReport = useCallback(async (planContent: string) => {
        if (!user || !auditCtx.pendingReportConfig) return;
        const selectedFindings = auditCtx.findings.filter(f => auditCtx.pendingReportConfig?.includedFindingIds.includes(f.id));
        auditCtx.updateAuditState({ currentReportPlan: null });
        chatCtx.setLoadingState('isGeneratingReport', true);
        const modelMsgId = chatCtx.addMessage({ role: 'model', text: '', processingState: 'writingReport' });
        const controller = new AbortController(); abortControllerRef.current = controller;
        try {
            const stream = aiService.executeReportQAStream({ ...auditCtx.pendingReportConfig, findings: selectedFindings, plan: planContent, signal: controller.signal, entityProfile: globalCtx.globalState.entityProfile, projectName: activeProject?.name || '项目', llmProfile: globalCtx.activeLlmProfile || undefined, user, collectedGuidanceData: auditCtx.collectedGuidanceData });
            let acc = "";
            for await (const chunk of stream) {
                if (chunk.type === 'reasoning') chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, reasoning: (msg.reasoning || '') + chunk.content }));
                if (chunk.type === 'result') { acc += chunk.content; auditCtx.setGeneratedReportContent(acc); }
            }
            auditCtx.setActiveTab('report');
            finalizeMsgProcess(modelMsgId, 'isGeneratingReport');
        } catch (e) { finalizeMsgProcess(modelMsgId, 'isGeneratingReport', (e as Error).message); }
    }, [user, auditCtx, chatCtx, globalCtx, activeProject, finalizeMsgProcess]);

    const handleGenerateFindingQuestions = useCallback(async (data: any) => {
        const controller = new AbortController(); abortControllerRef.current = controller;
        const stream = aiService.generateFindingQuestionsStream({ ...data, signal: controller.signal, entityProfile: globalCtx.globalState.entityProfile, projectName: activeProject?.name || '项目', llmProfile: globalCtx.activeLlmProfile || undefined, user, collectedGuidanceData: auditCtx.collectedGuidanceData });
        let res = ""; for await (const chunk of stream) res += chunk.text;
        return res;
    }, [user, globalCtx, activeProject, auditCtx.collectedGuidanceData]);

    const handleGenerateProgram = useCallback(async (userInput: string = "") => {
        const isRevision = auditCtx.auditPrograms.length > 0;
        // PROF-2024-NFC-001: 获取近场上下文
        const volatileContext = getVolatileContext();
        
        chatCtx.addMessage({ role: 'user', text: isRevision ? `修订：${userInput}` : userInput || '生成审计程序' });
        chatCtx.setLoadingState('isGenerating', true);
        const modelMsgId = chatCtx.addMessage({ role: 'model', text: '', processingState: 'planning' });
        const controller = new AbortController(); abortControllerRef.current = controller;
        try {
            const stream = aiService.generateAuditPlanStream({ 
                signal: controller.signal, 
                user, 
                collectedGuidanceData: auditCtx.collectedGuidanceData, 
                entityProfile: globalCtx.globalState.entityProfile, 
                projectName: activeProject?.name || '项目', 
                llmProfile: globalCtx.activeLlmProfile || undefined, 
                revisionContext: isRevision ? getRevisionArtifacts() : null,
                userInput, // 传入当前用户指令
                volatileContext // 传入近场对话上下文
            });
            let acc = '';
            for await (const chunk of stream) {
                if (chunk.type === 'reasoning') chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, reasoning: (msg.reasoning || '') + chunk.content }));
                if (chunk.type === 'result') { acc += chunk.content; chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, text: acc })); }
            }
            auditCtx.updateAuditState({ currentAuditPlan: acc });
            chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, processingState: null, actions: [{ text: '✅ 批准并生成详细程序', actionId: 'approve_plan', payload: { approvedPlan: acc } }] }));
            finalizeMsgProcess(modelMsgId, 'isGenerating');
        } catch (e) { finalizeMsgProcess(modelMsgId, 'isGenerating', (e as Error).message); }
    }, [user, auditCtx, chatCtx, globalCtx, activeProject, getRevisionArtifacts, finalizeMsgProcess, getVolatileContext]);

    const handleGenerateReport = useCallback((data: any) => {
        closeModal(); 
        const selectedFindings = auditCtx.findings.filter(f => data.includedFindingIds.includes(f.id));
        const volatileContext = getVolatileContext();

        auditCtx.updateAuditState({ pendingReportConfig: data, reportGenerationTitle: data.title });
        chatCtx.addMessage({ role: 'user', text: `生成报告：${data.title}` });
        chatCtx.setLoadingState('isGeneratingReport', true);
        const modelMsgId = chatCtx.addMessage({ role: 'model', text: '', processingState: 'planning' });
        const controller = new AbortController(); abortControllerRef.current = controller;
        (async () => {
            try {
                const stream = aiService.generateReportPlanStream({ 
                    ...data, 
                    findings: selectedFindings, 
                    signal: controller.signal, 
                    entityProfile: globalCtx.globalState.entityProfile, 
                    projectName: activeProject?.name || '项目', 
                    llmProfile: globalCtx.activeLlmProfile || undefined, 
                    user, 
                    collectedGuidanceData: auditCtx.collectedGuidanceData,
                    volatileContext
                });
                let acc = "";
                for await (const chunk of stream) {
                    if (chunk.type === 'reasoning') chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, reasoning: (msg.reasoning || '') + chunk.content }));
                    if (chunk.type === 'result') { acc += chunk.content; chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, text: acc })); }
                }
                auditCtx.updateAuditState({ currentReportPlan: acc });
                chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, processingState: null, actions: [{ text: '📝 撰写全文', actionId: 'execute_report', payload: { reportPlan: acc } }] }));
                finalizeMsgProcess(modelMsgId, 'isGeneratingReport');
            } catch (e) { finalizeMsgProcess(modelMsgId, 'isGeneratingReport', (e as Error).message); }
        })();
    }, [user, auditCtx, chatCtx, globalCtx, activeProject, closeModal, finalizeMsgProcess, getVolatileContext]);

    const handleSendMessage = useCallback((text: string) => {
        chatCtx.addMessage({ role: 'user', text });
        const controller = new AbortController(); abortControllerRef.current = controller;
        chatCtx.setLoadingState('isLoading', true);
        const modelMsgId = chatCtx.addMessage({ role: 'model', text: '', processingState: 'loading' });
        (async () => {
            let fullText = '';
            try {
                const stream = aiService.continueConversationStream({ 
                    messages: chatCtx.messages.concat([{role: 'user', id: 'temp', text, timestamp: ''}]).map(m => ({ role: m.role, content: m.text })), 
                    longTextContext: buildContextString(), 
                    signal: controller.signal, 
                    collectedGuidanceData: auditCtx.collectedGuidanceData, 
                    entityProfile: globalCtx.globalState.entityProfile, 
                    user, 
                    projectName: activeProject?.name || '项目', 
                    llmProfile: globalCtx.activeLlmProfile || undefined,
                    distilledContext: auditCtx.distilledContext // 注入特征脱水上下文
                });
                for await (const chunk of stream) {
                    // PROF-FIX-DATA-ROUTING-001: Mutually Exclusive Routing
                    // Ensure reasoning chunks are ONLY routed to the reasoning field
                    // and content chunks are ONLY routed to the text field.
                    if (chunk.type === 'reasoning') {
                        chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, reasoning: (msg.reasoning || '') + chunk.text }));
                    } else if (chunk.text) { 
                        // Only process text if it's NOT reasoning (implicit 'content' type or undefined type treated as content)
                        fullText += chunk.text; 
                        chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, text: fullText })); 
                    }
                }
                finalizeMsgProcess(modelMsgId, 'isLoading');
            } catch (e) { finalizeMsgProcess(modelMsgId, 'isLoading', (e as Error).message); }
        })();
    }, [user, chatCtx, auditCtx, globalCtx, activeProject, buildContextString, finalizeMsgProcess]);

    const handleSimulateAuditeeResponse = useCallback(async (finding: Finding, history: DrillTurn[]) => {
        const controller = new AbortController(); abortControllerRef.current = controller;
        const stream = aiService.simulateAuditeeResponseStream({ finding, history, auditeeProfile: currentAuditeeProfile, signal: controller.signal, entityProfile: globalCtx.globalState.entityProfile, projectName: activeProject?.name || '项目', llmProfile: globalCtx.activeLlmProfile || undefined, user, collectedGuidanceData: auditCtx.collectedGuidanceData });
        let text = ""; for await (const chunk of stream) text += chunk.text;
        return text;
    }, [user, currentAuditeeProfile, globalCtx, activeProject, auditCtx.collectedGuidanceData]);

    const handleStartAnalysis = useCallback(() => showModal('finding'), [showModal]);
    const handleStopGeneration = useCallback(() => { if (abortControllerRef.current) abortControllerRef.current.abort(); }, []);
    
    const handleSubmitFindingAnalysis = useCallback((data: any) => {
        closeModal(); auditCtx.updateAuditState({ pendingFindingData: data });
        const volatileContext = getVolatileContext();
        
        chatCtx.addMessage({ role: 'user', text: `分析发现：${data.condition}` });
        chatCtx.setLoadingState('isAnalyzing', true);
        const modelMsgId = chatCtx.addMessage({ role: 'model', text: '', processingState: 'planning' });
        const controller = new AbortController(); abortControllerRef.current = controller;
        (async () => {
            try {
                const stream = aiService.generateFindingAnalysisPlanStream({ 
                    ...data, 
                    signal: controller.signal, 
                    entityProfile: globalCtx.globalState.entityProfile, 
                    projectName: activeProject?.name || '项目', 
                    llmProfile: globalCtx.activeLlmProfile || undefined, 
                    user, 
                    collectedGuidanceData: auditCtx.collectedGuidanceData,
                    volatileContext 
                });
                let acc = "";
                for await (const chunk of stream) {
                    if (chunk.type === 'reasoning') chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, reasoning: (msg.reasoning || '') + chunk.content }));
                    if (chunk.type === 'result') { acc += chunk.content; chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, text: acc })); }
                }
                auditCtx.updateAuditState({ currentFindingAnalysisPlan: acc });
                chatCtx.updateMessage(modelMsgId, msg => ({ ...msg, processingState: null, actions: [{ text: '🚩 执行RCA分析', actionId: 'execute_finding_analysis', payload: { findingPlan: acc } }] }));
                finalizeMsgProcess(modelMsgId, 'isAnalyzing');
            } catch (e) { finalizeMsgProcess(modelMsgId, 'isAnalyzing', (e as Error).message); }
        })();
    }, [user, auditCtx, chatCtx, globalCtx, activeProject, closeModal, finalizeMsgProcess, getVolatileContext]);

    const handleToggleSnippet = useCallback(({ sourceId, content, type }: any) => {
        const exists = globalCtx.globalState.snippets.some(s => s.sourceId === sourceId);
        globalCtx.updateGlobalState(prev => ({ ...prev, snippets: exists ? prev.snippets.filter(s => s.sourceId !== sourceId) : [...prev.snippets, { id: `snip-${Date.now()}`, content, type, createdAt: new Date().toISOString(), projectName: activeProject?.name, sourceId }] }));
    }, [globalCtx, activeProject]);

    const handleActionClick = useCallback((messageId: string, actionId: string, payload: any) => {
        if (actionId === 'approve_plan') handleExecutePlan(payload.approvedPlan);
        else if (actionId === 'execute_challenge') handleExecuteChallenge(payload.planContent, payload.focusNote);
        else if (actionId === 'execute_fraud_analysis') handleExecuteFraudAnalysis(payload.fraudPlan);
        else if (actionId === 'execute_finding_analysis') handleExecuteFindingAnalysis(payload.findingPlan);
        else if (actionId === 'execute_report') handleExecuteReport(payload.reportPlan);
        else if (actionId === 'review_draft') showModal('draftReview');
        // PROF-FIX-003: Added view_finding handler
        else if (actionId === 'view_finding') {
            auditCtx.setActiveTab('workbench');
            setSelectedItemId(`finding-${payload.findingId}`);
        }
    }, [handleExecutePlan, handleExecuteChallenge, handleExecuteFraudAnalysis, handleExecuteFindingAnalysis, handleExecuteReport, showModal, setSelectedItemId, auditCtx.setActiveTab]);

    const handleGuidanceUpdate = useCallback((d: any, n: number) => { auditCtx.updateAuditState({ collectedGuidanceData: {...auditCtx.collectedGuidanceData, ...d}, guidanceStage: n }); }, [auditCtx]);
    const handleGuidanceSave = useCallback((d: any) => { auditCtx.setCollectedGuidanceData(prev => ({...prev, ...d})); }, [auditCtx]);
    const handleUpdateProgram = useCallback((program: AuditProgram, newProcedures: AuditProcedure[]) => { auditCtx.updateProgram({ ...program, procedures: newProcedures }); }, [auditCtx]);

    return {
        handleSendMessage, handleStopGeneration, deleteMessage, editAndResubmit,
        resendMessage: (id: string) => { const msg = chatCtx.messages.find(m => m.id === id); if (msg?.role === 'user') editAndResubmit(id, msg.text); },
        handleGenerateProgram, handleExecutePlan, handleUpdateProgram, 
        handleUpdateDraft: (p: AuditProgram) => auditCtx.updateAuditState({ draftProgram: p }),
        handleAcceptDraft, switchProgramVersion: (id: string) => auditCtx.setActiveProgramId(id),
        handleToggleSnippet, handleChallengeProgram, handleExecuteChallenge, handleAnalyzeFraud, handleExecuteFraudAnalysis,
        handleStartAnalysis, handleGenerateFindingQuestions, handleSubmitFindingAnalysis, handleExecuteFindingAnalysis, 
        handleUpdateFinding: auditCtx.updateFinding, handleAssessFeasibility, 
        handleStartCommDrill: (f: Finding) => { setSelectedFinding(f); showModal('auditeeProfile'); },
        handleStartResponseAnalysis: (f: Finding) => { setSelectedFinding(f); showModal('responseAnalysis'); },
        handleSimulateAuditeeResponse, handleAnalyzeCommunication, handleAnalyzeAuditeeResponse,
        handleGenerateReportOutline: async () => "", handleGenerateReport, handleExecuteReport,
        handleUpdateReportContent: auditCtx.setGeneratedReportContent,
        handleUpdateFraudCases: (pid: string, c: FraudCase[]) => auditCtx.updateAuditState({ fraudAnalyses: {...auditCtx.fraudAnalyses, [pid]: c} }),
        handleActionClick,
        handleTogglePinFile: (fileId: string) => {
            const currentIds = new Set(auditCtx.pinnedFileIds);
            if (currentIds.has(fileId)) currentIds.delete(fileId); else currentIds.add(fileId);
            auditCtx.setPinnedFileIds(Array.from(currentIds));
        },
        handleGuidanceUpdate, handleGuidanceSave,
        handleDistillContext
    };
};
