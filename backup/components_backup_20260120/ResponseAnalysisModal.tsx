
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { marked } from 'marked';
import { Finding, DrillTurn } from '../types';
import { Spinner } from './icons';
import { useProject } from '../contexts/ProjectContext';
import { useUI } from '../contexts/UIContext';

interface ResponseAnalysisModalProps {
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
            case 'auditee': return { icon: '🗣️', label: '被审计单位 (真实回复)', color: 'bg-yellow-100 border-yellow-300' };
            case 'coach': return { icon: '🎓', label: '教练分析', color: 'bg-green-100 border-green-300' };
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


export const ResponseAnalysisModal: React.FC<ResponseAnalysisModalProps> = ({ isOpen, onClose }) => {
  const { handleAnalyzeAuditeeResponse, handleUpdateFinding } = useProject();
  const { selectedFinding: finding } = useUI();
  const [history, setHistory] = useState<DrillTurn[]>([]);
  const [currentUserInput, setCurrentUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  
  const currentRound = Math.floor(history.length / 2) + 1;
  const isExpectingAuditeeInput = history.length % 2 === 0; // 0, 2, 4...

  // Load history from finding when modal opens
  useEffect(() => {
    if (isOpen && finding) {
      setHistory(finding.responseAnalysisHistory || []);
      setCurrentUserInput('');
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen, finding]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);
  
  const handleReset = () => {
      if (confirm('确定要清空所有分析记录并重新开始吗？此操作将更新已保存的记录。')) {
          setHistory([]);
          setCurrentUserInput('');
          if (finding) {
              handleUpdateFinding({ ...finding, responseAnalysisHistory: [] });
          }
      }
  };
  
  if (!isOpen || !finding) return null;

  const handleAnalyze = async () => {
    const realResponse = currentUserInput.trim();
    if (!realResponse) {
      setError('请粘贴被审计单位的回复内容。');
      return;
    }
    setIsLoading(true);
    setError(null);
    
    // Append real auditee response
    const tempHistory: DrillTurn[] = [...history, { actor: 'auditee', text: realResponse, isSimulated: false }];
    
    try {
      const result = await handleAnalyzeAuditeeResponse(finding, tempHistory);
      const finalHistory: DrillTurn[] = [...tempHistory, { actor: 'coach', text: result }];
      
      setHistory(finalHistory);
      // Persist to global state
      handleUpdateFinding({ ...finding, responseAnalysisHistory: finalHistory });
      setCurrentUserInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析时发生未知错误');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyDraft = (round: number) => {
    const coachTurnIndex = round * 2 - 1;
    const coachTurn = history[coachTurnIndex];
    if (coachTurn) {
        const draftMatch = coachTurn.text.match(/### ✍️ 回应话术草稿 \(可复制\)([\s\S]*)/);
        if (draftMatch && draftMatch[1]) {
            navigator.clipboard.writeText(draftMatch[1].trim().replace(/<br\s*\/?>/gi, '\n'));
            alert('话术草稿已复制到剪贴板！');
        } else {
            alert('未找到可复制的话术草稿。');
        }
    }
  };

  const renderFooter = () => {
     if (isLoading) {
      return (
        <div className="flex justify-center items-center w-full">
            <Spinner className="h-6 w-6 text-blue-500 mr-2" />
            <span>正在分析...</span>
        </div>
      );
    }

    if (currentRound > 3) {
       return (
        <>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">关闭</button>
          <button onClick={handleReset} className="px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-md hover:bg-red-100">重新开始</button>
        </>
      );
    }
    
    return (
      <>
        <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">关闭</button>
        {history.length > 0 && <button onClick={() => handleCopyDraft(currentRound-1)} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">复制话稿</button>}
        {isExpectingAuditeeInput && (
          <button onClick={handleAnalyze} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
            {`分析第 ${currentRound} 轮回复`}
          </button>
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-3xl m-4 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-xl font-bold text-gray-800">审计发现回复分析与策略 {history.length > 0 && `(第${currentRound > 3 ? 3 : currentRound}轮)`}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        <div className="overflow-y-auto pr-2 space-y-4 flex-1">
          <FindingDetails finding={finding} />

          {history.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">在收到被审计单位的实际回复后，将其粘贴到下方进行分析。</p>
          )}

          {history.map((turn, index) => <DialogueTurn key={index} turn={turn} />)}
          
          {isExpectingAuditeeInput && currentRound <= 3 && (
            <div>
              <label htmlFor="auditee-response" className="block text-md font-semibold text-gray-800 mb-2">
                粘贴被审计单位的第 {currentRound} 轮回复
              </label>
              <textarea
                id="auditee-response"
                value={currentUserInput}
                onChange={(e) => setCurrentUserInput(e.target.value)}
                placeholder="在此处粘贴对方给出的新的、完整的真实回复。"
                rows={6}
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
