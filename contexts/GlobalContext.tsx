
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { GlobalState, LLMProfile, KnowledgeSnippet, KnowledgeFile, Folder, EntityProfile } from '../types';
import { useAuth } from '../AuthContext';
import * as api from '../services/api';
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';

// Set workerSrc for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@^5.4.394/build/pdf.worker.mjs';


const defaultGlobalState: GlobalState = {
  knowledgeFiles: [],
  folders: [],
  snippets: [],
  rightPanelWidthPercent: 50,
  actionPanelWidth: 300,
  llmProfiles: [
    {
      id: 'llm-default-deepseek',
      name: '默认 DeepSeek',
      provider: 'deepseek',
      apiEndpoint: 'https://api.deepseek.com',
      apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || import.meta.env.DEEPSEEK_API_KEY || '',
      modelName: 'deepseek-reasoner'
    },
    {
      id: 'llm-gemini',
      name: 'Gemini 3 Pro',
      provider: 'google',
      apiEndpoint: '',
      apiKey: import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '',
      modelName: 'gemini-3-pro-preview'
    }
  ],
  activeLlmProfileId: 'llm-default-deepseek',
  entityProfile: {
    industry: '',
    scale: '',
    coreSystems: '',
    regulatoryFramework: '',
    riskAppetite: '',
    description: ''
  },
  hasCompletedEntityProfile: false
};

interface GlobalContextType {
  globalState: GlobalState;
  updateGlobalState: React.Dispatch<React.SetStateAction<GlobalState>>;
  handleDeleteSnippet: (id: string) => void;
  handleSaveSettings: (profiles: LLMProfile[], activeId: string | null) => void;
  handleFileUploads: (files: FileList, targetFolderId?: string | null) => void;
  handleDeleteFile: (fileId: string) => void;
  handleCreateFolder: (name: string) => void;
  handleDeleteFolder: (folderId: string) => void;
  handleMoveFileToFolder: (fileId: string, folderId: string | null) => void;
  handleUpdateEntityProfile: (profile: EntityProfile) => void;
  activeLlmProfile: LLMProfile | null;
  saveStatus: 'idle' | 'saving' | 'saved';
}

const GlobalContext = createContext<GlobalContextType | null>(null);

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [globalState, setGlobalState] = useState<GlobalState>(defaultGlobalState);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

// Load global state on mount
  useEffect(() => {
    if (!user) return;
    
    const storageKey = user.id === 'guest-user-001' ? 'guest-globalState' : `user-globalState-${user.id}`;
    const savedStateJSON = localStorage.getItem(storageKey);
    
    if (savedStateJSON) {
      try {
        let savedState = JSON.parse(savedStateJSON);
        
        // Sanitize loaded state
        if (typeof savedState.rightPanelWidthPercent !== 'number' || savedState.rightPanelWidthPercent < 10 || savedState.rightPanelWidthPercent > 90) {
          savedState.rightPanelWidthPercent = defaultGlobalState.rightPanelWidthPercent;
        }
        if (typeof savedState.actionPanelWidth !== 'number' || savedState.actionPanelWidth < 200 || savedState.actionPanelWidth > 600) {
          savedState.actionPanelWidth = defaultGlobalState.actionPanelWidth;
        }
        // Ensure entityProfile exists
        if (!savedState.entityProfile) {
          savedState.entityProfile = defaultGlobalState.entityProfile;
        }
        
        setGlobalState(savedState);
      } catch (e) {
        console.error("Failed to parse global state, resetting.", e);
        setGlobalState(defaultGlobalState);
      }
    } else {
      setGlobalState(defaultGlobalState);
    }
  }, [user]);

