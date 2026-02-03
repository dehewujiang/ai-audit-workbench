
import React, { useEffect, useState, useRef } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { ActionPanel } from './components/ActionPanel';
import { AuditProgramPanel } from './components/AuditProgramPanel';
import { AppState } from './types';
import { exportToCsv } from './utils/csvExport';
import { exportSnippetsToCsv } from './utils/snippetExport';
import { UserIcon, LibraryIcon, SpreadsheetIcon, BugIcon, ArticleIcon, CompareIcon, Spinner, SettingsIcon, ExportIcon, CloseIcon, FlagIcon, ClipboardIcon } from './components/icons';
import { FindingAnalysisModal } from './components/FindingAnalysisModal';
import { WorkbenchPanel } from './components/WorkbenchPanel';
import { MySnippetsPanel } from './components/MySnippetsPanel';
import { FraudAnalysisPanel } from './components/FraudAnalysisPanel';
import { FeasibilityModal } from './components/FeasibilityModal';
import { CommunicationDrillModal } from './components/CommunicationDrillModal';
import { ResponseAnalysisModal } from './components/ResponseAnalysisModal';
import { ReportGenerationModal } from './components/ReportGenerationModal';
import { ReportPanel } from './components/ReportPanel';
import { AuditeeProfileModal } from './components/AuditeeProfileModal';
import { ChallengeConfirmationModal } from './components/ChallengeConfirmationModal';
import { NewProjectModal } from './components/NewProjectModal';
import { ProjectSwitcher } from './components/ProjectSwitcher';
import { ChatbotWidget } from './components/ChatbotWidget';
import { VersionDiffModal } from './components/VersionDiffModal';
import { SettingsModal } from './components/SettingsModal';
import { useAuth } from './AuthContext';
import { GuidancePanel } from './components/GuidancePanel';
import { useGlobal } from './contexts/GlobalContext';
import { useProject } from './contexts/ProjectContext';
import { useUI } from './contexts/UIContext';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { EntityProfileModal } from './components/EntityProfileModal';
import { DraftReviewModal } from './components/DraftReviewModal';

const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const { projects, activeProject, switchProject } = useProject();
    const { showModal } = useUI();

    return (
        <header className="h-14 px-4 flex items-center justify-between flex-shrink-0 bg-white border-b border-slate-300 z-20 shadow-sm">
            <div className="flex items-center">
                <div className="mr-3 flex items-center justify-center h-8 w-8 bg-slate-900 rounded-lg text-white font-bold shadow-sm shadow-slate-200">
                    A
                </div>
                <ProjectSwitcher
                    projects={projects}
                    activeProject={activeProject}
                    onSwitchProject={switchProject}
                    onCreateProject={() => showModal('newProject')}
                />
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => showModal('settings')} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all duration-200" title="模型配置">
                    <SettingsIcon className="h-4 w-4" />
                </button>
                 <div className="h-4 w-px bg-slate-200 mx-2"></div>
                 <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mr-1">
                    {user?.name}
                 </div>
                 <button onClick={logout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200" title="退出登录">
                    <UserIcon className="h-4 w-4" />
                </button>
            </div>
        </header>
    );
};

