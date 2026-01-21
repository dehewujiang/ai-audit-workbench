
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import { ChatMessage, WorkflowStep } from '../types';
import { SendIcon, Spinner, StopIcon, TrashIcon, PencilIcon, ClipboardIcon, CheckIcon, RedoIcon, ErrorIcon, CheckCircleSolidIcon, SpreadsheetIcon, SwordIcon, LightbulbIcon, ArticleIcon, FlagIcon, ChevronDownIcon } from './icons';
import { useProject } from '../contexts/ProjectContext';
import { useChat } from '../contexts/ChatContext'; 
import { useUI } from '../contexts/UIContext';
import { useGlobal } from '../contexts/GlobalContext';
import { LoadingIndicator } from './LoadingIndicator';
import { calculateMessagesTokens, THRESHOLDS } from '../utils/tokenUtils';

/**
 * 方案 PROPOSAL-2024-AUDIT-UI-CLEAN-009 核心渲染防御：
 * 从对话文本中移除任何 JSON 代码块，确保用户不直视原始结构。
 */
const sanitizeMessageText = (text: string): string => {
    if (!text) return '';
    return text.replace(/```json[\s\S]*?```/g, "").trim();
};

/**
 * PROF-2024-AFDP-001: 记忆负载指示器组件
 */
const ContextPressureGauge: React.FC<{ messages: ChatMessage[] }> = ({ messages }) => {
    const tokens = useMemo(() => calculateMessagesTokens(messages.map(m => ({ role: m.role, content: m.text }))), [messages]);
    const percentage = Math.min(100, (tokens / THRESHOLDS.L1_DISTILL) * 100);
    
    let statusText = "记忆状态：清晰";
    let colorClass = "bg-green-500";
    
    if (tokens > THRESHOLDS.L1_DISTILL) {
        statusText = "已启动 AFDP 骨架压缩 (L2)";
        colorClass = "bg-red-500 animate-pulse";
    } else if (tokens > THRESHOLDS.L0_CLEAN) {
        statusText = "已启动 AFDP 特征提取 (L1)";
        colorClass = "bg-orange-500";
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100 shadow-sm mb-2 w-fit">
            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-500 ${colorClass}`} 
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{statusText}</span>
        </div>
    );
};

const InteractiveMessageContent: React.FC<{
  text: string;
  userInput: string;
  onOptionClick: (optionText: string) => void;
}> = ({ text, userInput, onOptionClick }) => {
  const cleanText = sanitizeMessageText(text);
  const lines = cleanText.split('\n');
  const checkboxRegex = /^\s*-\s\[\s\]\s(.+)/;
  const selectedOptions = userInput.split(',').map(s => s.trim()).filter(Boolean);

  const contentBlocks: React.ReactNode[] = [];
  let currentListItems: React.ReactNode[] = [];

  const flushList = (key: string) => {
    if (currentListItems.length > 0) {
      contentBlocks.push(
        <ul key={key} className="list-none p-0 m-0 mt-2 space-y-2">
          {currentListItems}
        </ul>
      );
      currentListItems = [];
    }
  };

  lines.forEach((line, index) => {
    const match = line.match(checkboxRegex);
    if (match) {
      const label = match[1].trim();
      const isChecked = selectedOptions.some(opt => opt.toLowerCase() === label.toLowerCase());
      
      currentListItems.push(
        <li key={`item-${index}`} className="list-none p-0 m-0">
          <button
            onClick={() => onOptionClick(label)}
            className={`flex items-center gap-3 text-left w-full p-3 rounded-xl transition-all border ${isChecked ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm'}`}
          >
            <div className={`w-5 h-5 border-2 ${isChecked ? 'bg-white border-white' : 'border-slate-300'} rounded-md flex-shrink-0 flex items-center justify-center transition-all`}>
              {isChecked && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
            </div>
            <span className="font-medium text-sm">{label}</span>
          </button>
        </li>
      );
    } else {
      flushList(`list-${index}`);
      contentBlocks.push(<div key={`text-${index}`} dangerouslySetInnerHTML={{ __html: marked.parse(line) as string }} />);
    }
  });

  flushList('last-list');

  // PROF-2024-UI-MARKDOWN-ENHANCE: Apply consistent styling to interactive blocks
  return <div className="prose prose-sm max-w-none text-slate-700 prose-headings:font-bold prose-headings:text-slate-800">{contentBlocks}</div>;
};

