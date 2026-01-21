import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { AuditProgram, Finding, FraudCase, AppState, AuditProcedure, DistilledContext } from '../types';

interface AuditContextType {
  // Core Data
  auditPrograms: AuditProgram[];
  findings: Finding[];
  fraudAnalyses: Record<string, FraudCase[]>;
  generatedReportContent: string;
  reportGenerationTitle: string;
  distilledContext?: DistilledContext;
  
  // UI State specific to Business Logic
  activeTab: AppState['activeTab'];
  activeProgramId: string | null;
  guidanceStage: number;
  collectedGuidanceData: Record<string, any>;
  pinnedFileIds: string[];
  
  // Planning/Draft States
  draftProgram: AuditProgram | null;
  currentAuditPlan: string | null;
  currentChallengePlan: string | null;
  lastChallengeResult: string | null;
  currentFraudPlan: string | null;
  lastFraudAnalysisResult: string | null;
  currentFindingAnalysisPlan: string | null;
  currentReportPlan: string | null;
  pendingReportConfig: { title: string, auditee: string, auditor: string, includedFindingIds: string[] } | null;
  pendingFindingData: { condition: string, criteria: string, effect: string, cause?: string, answers: string } | null;

  // Setters
  setAuditPrograms: React.Dispatch<React.SetStateAction<AuditProgram[]>>;
  setFindings: React.Dispatch<React.SetStateAction<Finding[]>>;
  setFraudAnalyses: React.Dispatch<React.SetStateAction<Record<string, FraudCase[]>>>;
  setActiveTab: (tab: AppState['activeTab']) => void;
  setActiveProgramId: (id: string | null) => void;
  setGeneratedReportContent: (content: string) => void;
  setGuidanceStage: (stage: number) => void;
  setCollectedGuidanceData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setPinnedFileIds: React.Dispatch<React.SetStateAction<string[]>>;
  
  // Specific Updaters
  updateAuditState: (updates: Partial<AuditContextType>) => void; // Helper for bulk updates
  updateFinding: (finding: Finding) => void;
  addFinding: (finding: Finding) => void;
  updateProgram: (program: AuditProgram) => void;
}

const AuditContext = createContext<AuditContextType | null>(null);

