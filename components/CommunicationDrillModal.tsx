
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { marked } from 'marked';
import { Finding, DrillTurn } from '../types';
import { Spinner } from './icons';
import { useProject } from '../contexts/ProjectContext';
import { useUI } from '../contexts/UIContext';

interface CommunicationDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FindingDetails: React.FC<{ finding: Finding }> = ({ finding }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
        <p><strong>状况:</strong> {finding.condition}</p>
        <p><strong>标准:</strong> {finding.criteria}</p>
        <p><strong>影响:</strong> {finding.effect}</p>
    </div>
);

// PROF-2024-UI-MARKDOWN-ENHANCE: Apply markdown parsing
const DialogueTurn: React.FC<{ turn: DrillTurn }> = ({ turn }) => {
    const getRoleStyles = () => {
        switch (turn.actor) {
            case 'auditee': return { icon: '🗣️', label: '被审计单位', color: 'bg-yellow-100 border-yellow-300' };
            case 'user': return { icon: '👨‍💼', label: '您', color: 'bg-blue-100 border-blue-300' };
            case 'coach': return { icon: '🎓', label: '教练', color: 'bg-green-100 border-green-300' };
            default: return { icon: '❓', label: '未知', color: 'bg-gray-100 border-gray-300' };
        }
    };
    const { icon, label, color } = getRoleStyles();

    return (
        <div className={`p-4 rounded-lg border ${color}`}>
            <p className="font-semibold text-sm text-gray-800 mb-2">{icon} {label}</p>
            <div 
                className="prose prose-sm max-w-none text-gray-700 prose-p:my-1 prose-ul:my-1 prose-li:my-0" 
                dangerouslySetInnerHTML={{ __html: marked.parse(turn.text) as string }} 
            />
        </div>
    );
};


export const CommunicationDrillModal: React.FC<CommunicationDrillModalProps> = ({ isOpen, onClose }) => {
  const { handleSimulateAuditeeResponse, handleAnalyzeCommunication, handleUpdateFinding } = useProject();
  const { selectedFinding: finding } = useUI();
  const [history, setHistory] = useState<DrillTurn[]>([]);
  const [currentUserInput, setCurrentUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  
  const currentRound = Math.floor(history.filter(t => t.actor === 'coach').length) + 1;
  const isExpectingUserInput = history.length > 0 && history[history.length - 1].actor === 'auditee';
  const isRoundFinished = history.length > 0 && history[history.length - 1].actor === 'coach';

  // Load history from finding when modal opens
  useEffect(() => {
    if (isOpen && finding) {
      setHistory(finding.responseAnalysisHistory || []);
      setCurrentUserInput('');
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen, finding]);
  
  const handleReset = () => {
      if (confirm('确定要清空所有历史记录并重新开始吗？此操作将更新已保存的记录。')) {
          setHistory([]);
          setCurrentUserInput('');
          if (finding) {
              handleUpdateFinding({ ...finding, responseAnalysisHistory: [] });
          }
      }
  };
  
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);
  
  if (!isOpen || !finding) return null;

  const saveHistory = (newHistory: DrillTurn[]) => {
      setHistory(newHistory);
      handleUpdateFinding({ ...finding, responseAnalysisHistory: newHistory });
  };

  const handleSimulate = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const result = await handleSimulateAuditeeResponse(finding, history);
        const newHistory: DrillTurn[] = [...history, { actor: 'auditee', text: result, isSimulated: true }];
        saveHistory(newHistory);
    } catch (e) {
        setError(e instanceof Error ? e.message : '模拟时发生未知错误');
    } finally {
        setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!currentUserInput.trim()) {
        setError("请输入您的回应策略。");
        return;
    }
    setIsLoading(true);
    setError(null);
    
    try {
        const result = await handleAnalyzeCommunication(finding, history, currentUserInput);
        const newHistory: DrillTurn[] = [
            ...history, 
            { actor: 'user', text: currentUserInput },
            { actor: 'coach', text: result }
        ];
        saveHistory(newHistory);
        setCurrentUserInput('');
    } catch (e) {
        setError(e instanceof Error ? e.message : '分析时发生未知错误');
    } finally {
        setIsLoading(false);
    }
  };

  const renderFooter = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center w-full">
            <Spinner className="h-6 w-6 text-blue-500 mr-2" />
            <span>{isExpectingUserInput ? '正在分析...' : '正在模拟...'}</span>
        </div>
      );
    }

    if (currentRound > 3 && isRoundFinished) {
      return (
        <>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">关闭</button>
          <button onClick={handleReset} className="px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100">清空并重新开始</button>
        </>
      );
    }

    if (isRoundFinished) {
       return (
        <>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">关闭</button>
          <button onClick={handleReset} className="px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100">全部重来</button>
          <button onClick={handleSimulate} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
            {currentRound === 3 ? '进入最终轮' : `进入第 ${currentRound + 1} 轮`}
          </button>
        </>
       );
    }
    
    if (isExpectingUserInput) {
       return (
          <>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">关闭</button>
            <button onClick={handleAnalyze} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700">
              {currentRound === 3 ? '获取最终分析' : `获取第 ${currentRound} 轮分析`}
            </button>
          </>
        );
    }
    
    // Initial state or Resume state (if history is empty or manually cleared)
    if (history.length === 0) {
        return (
        <>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">关闭</button>
            <button onClick={handleSimulate} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
            模拟反馈 (第1轮)
            </button>
        </>
        );
    }
    
    // Fallback for weird states
    return <button onClick={onClose} className="px-4 py-2 bg-gray-200">关闭</button>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-gray-100 rounded-lg shadow-2xl p-6 w-full max-w-3xl m-4 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-xl font-bold text-gray-800">审计发现沟通演练 {history.length > 0 && `(第${currentRound > 3 ? 3 : currentRound}轮)`}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        <div className="overflow-y-auto pr-2 space-y-4 flex-1">
          <FindingDetails finding={finding} />
          
          {history.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">点击下方按钮开始模拟被审计单位的反馈。</p>
          )}
          
          {history.map((turn, index) => <DialogueTurn key={index} turn={turn} />)}

          {isExpectingUserInput && (
            <div>
              <h3 className="text-md font-semibold text-gray-800 mb-2">您的回应策略 (第{currentRound}轮)</h3>
              <textarea
                value={currentUserInput}
                onChange={(e) => setCurrentUserInput(e.target.value)}
                placeholder={currentRound === 3 ? `在此处输入您最终的、基于事实和证据的回应...` : `在此处输入您对第${currentRound}轮反驳的回应...`}
                rows={5}
                className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                disabled={isLoading}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <div ref={endOfMessagesRef} />
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
          {renderFooter()}
        </div>
      </div>
    </div>
  );
};