useEffect(() => {
    if (!user) return;
    
    setSaveStatus('saving');
    const handler = setTimeout(() => {
      const storageKey = user.id === 'guest-user-001' ? 'guest-globalState' : `user-globalState-${user.id}`;
      localStorage.setItem(storageKey, JSON.stringify(globalState));
      setSaveStatus('saved');
      const hideHandler = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(hideHandler);
    }, 1000);
    return () => clearTimeout(handler);
  }, [globalState, user]);

  const handleDeleteSnippet = (id: string) => {
    setGlobalState(prev => ({ ...prev, snippets: prev.snippets.filter(s => s.id !== id) }));
  };

  const handleSaveSettings = (profiles: LLMProfile[], activeId: string | null) => {
    setGlobalState(prev => ({ ...prev, llmProfiles: profiles, activeLlmProfileId: activeId }));
  };
  
const handleUpdateEntityProfile = (profile: EntityProfile) => {
  setGlobalState(prev => ({ ...prev, entityProfile: profile, hasCompletedEntityProfile: true }));
};

  const activeLlmProfile = globalState.llmProfiles.find(p => p.id === globalState.activeLlmProfileId) || null;

  const handleFileUploads = (files: FileList, targetFolderId: string | null = null) => {
    const newFileEntries: KnowledgeFile[] = Array.from(files).map(file => ({
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.type,
        content: '', 
        status: 'parsing',
        folderId: targetFolderId,
    }));

    setGlobalState(prev => ({ ...prev, knowledgeFiles: [...prev.knowledgeFiles, ...newFileEntries] }));

    const updateFileState = (id: string, status: 'success' | 'error', content: string, errorMessage?: string) => {
        setGlobalState(prev => {
            const fileExists = prev.knowledgeFiles.some(f => f.id === id);
            if (!fileExists) return prev;
            return {
                ...prev,
                knowledgeFiles: prev.knowledgeFiles.map(f =>
                    f.id === id ? { ...f, status, content, errorMessage } : f
                ),
            };
        });
    };

    newFileEntries.forEach(async (fileEntry, index) => {
        const file = files[index];
        try {
            if (file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target?.result as ArrayBuffer;
                        if (!arrayBuffer) throw new Error("Failed to read file buffer.");
                        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                        let textContent = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const text = await page.getTextContent();
                            textContent += text.items.map(item => (item as TextItem).str).join('') + '\n';
                        }
                        updateFileState(fileEntry.id, 'success', textContent);
                    } catch (pdfError) {
                         updateFileState(fileEntry.id, 'error', '', `PDF解析失败: ${pdfError instanceof Error ? pdfError.message : '未知错误'}`);
                    }
                };
                reader.readAsArrayBuffer(file);
            } else if (file.type.startsWith('text/')) {
                 const content = await file.text();
                 updateFileState(fileEntry.id, 'success', content);
            } else {
                 updateFileState(fileEntry.id, 'error', '', '不支持的文件类型。');
            }
        } catch (error) {
             updateFileState(fileEntry.id, 'error', '', '处理文件时出错。');
        }
    });
  };

  const handleDeleteFile = (fileId: string) => {
    setGlobalState(prev => ({ ...prev, knowledgeFiles: prev.knowledgeFiles.filter(f => f.id !== fileId) }));
  };
  
  const handleCreateFolder = (name: string) => {
    const newFolder: Folder = { id: `folder-${Date.now()}`, name };
    setGlobalState(prev => ({ ...prev, folders: [...prev.folders, newFolder] }));
  };

  const handleDeleteFolder = (folderId: string) => {
    setGlobalState(prev => ({
        ...prev,
        folders: prev.folders.filter(f => f.id !== folderId),
        knowledgeFiles: prev.knowledgeFiles.map(f => f.folderId === folderId ? { ...f, folderId: null } : f)
    }));
  };

  const handleMoveFileToFolder = (fileId: string, folderId: string | null) => {
    setGlobalState(prev => ({
        ...prev,
        knowledgeFiles: prev.knowledgeFiles.map(f => f.id === fileId ? { ...f, folderId } : f)
    }));
  };

  const value = {
    globalState,
    updateGlobalState: setGlobalState,
    handleDeleteSnippet,
    handleSaveSettings,
    handleFileUploads,
    handleDeleteFile,
    handleCreateFolder,
    handleDeleteFolder,
    handleMoveFileToFolder,
    handleUpdateEntityProfile,
    activeLlmProfile,
    saveStatus,
  };

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
};