export const AuditProvider: React.FC<{ children: ReactNode; initialState?: Partial<AppState> }> = ({ children, initialState = {} as Partial<AppState> }) => {
  // Core Data
  const [auditPrograms, setAuditPrograms] = useState<AuditProgram[]>(initialState.auditPrograms || []);
  const [findings, setFindings] = useState<Finding[]>(initialState.findings || []);
  const [fraudAnalyses, setFraudAnalyses] = useState<Record<string, FraudCase[]>>(initialState.fraudAnalyses || {});
  const [distilledContext, setDistilledContext] = useState<DistilledContext | undefined>(initialState.distilledContext);
  
  // UI/Flow State
  const [activeTab, setActiveTabState] = useState<AppState['activeTab']>(initialState.activeTab || 'background');
  const [activeProgramId, setActiveProgramId] = useState<string | null>(initialState.activeProgramId || null);
  const [guidanceStage, setGuidanceStage] = useState<number>(initialState.guidanceStage || 1);
  const [collectedGuidanceData, setCollectedGuidanceData] = useState<Record<string, any>>(initialState.collectedGuidanceData || {});
  const [pinnedFileIds, setPinnedFileIds] = useState<string[]>(initialState.pinnedFileIds || []);
  const [generatedReportContent, setGeneratedReportContent] = useState<string>(initialState.generatedReportContent || '');
  const [reportGenerationTitle, setReportGenerationTitle] = useState<string>(initialState.reportGenerationTitle || '');

  // Planning States (Buffers)
  const [draftProgram, setDraftProgram] = useState<AuditProgram | null>(initialState.draftProgram || null);
  const [currentAuditPlan, setCurrentAuditPlan] = useState<string | null>(initialState.currentAuditPlan || null);
  const [currentChallengePlan, setCurrentChallengePlan] = useState<string | null>(initialState.currentChallengePlan || null);
  const [lastChallengeResult, setLastChallengeResult] = useState<string | null>(initialState.lastChallengeResult || null);
  const [currentFraudPlan, setCurrentFraudPlan] = useState<string | null>(initialState.currentFraudPlan || null);
  const [lastFraudAnalysisResult, setLastFraudAnalysisResult] = useState<string | null>(initialState.lastFraudAnalysisResult || null);
  const [currentReportPlan, setCurrentReportPlan] = useState<string | null>(initialState.currentReportPlan || null);
  const [currentFindingAnalysisPlan, setCurrentFindingAnalysisPlan] = useState<string | null>(initialState.currentFindingAnalysisPlan || null);
  const [pendingReportConfig, setPendingReportConfig] = useState<any>(initialState.pendingReportConfig || null);
  const [pendingFindingData, setPendingFindingData] = useState<any>(initialState.pendingFindingData || null);

  const setActiveTab = useCallback((tab: AppState['activeTab']) => {
      setActiveTabState(tab);
  }, []);

  const updateAuditState = useCallback((updates: any) => {
      if (updates.auditPrograms !== undefined) setAuditPrograms(updates.auditPrograms);
      if (updates.findings !== undefined) setFindings(updates.findings);
      if (updates.fraudAnalyses !== undefined) setFraudAnalyses(updates.fraudAnalyses);
      if (updates.distilledContext !== undefined) setDistilledContext(updates.distilledContext);
      if (updates.activeTab !== undefined) setActiveTabState(updates.activeTab);
      if (updates.activeProgramId !== undefined) setActiveProgramId(updates.activeProgramId);
      if (updates.guidanceStage !== undefined) setGuidanceStage(updates.guidanceStage);
      if (updates.collectedGuidanceData !== undefined) setCollectedGuidanceData(updates.collectedGuidanceData);
      if (updates.pinnedFileIds !== undefined) setPinnedFileIds(updates.pinnedFileIds);
      if (updates.generatedReportContent !== undefined) setGeneratedReportContent(updates.generatedReportContent);
      if (updates.draftProgram !== undefined) setDraftProgram(updates.draftProgram);
      if (updates.currentAuditPlan !== undefined) setCurrentAuditPlan(updates.currentAuditPlan);
      if (updates.currentChallengePlan !== undefined) setCurrentChallengePlan(updates.currentChallengePlan);
      if (updates.lastChallengeResult !== undefined) setLastChallengeResult(updates.lastChallengeResult);
      if (updates.currentFraudPlan !== undefined) setCurrentFraudPlan(updates.currentFraudPlan);
      if (updates.lastFraudAnalysisResult !== undefined) setLastFraudAnalysisResult(updates.lastFraudAnalysisResult);
      if (updates.currentReportPlan !== undefined) setCurrentReportPlan(updates.currentReportPlan);
      if (updates.currentFindingAnalysisPlan !== undefined) setCurrentFindingAnalysisPlan(updates.currentFindingAnalysisPlan);
      if (updates.pendingReportConfig !== undefined) setPendingReportConfig(updates.pendingReportConfig);
      if (updates.pendingFindingData !== undefined) setPendingFindingData(updates.pendingFindingData);
      if (updates.reportGenerationTitle !== undefined) setReportGenerationTitle(updates.reportGenerationTitle);
  }, []);

  const updateFinding = useCallback((updatedFinding: Finding) => {
      setFindings(prev => prev.map(f => f.id === updatedFinding.id ? updatedFinding : f));
  }, []);

  const addFinding = useCallback((finding: Finding) => {
      setFindings(prev => [...prev, finding]);
  }, []);

  const updateProgram = useCallback((program: AuditProgram) => {
      setAuditPrograms(prev => {
          const index = prev.findIndex(p => p.id === program.id);
          if (index === -1) return [...prev, program];
          const newArr = [...prev];
          newArr[index] = program;
          return newArr;
      });
  }, []);

  return (
    <AuditContext.Provider value={{
      auditPrograms, setAuditPrograms,
      findings, setFindings,
      fraudAnalyses, setFraudAnalyses,
      distilledContext,
      activeTab, setActiveTab,
      activeProgramId, setActiveProgramId,
      guidanceStage, setGuidanceStage,
      collectedGuidanceData, setCollectedGuidanceData,
      pinnedFileIds, setPinnedFileIds,
      generatedReportContent, setGeneratedReportContent,
      reportGenerationTitle,
      draftProgram,
      currentAuditPlan,
      currentChallengePlan,
      lastChallengeResult,
      currentFraudPlan,
      lastFraudAnalysisResult,
      currentFindingAnalysisPlan,
      currentReportPlan,
      pendingReportConfig,
      pendingFindingData,
      updateAuditState,
      updateFinding,
      addFinding,
      updateProgram
    }}>
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};