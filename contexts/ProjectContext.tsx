import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Project, AppState, LoadingStateKey, ProjectContextType } from '../types';
import { useAuth } from '../AuthContext';
import * as api from '../services/api';
import { useGlobal } from './GlobalContext';
import { useUI } from './UIContext';

// Import domain contexts and the new logic hook
import { ChatProvider, useChat } from './ChatContext';
import { AuditProvider, useAudit } from './AuditContext';
import { useProjectHandlers } from '../hooks/useProjectHandlers';

const defaultAppState: AppState = {
  messages: [{
    id: 'init',
    role: 'model',
    text: "您好，我是您的审计助手。让我们开始吧！",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }],
  auditPrograms: [],
  auditTrail: [],
  findings: [],
  fraudAnalyses: {},
  conversationStarted: false,
  activeTab: 'background',
  activeProgramId: null,
  pinnedFileIds: [],
  generatedReportContent: '',
  reportGenerationTitle: '',
  guidanceStage: 1,
  collectedGuidanceData: {},
  draftProgram: null,
  currentAuditPlan: null,
  currentChallengePlan: null,
  lastChallengeResult: null,
  currentFraudPlan: null,
  lastFraudAnalysisResult: null,
  currentReportPlan: null, 
  pendingReportConfig: null,
  currentFindingAnalysisPlan: null,
  pendingFindingData: null,
};

const ProjectContext = createContext<ProjectContextType | null>(null);

export const areMandatoryGuidanceFieldsFilled = (data: Record<string, any>): boolean => {
    const mandatoryFields = [
        'auditType', 'triggerReason',
        'objectives', 'knownRisks', 'history',
        'controlSystem', 'policies', 'itEnvironment'
    ];
    return mandatoryFields.every(field => {
        const value = data[field];
        if (Array.isArray(value)) return value.length > 0;
        return value && typeof value === 'string' && value.trim() !== '';
    });
};