const WorkflowDisplay: React.FC<{ steps: WorkflowStep[] }> = ({ steps }) => {
  const isSingle = steps.length === 1;

  return (
    <div className={`my-2 ${isSingle ? '' : 'pl-1'}`}>
      <div className="space-y-3 relative">
        {!isSingle && <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-100 z-0"></div>}
        
        {steps.map((step, index) => {
           const isDone = step.status === 'done';
           const isInProgress = step.status === 'in_progress';
           const isPending = step.status === 'pending';
           const isError = step.status === 'error';
           
           return (
            <div key={index} className="flex items-center gap-3 relative z-10">
              <div className="flex-shrink-0 bg-white rounded-full">
                 {isDone && <CheckCircleSolidIcon className="h-5 w-5 text-green-500" />}
                 {isInProgress && <Spinner className="h-5 w-5 text-blue-600 animate-spin" />}
                 {isPending && <div className="h-4 w-4 m-0.5 border-2 border-slate-200 rounded-full bg-slate-50" />}
                 {isError && <ErrorIcon className="h-5 w-5 text-red-500" />}
              </div>
              
              <div className="flex-1">
                <p className={`text-sm font-medium leading-none transition-colors ${isInProgress ? 'text-slate-900' : isDone ? 'text-slate-800' : 'text-slate-300'}`}>
                  {step.name}
                </p>
                {(isInProgress || isError) && step.details && (
                    <p className={`text-xs mt-1 ${isError ? 'text-red-500' : 'text-slate-400'}`}>
                        {step.details}
                    </p>
                )}
              </div>
            </div>
           );
        })}
      </div>
    </div>
  );
};

const ThinkingProcess: React.FC<{ reasoning: string; isFinished?: boolean }> = ({ reasoning, isFinished }) => {
    // PROF-UI-MINIMAL-THINKING-B: Minimal non-interactive status bar
    if (!reasoning) return null;

    if (!isFinished) {
        return (
            <div className="mb-3 mt-2 rounded-lg border border-blue-100 bg-blue-50/30 p-3 animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                    <Spinner className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700 animate-pulse">正在进行深度逻辑推演...</span>
                </div>
                {/* Indeterminate Progress Bar */}
                <div className="h-1 w-full bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-1/3 rounded-full animate-[indeterminate_1.5s_infinite_linear] origin-left"></div>
                </div>
                <style>{`
                    @keyframes indeterminate {
                        0% { transform: translateX(-100%) scaleX(0.2); }
                        50% { transform: translateX(50%) scaleX(0.5); }
                        100% { transform: translateX(200%) scaleX(0.2); }
                    }
                `}</style>
            </div>
        );
    }

    // Finished State: Minimal grey text
    return (
        <div className="mb-2 flex items-center gap-1.5 pl-1 select-none opacity-70">
            <CheckCircleSolidIcon className="h-3 w-3 text-slate-400" />
            <span className="text-[10px] font-medium text-slate-400">已完成逻辑梳理</span>
        </div>
    );
};

// PROF-2024-UI-MARKDOWN-ENHANCE: Defined Enhanced Typography Classes
const MARKDOWN_STYLES = `
  prose prose-sm max-w-none text-slate-700 
  prose-headings:font-bold prose-headings:text-slate-900 prose-headings:mt-4 prose-headings:mb-2
  prose-p:my-2 prose-p:leading-relaxed
  prose-ul:my-2 prose-ul:list-disc prose-ul:pl-4
  prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-4
  prose-li:my-0.5 prose-li:marker:text-slate-400
  prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-slate-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-slate-600 prose-blockquote:font-medium prose-blockquote:italic
  prose-pre:bg-slate-800 prose-pre:text-white prose-pre:rounded-lg prose-pre:shadow-sm prose-pre:p-3
  prose-code:text-pink-600 prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-[0.9em]
  prose-code:before:content-none prose-code:after:content-none
  prose-a:text-blue-600 prose-a:no-underline prose-a:hover:underline prose-a:font-medium
  prose-strong:font-bold prose-strong:text-slate-900
  prose-hr:border-slate-200 prose-hr:my-4
  prose-table:border-collapse prose-table:w-full prose-table:text-xs prose-table:border prose-table:border-slate-200
  prose-th:bg-slate-50 prose-th:text-slate-700 prose-th:p-2 prose-th:border prose-th:border-slate-200 prose-th:text-left
  prose-td:p-2 prose-td:border prose-td:border-slate-200
`;

const ChatMessageDisplay: React.FC<{ 
  message: ChatMessage; 
  isLastMessage: boolean;
  canResend: boolean;
  userInput: string;
  onInteractiveOptionClick: (text: string) => void;
}> = ({ message, isLastMessage, canResend, userInput, onInteractiveOptionClick }) => {
  const { deleteMessage, editAndResubmit, resendMessage, handleActionClick } = useProject();
  const isUser = message.role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text);
  const [copied, setCopied] = useState(false);
  const editTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const isInteractive = message.role === 'model' && message.text.includes('- [ ]');
  const hasErrorAction = message.actions?.some(a => a.actionId === 'retry' || a.actionId.startsWith('error_'));

  const hasActiveWorkflow = useMemo(() => 
    message.workflowSteps?.some(step => step.status === 'in_progress'),
    [message.workflowSteps]
  );

  useEffect(() => {
    if (isEditing && editTextAreaRef.current) {
        editTextAreaRef.current.style.height = 'auto';
        editTextAreaRef.current.style.height = `${editTextAreaRef.current.scrollHeight}px`;
        editTextAreaRef.current.focus();
    }
  }, [isEditing, editedText]);

  const handleSave = () => {
    if (editedText.trim() && editedText.trim() !== message.text) {
        editAndResubmit(message.id, editedText);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(message.text);
    setIsEditing(false);
  };

  const handleCopy = () => {
    const textToCopy = message.workflowSteps ? message.workflowSteps.map(s => `${s.name}: ${s.status} - ${s.details || ''}`).join('\n') + '\n\n' + message.text : message.text;
    navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
        console.error('无法复制文本: ', err);
    });
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSave();
      }
      if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
      }
  };

  const getProcessingText = (state: ChatMessage['processingState']) => {
    switch(state) {
      case 'reasoning': return '正在梳理业务逻辑与风险...';
      case 'generating': return '正在生成审计程序...';
      case 'challenging': return '正在执行挑战模式...';
      case 'analyzingFraud': return '正在分析舞弊风险...';
      case 'analyzingFinding': return '正在进行根本原因分析...';
      case 'loading': return '正在思考...';
      case 'planning': return '正在构建规划大纲...';
      case 'strategizing': return '正在拟定红蓝对抗策略...';
      case 'writingReport': return '正在撰写报告全文...';
      case 'critiquing': return '正在进行内部质检 (Self-Critique)...';
      case 'refining': return '正在根据质检意见修订...';
      default: return '请稍候...';
    }
  };

  const displayContent = isUser ? message.text : sanitizeMessageText(message.text);

  return (
    <div className={`flex items-start my-6 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in group`}>
      <div className={`group relative max-w-3xl w-full`}>
         <div className={`px-5 py-4 rounded-2xl shadow-sm leading-relaxed ${
             isUser 
               ? 'bg-slate-900 text-white rounded-tr-sm ml-auto w-fit text-sm' 
               : 'bg-white border border-slate-100 rounded-tl-sm w-full'
         }`}>
            {isUser && isEditing ? (
                <div className="w-full min-w-[300px]">
                    <textarea
                        ref={editTextAreaRef}
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full p-2 border border-white/20 rounded-md text-sm bg-slate-800 text-white focus:ring-2 focus:ring-white/50 focus:outline-none resize-none overflow-y-hidden"
                        rows={1}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <button onClick={handleCancel} className="px-3 py-1 text-xs bg-slate-700 rounded-md hover:bg-slate-600 text-white">取消</button>
                        <button onClick={handleSave} className="px-3 py-1 text-xs bg-white text-black font-semibold rounded-md hover:bg-slate-200 disabled:opacity-50" disabled={!editedText.trim() || editedText.trim() === message.text}>
                            保存
                        </button>
                    </div>
                </div>
            ) : (
                <>
                  {isUser && <p style={{ whiteSpace: 'pre-wrap' }}>{displayContent}</p>}
                  {!isUser && (
                    <div className="flex flex-col">
                        {message.workflowSteps && (
                            <div className="mb-1">
                                <WorkflowDisplay steps={message.workflowSteps} />
                            </div>
                        )}
                        
                        {/* PROF-UI-MINIMAL-THINKING-B: New Implementation */}
                        {message.reasoning && (
                            <ThinkingProcess 
                                reasoning={message.reasoning} 
                                isFinished={!message.processingState || (message.processingState !== 'reasoning' && !isLastMessage)} 
                            />
                        )}

                        {(displayContent || hasErrorAction || isInteractive) && (
                            <div className={`${(message.workflowSteps || message.reasoning) ? (message.workflowSteps && message.workflowSteps.length > 1 ? 'mt-4 pt-4 border-t border-slate-100' : 'mt-2') : ''}`}>
                                {hasErrorAction ? (
                                    <div 
                                        className="prose prose-sm max-w-none text-red-600" 
                                        dangerouslySetInnerHTML={{ __html: marked.parse(displayContent) as string }} 
                                    />
                                ) : isInteractive ? (
                                    <InteractiveMessageContent text={displayContent} userInput={userInput} onOptionClick={onInteractiveOptionClick} />
                                ) : (
                                    <div 
                                        className={MARKDOWN_STYLES}
                                        dangerouslySetInnerHTML={{ __html: marked.parse(displayContent || '') as string }} 
                                    />
                                )}
                            </div>
                        )}
                    </div>
                  )}
                  {!isUser && isLastMessage && message.processingState && !message.reasoning && !hasActiveWorkflow && (
                      <div className="mt-3 pt-2 border-t border-slate-100">
                          <LoadingIndicator text={getProcessingText(message.processingState)} />
                      </div>
                  )}
                  {!isUser && message.actions && message.actions.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                      {message.actions.map(action => (
                        <button 
                          key={action.actionId}
                          onClick={() => handleActionClick(message.id, action.actionId, action.payload)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg hover:shadow-sm transition-all flex items-center gap-2 ${
                              ['review_draft', 'approve_plan', 'execute_challenge', 'execute_fraud_analysis', 'execute_finding_analysis', 'execute_report'].includes(action.actionId)
                              ? 'bg-slate-900 text-white hover:bg-black border border-transparent shadow-md' 
                              : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-white hover:border-blue-300 hover:text-blue-600'
                          }`}
                        >
                          {action.actionId === 'retry' ? <RedoIcon className="h-3.5 w-3.5" /> : null}
                          {action.actionId.startsWith('error_') ? <ErrorIcon className="h-3.5 w-3.5 text-red-500" /> : null}
                          {action.actionId === 'review_draft' ? <SpreadsheetIcon className="h-3.5 w-3.5 text-white" /> : null}
                          {action.actionId === 'approve_plan' ? <SwordIcon className="h-3.5 w-3.5 text-white" /> : null}
                          {action.actionId === 'execute_challenge' ? <SwordIcon className="h-3.5 w-3.5 text-white" /> : null}
                          {action.actionId === 'execute_fraud_analysis' ? <LightbulbIcon className="h-3.5 w-3.5 text-white" /> : null}
                          {action.actionId === 'execute_finding_analysis' ? <FlagIcon className="h-3.5 w-3.5 text-white" /> : null}
                          {action.actionId === 'execute_report' ? <ArticleIcon className="h-3.5 w-3.5 text-white" /> : null}
                          {action.text}
                        </button>
                      ))}
                    </div>
                  )}
                </>
            )}
         </div>
         <div className={`flex items-center mt-1 gap-2 ${isUser ? 'justify-end' : 'justify-start'} px-1`}>
             <span className="text-[10px] text-slate-300 select-none">{message.timestamp}</span>
             {message.id !== 'init' && !message.id.startsWith('init-') && (
                <div className={`flex items-center opacity-0 group-hover:opacity-100 transition-all duration-200`}>
                  {isUser && (
                    <>
                      <button onClick={() => setIsEditing(true)} className="p-1 text-slate-300 hover:text-black transition-colors" title="编辑" aria-label="编辑消息"><PencilIcon className="h-3.5 w-3.5" /></button>
                      {canResend && <button onClick={() => resendMessage(message.id)} className="p-1 text-slate-300 hover:text-black transition-colors" title="重发" aria-label="重新发送消息"><RedoIcon className="h-3.5 w-3.5" /></button>}
                    </>
                  )}
                  {!isUser && (
                    <button onClick={handleCopy} className="p-1 text-slate-300 hover:text-blue-600 transition-colors" title={copied ? "已复制!" : "复制"} aria-label="复制消息内容">{copied ? <CheckIcon className="h-3.5 w-3.5 text-green-500" /> : <ClipboardIcon className="h-3.5 w-3.5" />}</button>
                  )}
                  <button onClick={() => deleteMessage(message.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors" title="删除" aria-label="删除消息"><TrashIcon className="h-3.5 w-3.5" /></button>
                </div>
              )}
         </div>
      </div>
    </div>
  );
};

export const ChatPanel: React.FC = () => {
  const { 
      messages, 
      isLoading: isChatLoading, 
      isGenerating, 
      isChallenging, 
      isAnalyzingFraud, 
      isAnalyzing, 
      isAssessingFeasibility, 
      isGeneratingReport, 
      isCreatingProject 
  } = useChat();
  
  const { activeProject, activeProjectState, handleSendMessage, handleStopGeneration, handleGuidanceUpdate } = useProject();
  
  const isBusy = isGenerating || isChatLoading || isChallenging || isAnalyzingFraud || isAnalyzing || isAssessingFeasibility || isGeneratingReport || isCreatingProject;

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isNewProject = messages.length <= 1 && activeProjectState.guidanceStage === 1 && !activeProjectState.conversationStarted;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBusy]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isBusy) return;
    handleSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  const handleInteractiveOptionClick = (optionText: string) => {
      const currentOptions = input.split(',').map(s => s.trim()).filter(Boolean);
      const index = currentOptions.findIndex(o => o.toLowerCase() === optionText.toLowerCase());
      
      let newOptions;
      if (index >= 0) {
          newOptions = currentOptions.filter((_, i) => i !== index);
      } else {
          newOptions = [...currentOptions, optionText];
      }
      setInput(newOptions.join(', '));
      if (textareaRef.current) textareaRef.current.focus();
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex-shrink-0 p-4 border-b border-slate-50 flex justify-between items-center">
        <div className="flex items-center gap-2 px-2">
          <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">对话</h2>
        </div>
        {/* PROF-2024-AFDP-001: 插入压力表 */}
        <ContextPressureGauge messages={messages} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-0 pt-2 scroll-smooth custom-scrollbar">
         {isNewProject && activeProject && (
             <div className="max-w-2xl mx-auto mt-10 bg-slate-50 rounded-2xl p-8 border border-slate-100 text-center shadow-sm">
                 <div className="flex gap-4 justify-center">
                     <button 
                        onClick={() => handleGuidanceUpdate({}, 1)}
                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-black hover:shadow-lg transition-all flex items-center gap-2"
                     >
                         <PencilIcon className="h-4 w-4" />
                         填写项目背景
                     </button>
                 </div>
                 <p className="text-xs text-slate-400 mt-6">
                     您可以直接在下方输入指令开始自由对话。
                 </p>
             </div>
         )}

         {messages.map((msg, index) => (
             <ChatMessageDisplay 
                key={msg.id} 
                message={msg} 
                isLastMessage={index === messages.length - 1}
                canResend={index === messages.length - 1 && msg.role === 'user'}
                userInput={input}
                onInteractiveOptionClick={handleInteractiveOptionClick}
             />
         ))}
         <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 bg-white p-4 z-20">
         <div className="max-w-4xl mx-auto">
             <div className={`flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 transition-all ${isBusy ? 'opacity-80' : 'focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 focus-within:bg-white'}`}>
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isBusy ? "正在执行任务..." : "输入您的指令，或描述审计目标..."}
                    disabled={isBusy}
                    rows={1}
                    className="w-full max-h-[200px] bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-3 px-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none disabled:cursor-not-allowed"
                />
                <div className="flex-shrink-0 pb-1.5 pr-1">
                    {isBusy ? (
                        <button onClick={handleStopGeneration} className="p-2.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors shadow-sm" title="强行停止"><StopIcon className="h-5 w-5" /></button>
                    ) : (
                        <button onClick={handleSend} disabled={!input.trim()} className="p-2.5 rounded-lg bg-slate-900 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black hover:shadow-md transition-all" title="发送"><SendIcon className="h-5 w-5" /></button>
                    )}
                </div>
             </div>
         </div>
      </div>
    </div>
  );
};
