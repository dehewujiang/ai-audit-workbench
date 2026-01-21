
import React, { useState, useRef } from 'react';
import { GenerateIcon, SwordIcon, LightbulbIcon, FlagIcon, FolderIcon, TrashIcon, PinIcon, Spinner, ErrorIcon, FolderPlusIcon, ChevronDownIcon, ChevronRightIcon, ArticleIcon, SettingsIcon, RedoIcon } from './icons';
import { KnowledgeFile, Folder } from '../types';
import { useProject, areMandatoryGuidanceFieldsFilled } from '../contexts/ProjectContext';
import { useGlobal } from '../contexts/GlobalContext';
import { useUI } from '../contexts/UIContext';

interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    title: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'default';
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, title, onClick, disabled = false, variant = 'default' }) => {
    const baseClasses = "flex items-center w-full text-left rounded-lg transition-all duration-200 font-medium text-sm justify-start gap-3 px-3 py-2.5";
    const variants = {
        primary: "bg-slate-900 text-white hover:bg-black shadow-md shadow-slate-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none",
        default: "text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
    };
    
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${variants[variant]}`}
            title={title}
        >
            <span className={variant === 'primary' ? 'text-white' : 'text-slate-500'}>{icon}</span>
            <span>{label}</span>
        </button>
    );
};

export const ActionPanel: React.FC = () => {
  const { 
    activeProjectState, handleGenerateProgram, handleStartAnalysis, 
    handleAnalyzeFraud, handleTogglePinFile 
  } = useProject();
  
  const { 
    globalState, handleFileUploads, handleDeleteFile, 
    handleCreateFolder, handleDeleteFolder, handleMoveFileToFolder 
  } = useGlobal();

  const { showModal, isGenerating, isChallenging, isAnalyzingFraud, isGeneratingReport, newAnalysisType } = useUI();
  
  const [draggedOverFolder, setDraggedOverFolder] = useState<string | null | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const isAnyLoading = isGenerating || isChallenging || isAnalyzingFraud || isGeneratingReport;
  
  // State Checks
  const mandatoryFieldsFilled = areMandatoryGuidanceFieldsFilled(activeProjectState.collectedGuidanceData);
  const hasAuditProgram = activeProjectState.auditPrograms.length > 0;
  const activeProgramId = activeProjectState.activeProgramId;
  const hasFraudAnalysis = activeProgramId ? (activeProjectState.fraudAnalyses[activeProgramId]?.length > 0) : false;
  const hasReport = !!activeProjectState.generatedReportContent;
  const hasFindings = activeProjectState.findings.length > 0;

  // PROF-2024-SKIP-LOGIC-FIX-001: Explicitly allow stage 0 (Overview/Skipped mode)
  const isGenerateEnabled =
    activeProjectState.conversationStarted ||
    (activeProjectState.guidanceStage > 8) ||
    (activeProjectState.guidanceStage === 0) || 
    mandatoryFieldsFilled;
    
  // Dynamic Labels & Titles (State-Aware Logic)
  
  // 1. Audit Program
  const generateButtonLabel = hasAuditProgram ? '更新审计程序' : '生成审计程序';
  const generateButtonTitle = () => {
    if (isAnyLoading) return "正在处理...";
    if (hasAuditProgram) return "检测到已有程序。点击将基于最新的对话历史和反馈，重新生成或修订审计程序。";
    if (isGenerateEnabled) return "根据以上对话或背景信息生成审计程序";
    if (!mandatoryFieldsFilled) return "请先完成项目背景、风险和目标、控制环境等必填信息。";
    return "请先进行对话或填写项目背景以启用";
  };

  // 2. Fraud Analysis
  const fraudButtonLabel = hasFraudAnalysis ? '重新分析舞弊' : '舞弊风险分析';
  const fraudButtonTitle = hasFraudAnalysis 
    ? "检测到已有舞弊案例。点击此处将推翻旧结果，基于最新信息重新进行分析。" 
    : (hasAuditProgram ? "基于当前审计程序进行舞弊风险头脑风帮" : "请先生成一个审计程序以启用");

  // 3. Report
  const reportButtonLabel = hasReport ? '更新审计报告' : '生成审计报告';
  const reportButtonTitle = hasReport
    ? "检测到已有报告草稿。点击此处将最新的审计发现同步更新到报告中。"
    : (hasFindings ? "基于审计发现撰写报告草稿" : "请先记录至少一个审计发现以启用");

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverFolder(undefined);

    const draggedFileId = e.dataTransfer.getData("fileId");
    const uploadedFiles = e.dataTransfer.files;

    if (uploadedFiles && uploadedFiles.length > 0) {
      handleFileUploads(uploadedFiles, targetFolderId);
    } else if (draggedFileId) {
      handleMoveFileToFolder(draggedFileId, targetFolderId);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUploads(e.target.files, null);
    }
  };

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) newSet.delete(folderId);
      else newSet.add(folderId);
      return newSet;
    });
  };

  const handleCreateNewFolder = () => {
    if (newFolderName.trim()) {
      handleCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };
  
  const handleFileDragStart = (e: React.DragEvent<HTMLDivElement>, fileId: string) => {
    e.dataTransfer.setData("fileId", fileId);
  };

  const handleDragOverHighlight = (e: React.DragEvent<HTMLDivElement>, targetId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverFolder(targetId);
  };
  
  const renderFileItem = (file: KnowledgeFile) => {
    const isPinned = activeProjectState.pinnedFileIds.includes(file.id);

    const baseFileItem = (content: React.ReactNode, isDraggable: boolean = false) => (
      <div 
        draggable={isDraggable}
        onDragStart={isDraggable ? (e) => handleFileDragStart(e, file.id) : undefined}
        className={isDraggable ? 'cursor-grab' : ''}
      >
        {content}
      </div>
    );
    
    switch(file.status) {
      case 'parsing':
        return baseFileItem(
          <div key={file.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 bg-slate-50/50 mb-1">
            <Spinner className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate" title={file.name}>解析中: {file.name}</span>
          </div>
        );
      case 'error':
        return baseFileItem(
          <div key={file.id} className="group px-3 py-2 rounded-lg bg-red-50/50 mb-1 border border-transparent hover:border-red-100">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                    <ErrorIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-700 truncate" title={file.name}>{file.name}</span>
                </div>
                <button 
                    onClick={() => handleDeleteFile(file.id)} 
                    className="p-1 rounded-full text-red-300 hover:text-red-600 hover:bg-red-100 flex-shrink-0 transition-colors"
                >
                    <TrashIcon className="h-3.5 w-3.5" />
                </button>
            </div>
          </div>
        );
      case 'success':
        return baseFileItem(
          <div 
            key={file.id}
            className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-all mb-1 border border-transparent ${isPinned ? 'bg-blue-50/80 text-blue-900 border-blue-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <ArticleIcon className={`h-4 w-4 flex-shrink-0 ${isPinned ? 'text-blue-500' : 'text-slate-400'}`} />
              <span className="text-sm truncate" title={file.name}>{file.name}</span>
            </div>
            <div className="flex items-center flex-shrink-0 gap-1">
              <button 
                onClick={() => handleTogglePinFile(file.id)} 
                className={`p-1 rounded-md transition-all ${isPinned ? 'text-blue-600 bg-white shadow-sm' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-200 opacity-0 group-hover:opacity-100'}`}
                title={isPinned ? "取消上下文" : "设为上下文"}
              >
                <PinIcon className="h-3.5 w-3.5" isPinned={isPinned} />
              </button>
               <button 
                onClick={() => handleDeleteFile(file.id)} 
                className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                title="删除"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>, true
        );
      default:
        return null;
    }
  }
  
  const rootFiles = globalState.knowledgeFiles.filter(f => f.folderId === null);

  return (
    <div className="flex flex-col h-full p-4 bg-slate-50/30">
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center gap-2 mb-3 px-2">
          <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">核心流程</h2>
        </div>
        <div className="space-y-1">
          <ActionButton 
            icon={hasAuditProgram ? <RedoIcon className="h-4 w-4" /> : <GenerateIcon className="h-4 w-4" />} 
            label={generateButtonLabel} 
            title={generateButtonTitle()} 
            onClick={() => handleGenerateProgram(hasAuditProgram ? '重新生成审计程序' : '')} 
            disabled={!isGenerateEnabled || isAnyLoading} 
            variant="primary" 
          />
          <ActionButton 
            icon={<SwordIcon className="h-4 w-4" />} 
            label="发起挑战" 
            title={hasAuditProgram ? "对当前审计程序发起红蓝对抗挑战" : "请先生成一个审计程序以启用挑战模式"} 
            onClick={() => showModal('challenge')} 
            disabled={!hasAuditProgram || isAnyLoading} 
          />
          <ActionButton 
            icon={hasFraudAnalysis ? <RedoIcon className="h-4 w-4" /> : <LightbulbIcon className="h-4 w-4" />} 
            label={fraudButtonLabel} 
            title={fraudButtonTitle}
            onClick={() => handleAnalyzeFraud(hasFraudAnalysis ? '重新进行舞弊风险分析' : '')} 
            disabled={!hasAuditProgram || isAnyLoading} 
          />
          <ActionButton 
            icon={<FlagIcon className="h-4 w-4" />} 
            label="记录新发现" 
            title="结构化分析并记录一个新的审计发现" 
            onClick={handleStartAnalysis} 
            disabled={isAnyLoading} 
          />
          <ActionButton 
            icon={hasReport ? <RedoIcon className="h-4 w-4" /> : <ArticleIcon className="h-4 w-4" />} 
            label={reportButtonLabel} 
            title={reportButtonTitle}
            onClick={() => showModal('report')} 
            disabled={!hasFindings || isAnyLoading} 
          />
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200/50">
             <div className="flex items-center gap-2 mb-3 px-2">
                <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">全局设置</h2>
             </div>
             <ActionButton icon={<SettingsIcon className="h-4 w-4" />} label="企业/实体档案" title="设置全局行业背景、规模和核心系统" onClick={() => showModal('entityProfile')} />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2 px-2">
            <div className="flex items-center gap-2">
                <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">知识与文档</h2>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => setIsCreatingFolder(true)} className="p-1 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors" title="新建文件夹">
                    <FolderPlusIcon className="h-4 w-4" />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="p-1 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors" title="上传 PDF">
                    <ArticleIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
        
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" multiple className="hidden" />

        <div 
          className={`flex-1 overflow-y-auto pr-1 -mr-1 rounded-xl transition-all ${draggedOverFolder === null ? 'bg-blue-50/50 border-2 border-dashed border-blue-200' : ''}`}
          onDragOver={(e) => handleDragOverHighlight(e, null)}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDraggedOverFolder(undefined);
            }
          }}
          onDrop={(e) => handleDrop(e, null)}
        >
          {isCreatingFolder && (
            <div className="p-2 mb-2 bg-white rounded-lg border border-slate-200 shadow-sm mx-1">
                <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleCreateNewFolder()} className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="文件夹名称..." />
                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setIsCreatingFolder(false)} className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded">取消</button>
                    <button onClick={handleCreateNewFolder} className="px-2 py-1 text-xs bg-slate-900 text-white rounded hover:bg-black">创建</button>
                </div>
            </div>
          )}

          {/* Folders */}
          <div className="space-y-0.5">
          {globalState.folders.map(folder => {
            const isExpanded = expandedFolders.has(folder.id);
            const isDraggedOver = draggedOverFolder === folder.id;
            return (
              <div 
                key={folder.id}
                onDragOver={(e) => handleDragOverHighlight(e, folder.id)}
                onDrop={(e) => handleDrop(e, folder.id)}
                className={`rounded-lg transition-all ${isDraggedOver ? 'bg-blue-50 border border-blue-200' : ''}`}
              >
                <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg group hover:bg-slate-100 cursor-pointer select-none`} onClick={() => handleToggleFolder(folder.id)}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-slate-400 transition-transform duration-200">
                             {isExpanded ? <ChevronDownIcon className="h-3.5 w-3.5"/> : <ChevronRightIcon className="h-3.5 w-3.5"/>}
                        </span>
                        <FolderIcon className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-700 truncate">{folder.name}</span>
                    </div>
                    <button onClick={(e) => {e.stopPropagation(); handleDeleteFolder(folder.id)}} className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                        <TrashIcon className="h-3 w-3" />
                    </button>
                </div>
                {isExpanded && (
                  <div className="pl-4 mt-0.5 border-l border-slate-100 ml-3.5 mb-2">
                     {globalState.knowledgeFiles.filter(f => f.folderId === folder.id).map(renderFileItem)}
                     {globalState.knowledgeFiles.filter(f => f.folderId === folder.id).length === 0 && (
                        <div className="text-[10px] text-slate-400 px-3 py-1 italic">空文件夹</div>
                     )}
                  </div>
                )}
              </div>
            )
          })}
          </div>

          {/* Root Files */}
          <div className="mt-2 space-y-0.5">
            {rootFiles.map(renderFileItem)}
            {rootFiles.length === 0 && globalState.folders.length === 0 && !isCreatingFolder && (
                 <div className="flex flex-col items-center justify-center py-8 text-center opacity-40 border-2 border-dashed border-slate-200 rounded-xl m-1">
                    <FolderIcon className="h-8 w-8 text-slate-300 mb-1" />
                    <span className="text-xs text-slate-400 font-medium">拖放文件至此</span>
                 </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