const ProjectLogic: React.FC<{ 
    children: ReactNode; 
    projects: Project[]; 
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    activeProject: Project | null;
    setActiveProject: React.Dispatch<React.SetStateAction<Project | null>>;
    isLoadingState: boolean;
}> = ({ children, projects, setProjects, activeProject, setActiveProject, isLoadingState }) => {
    
    const { user } = useAuth();
    const chatCtx = useChat();
    const auditCtx = useAudit();
    const { closeModal, setNotification } = useUI();

    const handlers = useProjectHandlers(activeProject);

    const activeProjectState: AppState = {
        messages: chatCtx.messages,
        auditPrograms: auditCtx.auditPrograms,
        auditTrail: [], 
        findings: auditCtx.findings,
        fraudAnalyses: auditCtx.fraudAnalyses,
        conversationStarted: chatCtx.messages.length > 1,
        activeTab: auditCtx.activeTab,
        activeProgramId: auditCtx.activeProgramId,
        pinnedFileIds: auditCtx.pinnedFileIds,
        generatedReportContent: auditCtx.generatedReportContent,
        reportGenerationTitle: auditCtx.reportGenerationTitle,
        guidanceStage: auditCtx.guidanceStage,
        collectedGuidanceData: auditCtx.collectedGuidanceData,
        draftProgram: auditCtx.draftProgram,
        currentAuditPlan: auditCtx.currentAuditPlan,
        currentChallengePlan: auditCtx.currentChallengePlan,
        lastChallengeResult: auditCtx.lastChallengeResult,
        currentFraudPlan: auditCtx.currentFraudPlan,
        lastFraudAnalysisResult: auditCtx.lastFraudAnalysisResult,
        currentReportPlan: auditCtx.currentReportPlan,
        pendingReportConfig: auditCtx.pendingReportConfig,
        currentFindingAnalysisPlan: auditCtx.currentFindingAnalysisPlan,
        pendingFindingData: auditCtx.pendingFindingData,
        distilledContext: auditCtx.distilledContext,
    };

    useEffect(() => {
        if (!activeProject) return;
        const currentStateSnapshot: AppState = activeProjectState;
        const updatedProject = { ...activeProject, state: currentStateSnapshot };
        
        if (user?.id === 'guest-user-001') {
             const savedProjects = localStorage.getItem('guest-projects');
             if (savedProjects) {
                 const parsed = JSON.parse(savedProjects) as Project[];
                 const newProjects = parsed.map(p => p.id === activeProject.id ? updatedProject : p);
                 localStorage.setItem('guest-projects', JSON.stringify(newProjects));
             }
        }
    }, [chatCtx.messages, auditCtx.auditPrograms, auditCtx.findings, auditCtx.collectedGuidanceData, auditCtx.fraudAnalyses, auditCtx.activeTab, auditCtx.lastChallengeResult, auditCtx.lastFraudAnalysisResult, auditCtx.distilledContext]);

    const handleCreateProject = async (name: string) => {
        chatCtx.setLoadingState('isCreatingProject', true);
        try {
            const newProject: Project = {
                id: `proj-${Date.now()}`,
                name: name,
                createdAt: new Date().toISOString(),
                state: JSON.parse(JSON.stringify(defaultAppState)) 
            };

            if (user?.id === 'guest-user-001') {
                setProjects(prev => {
                    const updated = [...prev, newProject];
                    localStorage.setItem('guest-projects', JSON.stringify(updated));
                    return updated;
                });
                setActiveProject(newProject);
            } else {
                // 使用localStorage创建项目（不再依赖后端API）
                const newProject = {
                    id: `project-${Date.now()}`,
                    name,
                    createdAt: new Date().toISOString(),
                    state: defaultAppState
                };
                const storageKey = `user-projects-${user.id}`;
                const existing = localStorage.getItem(storageKey);
                const projects = existing ? JSON.parse(existing) : [];
                projects.push(newProject);
                localStorage.setItem(storageKey, JSON.stringify(projects));
                setProjects(prev => [...prev, newProject]);
                setActiveProject(newProject);
            }
            closeModal();
        } catch (e) {
            setNotification({ message: '创建项目失败', type: 'error' });
        } finally {
            chatCtx.setLoadingState('isCreatingProject', false);
        }
    };

    const deleteProject = async (projectId: string) => {
        try {
            if (user?.id === 'guest-user-001') {
                const updatedProjects = projects.filter(p => p.id !== projectId);
                setProjects(updatedProjects);
                localStorage.setItem('guest-projects', JSON.stringify(updatedProjects));
                if (activeProject?.id === projectId) setActiveProject(updatedProjects[0] || null);
            } else {
                // 使用localStorage删除项目（不再依赖后端API）
                const updatedProjects = projects.filter(p => p.id !== projectId);
                localStorage.setItem(`user-projects-${user.id}`, JSON.stringify(updatedProjects));
                if (activeProject?.id === projectId) {
                    localStorage.setItem(`user-activeProjectId-${user.id}`, updatedProjects[0]?.id || '');
                    setActiveProject(updatedProjects[0] || null);
                }
                setProjects(updatedProjects);
            }
        } catch (e) {
            setNotification({ message: '删除项目失败', type: 'error' });
        }
    };

    const switchProject = (id: string) => { 
        const p = projects.find(p => p.id === id); 
        if(p) setActiveProject(p);
    };

    return (
        <ProjectContext.Provider value={{
            projects, activeProject, activeProjectState, isLoadingState,
            switchProject, deleteProject, handleCreateProject,
            setActiveTab: auditCtx.setActiveTab,
            ...handlers 
        }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { updateGlobalState } = useGlobal();
    
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [isLoadingState, setIsLoadingState] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setIsLoadingState(true);
            if (user?.id === 'guest-user-001') {
                const saved = localStorage.getItem('guest-projects');
                const activeId = localStorage.getItem('guest-activeProjectId');
                if (saved) {
                    const loaded = JSON.parse(saved);
                    setProjects(loaded);
                    setActiveProject(loaded.find((p: Project) => p.id === activeId) || loaded[0] || null);
                }
            } else if (user) {
                // 使用localStorage存储（不再依赖后端API）
                const saved = localStorage.getItem(`user-projects-${user.id}`);
                const activeId = localStorage.getItem(`user-activeProjectId-${user.id}`);
                const savedGlobal = localStorage.getItem(`user-globalState-${user.id}`);
                if (saved) {
                    const loaded = JSON.parse(saved);
                    setProjects(loaded);
                    setActiveProject(loaded.find((p: Project) => p.id === activeId) || loaded[0] || null);
                }
                if (savedGlobal) {
                    try {
                        updateGlobalState(JSON.parse(savedGlobal));
                    } catch(e) {}
                }
            }
            setIsLoadingState(false);
        };
        loadData();
    }, [user]);

    const projectKey = activeProject?.id || 'no-project';
    const initialState = activeProject?.state || defaultAppState;

    return (
        <AuditProvider key={`${projectKey}-audit`} initialState={initialState}>
            <ChatProvider key={`${projectKey}-chat`} initialMessages={initialState.messages}>
                <ProjectLogic 
                    projects={projects} setProjects={setProjects}
                    activeProject={activeProject} setActiveProject={setActiveProject}
                    isLoadingState={isLoadingState}
                >
                    {children}
                </ProjectLogic>
            </ChatProvider>
        </AuditProvider>
    );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within a ProjectProvider');
  return context;
};