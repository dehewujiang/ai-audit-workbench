import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Finding, FeasibilityAssessment, AuditeeProfile, LoadingStateKey } from '../types';

type ModalType = 'finding' | 'feasibility' | 'challenge' | 'auditeeProfile' | 'commDrill' | 'responseAnalysis' | 'report' | 'newProject' | 'diff' | 'settings' | 'deleteProject' | 'entityProfile' | 'draftReview' | null;
type NotificationType = { message: string; type: 'success' | 'error' };

interface UIContextType {
  activeModal: ModalType;
  showModal: (modal: ModalType) => void;
  closeModal: () => void;
  
  notification: NotificationType | null;
  setNotification: (notification: NotificationType | null) => void;
  
  isLoading: boolean;
  isGenerating: boolean;
  isAnalyzing: boolean;
  isChallenging: boolean;
  isAnalyzingFraud: boolean;
  isAssessingFeasibility: boolean;
  isGeneratingReport: boolean;
  isCreatingProject: boolean;
  setLoadingState: (key: LoadingStateKey, value: boolean) => void;

  selectedFinding: Finding | null;
  setSelectedFinding: (finding: Finding | null) => void;
  
  currentAssessment: FeasibilityAssessment | null;
  setCurrentAssessment: (assessment: FeasibilityAssessment | null) => void;
  
  assessmentError: string | null;
  setAssessmentError: (error: string | null) => void;
  
  currentAuditeeProfile: AuditeeProfile | null;
  handleStartAuditeeProfile: (profile: AuditeeProfile) => void;
  
  newAnalysisType: 'challenge' | 'fraud' | null;
  setNewAnalysisType: (type: 'challenge' | 'fraud' | null) => void;
  
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;

  projectToDelete: { id: string; name: string } | null;
  showDeleteConfirmation: (project: { id: string; name: string }) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    isLoading: false,
    isGenerating: false,
    isAnalyzing: false,
    isChallenging: false,
    isAnalyzingFraud: false,
    isAssessingFeasibility: false,
    isGeneratingReport: false,
    isCreatingProject: false,
  });

  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [currentAssessment, setCurrentAssessment] = useState<FeasibilityAssessment | null>(null);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [currentAuditeeProfile, setCurrentAuditeeProfile] = useState<AuditeeProfile | null>(null);
  const [newAnalysisType, setNewAnalysisType] = useState<'challenge' | 'fraud' | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);

  const showModal = (modal: ModalType) => setActiveModal(modal);
  const closeModal = () => {
    setActiveModal(null);
    if (projectToDelete) {
        // Reset project to delete when any modal is closed, for safety
        setProjectToDelete(null);
    }
  };


  const setLoadingState = (key: LoadingStateKey, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };

  const handleStartAuditeeProfile = (profile: AuditeeProfile) => {
    setCurrentAuditeeProfile(profile);
    closeModal(); // Close profile modal
    showModal('commDrill'); // Open drill modal
  };

  const showDeleteConfirmation = (project: { id: string; name: string }) => {
    setProjectToDelete(project);
    showModal('deleteProject');
  };

  const value = {
    activeModal,
    showModal,
    closeModal,
    notification,
    setNotification,
    ...loadingStates,
    setLoadingState,
    selectedFinding,
    setSelectedFinding,
    currentAssessment,
    setCurrentAssessment,
    assessmentError,
    setAssessmentError,
    currentAuditeeProfile,
    handleStartAuditeeProfile,
    newAnalysisType,
    setNewAnalysisType,
    selectedItemId,
    setSelectedItemId,
    projectToDelete,
    showDeleteConfirmation,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};