export const App: React.FC = () => {
  const { user } = useAuth();
  const { 
    projects, activeProject, activeProjectState, isLoadingState, 
    handleCreateProject
  } = useProject();
  
  const { 
    globalState, updateGlobalState
  } = useGlobal();

  const {
    activeModal, showModal, closeModal, notification, setNotification,
    currentAssessment, isAssessingFeasibility, assessmentError
  } = useUI();

  const [isResizing, setIsResizing] = useState(false);
  const [isResizingActionPanel, setIsResizingActionPanel] = useState(false);
  const [snippetSearchTerm, setSnippetSearchTerm] = useState('');
  const mainContainerRef = useRef<HTMLElement>(null);
  
   // Auto-hide for notifications
  useEffect(() => {
    if (notification) {
        const timer = setTimeout(() => setNotification(null), 5000);
        return () => clearTimeout(timer);
    }
  }, [notification, setNotification]);

// Onboarding: Prompt for Entity Profile if missing
  useEffect(() => {
    // Delay check slightly to ensure everything is loaded
    const timer = setTimeout(() => {
      // 只有从未填写过企业档案时才强制弹出
      const hasCompletedEntityProfile = globalState.hasCompletedEntityProfile ?? 
        (globalState.entityProfile.industry || globalState.entityProfile.scale || globalState.entityProfile.coreSystems);
      if (globalState.entityProfile && !globalState.entityProfile.industry && !hasCompletedEntityProfile && !activeModal) {
        showModal('entityProfile');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [globalState.entityProfile, globalState.hasCompletedEntityProfile, showModal, activeModal]);

  // Resizer for middle/right panels
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !activeProject || !globalState || !mainContainerRef.current) return;
      
      const mainRect = mainContainerRef.current.getBoundingClientRect();
      if (mainRect.width <= 0) { // Defensive check to prevent division by zero
          return;
      }
      
      // Account for padding (12px on each side = 24px total horizontal padding in container)
      // Plus 2 resizer handles approx 12px each = 24px
      // This is an approximation for the fluid layout calculation
      const effectiveWidth = mainRect.width - 48; 
      
      // Relative position inside the container
      const relativeX = e.clientX - mainRect.left; 
      
      const newRightPanelWidthPx = mainRect.width - relativeX - 12; // Subtract right padding
      const newWidthPercent = (newRightPanelWidthPx / effectiveWidth) * 100;

      const clampedWidth = Math.max(25, Math.min(75, newWidthPercent));
      updateGlobalState(prev => ({ ...prev, rightPanelWidthPercent: clampedWidth }));
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.style.cursor = 'default';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, updateGlobalState, activeProject, globalState]);
  
  // Resizer for action panel
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingActionPanel || !activeProject || !globalState || !mainContainerRef.current) return;
      
      const mainRect = mainContainerRef.current.getBoundingClientRect();
      // Relative position inside the container (start is at padding-left: 12px)
      const newWidth = e.clientX - mainRect.left - 12;

      const clampedWidth = Math.max(240, Math.min(450, newWidth));
      updateGlobalState(prev => ({ ...prev, actionPanelWidth: clampedWidth }));
    };
    const handleMouseUp = () => setIsResizingActionPanel(false);
    if (isResizingActionPanel) {
      document.body.style.cursor = 'col-resize';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.style.cursor = 'default';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingActionPanel, updateGlobalState, activeProject, globalState]);


  if (isLoadingState) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center">
            <Spinner className="h-8 w-8 text-slate-800 mb-4" />
            <p className="text-slate-500 text-sm font-medium animate-pulse">正在初始化工作台...</p>
        </div>
      </div>
    );
  }
  
  if (!activeProject || !activeProjectState || !globalState) {
    return (
      <div className="flex flex-col h-screen font-sans bg-slate-50">
        <Header />
        <div className="flex items-center justify-center flex-1">
            {projects.length > 0 ? '正在加载项目...' : (
                <div className="text-center p-10 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-slate-200">
                        <SpreadsheetIcon className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">欢迎使用审计助手</h2>
                    <p className="text-slate-500 mb-8">您还没有任何项目。创建一个新项目开始您的智能审计之旅。</p>
                    <button onClick={() => showModal('newProject')} className="w-full px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-black transition-all shadow-lg shadow-slate-200">
                        创建第一个项目
                    </button>
                </div>
            )}
            <NewProjectModal
              isOpen={activeModal === 'newProject'}
              onClose={closeModal}
              onSubmit={handleCreateProject}
            />
        </div>
      </div>
    );
  }
  
  const { setActiveTab } = useProject();
  const activeProgram = activeProjectState.auditPrograms.find(p => p.id === activeProjectState.activeProgramId) || null;

  const hasCompletedGuidance = activeProjectState.hasCompletedGuidance ?? false;
  const shouldShowGuidanceWizard = 
      activeProjectState.guidanceStage > 0 && 
      activeProjectState.guidanceStage <= 8 && 
      !hasCompletedGuidance;

  return (
    <div className="h-screen flex flex-col font-sans bg-slate-200 text-slate-800 selection:bg-blue-100 selection:text-blue-900">
        {notification && (
             <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border animate-fade-in-down flex items-center gap-3 ${notification.type === 'error' ? 'bg-red-50/95 border-red-100 text-red-800' : 'bg-white/95 border-slate-100 text-slate-800'}`}>
                 <div className={`w-2 h-2 rounded-full ${notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                 <p className="text-sm font-medium">{notification.message}</p>
                 <button onClick={() => setNotification(null)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
                     <CloseIcon className="h-3.5 w-3.5" />
                 </button>
             </div>
        )}
        <Header />

        {/* Removed 'gap-4', reduced padding to 'p-3' (12px) */}
        <main ref={mainContainerRef} className="flex-1 flex overflow-hidden p-3 relative">
            {/* Left Panel: Actions */}
            <div 
              style={{ width: `${globalState.actionPanelWidth}px` }} 
              className="flex-shrink-0 flex flex-col bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden z-10"
            >
                <ActionPanel />
            </div>

            {/* Resizer Handle 1 (Acts as Spacer) */}
            {/* Fixed width 'w-3' (12px), removed negative margins. This acts as the gap. */}
            <div 
                onMouseDown={() => setIsResizingActionPanel(true)} 
                className="w-3 z-20 cursor-col-resize flex items-center justify-center flex-shrink-0 group"
            >
                 <div className="w-[3px] h-12 bg-slate-200/0 rounded-full group-hover:bg-slate-300/50 transition-colors duration-300"></div>
            </div>

            {/* Middle Panel: Chat */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden z-10">
                <ChatPanel />
            </div>
            
            {/* Resizer Handle 2 (Acts as Spacer) */}
             {/* Fixed width 'w-3' (12px), removed negative margins. This acts as the gap. */}
            <div 
                onMouseDown={() => setIsResizing(true)} 
                className="w-3 z-20 cursor-col-resize flex items-center justify-center flex-shrink-0 group"
            >
                <div className="w-[3px] h-12 bg-slate-200/0 rounded-full group-hover:bg-slate-300/50 transition-colors duration-300"></div>
            </div>

            {/* Right Panel: Workspace */}
            <div 
              style={{ width: `${globalState.rightPanelWidthPercent}%` }} 
              className="flex-shrink-0 flex flex-col bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden min-w-[350px] z-10"
            >
                <div className="flex-shrink-0 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
                    <nav className="flex items-center text-sm font-medium overflow-x-auto scrollbar-hide px-3">
                        {[
                            {id: 'background', label: '项目背景', icon: <ClipboardIcon/>},
                            {id: 'program', label: '审计程序', icon: <SpreadsheetIcon/>},
                            {id: 'workbench', label: '审计发现', icon: <FlagIcon/>},
                            {id: 'fraud', label: '舞弊分析', icon: <BugIcon/>},
                            {id: 'report', label: '报告', icon: <ArticleIcon/>},
                            {id: 'snippets', label: '知识库', icon: <LibraryIcon/> }
                        ].map(tab => {
                            const isActive = activeProjectState.activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as AppState['activeTab'])}
                                    className={`flex items-center gap-2 px-3 py-3.5 border-b-[2px] transition-all whitespace-nowrap text-[13px] ${isActive ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'}`}
                                >
                                    <span className={`h-3.5 w-3.5 ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{tab.icon}</span> 
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>
                {/* Changed bg-slate-50/30 to bg-white here */}
                <div className="flex-1 flex flex-col min-h-0 bg-white">
                    {shouldShowGuidanceWizard ? (
                        <GuidancePanel
                            projectName={activeProject.name}
                            user={user}
                        />
                    ) : (
                        <div className="h-full overflow-y-auto">
                            {activeProjectState.activeTab === 'background' && (
                                <GuidancePanel
                                    isOverviewMode={true}
                                    projectName={activeProject.name}
                                    user={user}
                                />
                            )}
                            {activeProjectState.activeTab === 'program' && <AuditProgramPanel />}
                            {activeProjectState.activeTab === 'workbench' && <WorkbenchPanel />}
                            {activeProjectState.activeTab === 'fraud' && <FraudAnalysisPanel />}
                            {activeProjectState.activeTab === 'report' && <ReportPanel />}
                            {activeProjectState.activeTab === 'snippets' && (
                              <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <input type="text" placeholder="搜索知识片段..." value={snippetSearchTerm} onChange={(e) => setSnippetSearchTerm(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-lg w-1/2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                                    <button onClick={() => exportSnippetsToCsv(globalState.snippets)} className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 shadow-sm"><ExportIcon className="h-4 w-4"/>导出全部</button>
                                </div>
                                <MySnippetsPanel searchTerm={snippetSearchTerm} />
                              </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <ChatbotWidget isHidden={shouldShowGuidanceWizard} />
            
            {/* --- Modals --- */}
            <FindingAnalysisModal isOpen={activeModal === 'finding'} onClose={closeModal} />
            <FeasibilityModal
              isOpen={activeModal === 'feasibility'}
              onClose={closeModal}
              assessment={currentAssessment}
              isLoading={isAssessingFeasibility}
              error={assessmentError}
            />
            <ChallengeConfirmationModal isOpen={activeModal === 'challenge'} onClose={closeModal} />
            <AuditeeProfileModal isOpen={activeModal === 'auditeeProfile'} onClose={closeModal} />
            <CommunicationDrillModal isOpen={activeModal === 'commDrill'} onClose={closeModal} />
            <ResponseAnalysisModal isOpen={activeModal === 'responseAnalysis'} onClose={closeModal} />
            <ReportGenerationModal isOpen={activeModal === 'report'} onClose={closeModal} />
            <NewProjectModal isOpen={activeModal === 'newProject'} onClose={closeModal} onSubmit={handleCreateProject} />
            <VersionDiffModal isOpen={activeModal === 'diff'} onClose={closeModal} />
            <SettingsModal isOpen={activeModal === 'settings'} onClose={closeModal} />
            <EntityProfileModal isOpen={activeModal === 'entityProfile'} onClose={closeModal} />
            <DraftReviewModal isOpen={activeModal === 'draftReview'} onClose={closeModal} />
            <DeleteConfirmationModal />
        </main>
    </div>
  );
};
