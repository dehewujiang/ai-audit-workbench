
import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { CheckIcon, CloseIcon, SpreadsheetIcon, LightbulbIcon, RedoIcon, PencilIcon } from './icons';
import { marked } from 'marked';
import { AuditProgram, AuditProcedure } from '../types';

interface DraftReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RiskLevelBadge: React.FC<{ level: string }> = ({ level }) => {
    const levelStyles = {
        '高': 'bg-red-100 text-red-800 border-red-200',
        '中': 'bg-orange-100 text-orange-800 border-orange-200',
        '低': 'bg-blue-100 text-blue-800 border-blue-200',
    };
    // 渲染态防御：如果 level 无效，显示“未定义”并应用灰色样式
    const style = levelStyles[level as keyof typeof levelStyles] || 'bg-gray-100 text-gray-500 border-gray-200 italic';
    return <span className={`px-2 py-0.5 text-xs font-medium border rounded-full ${style}`}>{level || '未识别'}</span>;
};

export const DraftReviewModal: React.FC<DraftReviewModalProps> = ({ isOpen, onClose }) => {
  const { activeProjectState, handleAcceptDraft, handleGenerateProgram, handleUpdateDraft } = useProject();
  const { draftProgram } = activeProjectState;
  
  const [isEditing, setIsEditing] = useState(false);
  const [localProgram, setLocalProgram] = useState<AuditProgram | null>(null);

  useEffect(() => {
      if (isOpen && draftProgram) {
          setLocalProgram(JSON.parse(JSON.stringify(draftProgram)));
          setIsEditing(false);
      }
  }, [isOpen, draftProgram]);

  if (!isOpen || !localProgram) return null;

  const handleRegenerate = () => {
      onClose();
      // Trigger regeneration with specific intent
      handleGenerateProgram("重新生成审计程序");
  };

  const handleStartEdit = () => {
      setIsEditing(true);
  };

  const handleCancelEdit = () => {
      // Revert to original draft
      if (draftProgram) {
          setLocalProgram(JSON.parse(JSON.stringify(draftProgram)));
      }
      setIsEditing(false);
  };

  const handleSaveEdit = () => {
      if (localProgram) {
          handleUpdateDraft(localProgram);
          setIsEditing(false);
      }
  };
  
  const handleProcedureChange = (index: number, field: keyof AuditProcedure, value: string) => {
      if (!localProgram) return;
      const newProcedures = [...localProgram.procedures];
      newProcedures[index] = { ...newProcedures[index], [field]: value } as AuditProcedure;
      setLocalProgram({ ...localProgram, procedures: newProcedures });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl m-4 h-[90vh] flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50 rounded-t-lg">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 text-white p-2 rounded-lg">
                <SpreadsheetIcon className="h-6 w-6" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-800">审查审计程序草稿 {isEditing && <span className="text-sm font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 ml-2">编辑模式</span>}</h2>
                <p className="text-sm text-slate-500">请在正式入库前，检查助手生成的逻辑与程序。</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content - Modified: Removed Reasoning Column and adjusted layout */}
        <div className="flex-1 overflow-y-auto p-6 flex bg-slate-100/50">
            
            {/* Structured Program - Now flex-1 and full width */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1">审计目标</h3>
                        <p className="text-slate-800 text-lg font-medium">{localProgram.objective}</p>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <table className="min-w-full table-fixed text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="w-16 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">ID</th>
                                <th className="w-24 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">风险等级</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-1/3">风险描述</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-1/3">控制措施</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-1/3">测试步骤</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {localProgram.procedures.map((proc, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 align-top text-sm font-mono text-slate-400">{proc.id}</td>
                                    
                                    <td className="px-4 py-3 align-top">
                                        {isEditing ? (
                                            <select 
                                                value={proc.riskLevel}
                                                onChange={e => handleProcedureChange(idx, 'riskLevel', e.target.value)}
                                                className="w-full p-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            >
                                                <option value="高">高</option>
                                                <option value="中">中</option>
                                                <option value="低">低</option>
                                                <option value="-">未定义</option>
                                            </select>
                                        ) : (
                                            <RiskLevelBadge level={proc.riskLevel} />
                                        )}
                                    </td>
                                    
                                    <td className="px-4 py-3 align-top text-sm text-slate-700">
                                        {isEditing ? (
                                            <textarea 
                                                value={proc.risk} 
                                                onChange={e => handleProcedureChange(idx, 'risk', e.target.value)}
                                                rows={4}
                                                className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                                            />
                                        ) : (
                                            proc.risk
                                        )}
                                    </td>

                                    <td className="px-4 py-3 align-top text-sm text-slate-700">
                                        {isEditing ? (
                                            <textarea 
                                                value={proc.control} 
                                                onChange={e => handleProcedureChange(idx, 'control', e.target.value)}
                                                rows={4}
                                                className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                                            />
                                        ) : (
                                            proc.control
                                        )}
                                    </td>

                                    <td className="px-4 py-3 align-top text-sm text-slate-700 font-medium">
                                        {isEditing ? (
                                            <textarea 
                                                value={proc.testStep} 
                                                onChange={e => handleProcedureChange(idx, 'testStep', e.target.value)}
                                                rows={4}
                                                className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                                            />
                                        ) : (
                                            proc.testStep
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white flex justify-between gap-3 rounded-b-lg">
          <div className="flex gap-3">
             <button onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-all shadow-sm">
                暂不采纳
             </button>
             {!isEditing && (
                 <button onClick={handleRegenerate} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm flex items-center gap-2">
                    <RedoIcon className="h-4 w-4" />
                    重新生成
                 </button>
             )}
          </div>

          <div className="flex gap-3">
             {isEditing ? (
                 <>
                    <button onClick={handleCancelEdit} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-all shadow-sm">
                        取消修改
                    </button>
                    <button onClick={handleSaveEdit} className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2">
                        <CheckIcon className="h-5 w-5" />
                        保存修改
                    </button>
                 </>
             ) : (
                 <>
                    <button onClick={handleStartEdit} className="px-5 py-2.5 bg-white border border-blue-200 text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2">
                        <PencilIcon className="h-4 w-4" />
                        修改草稿
                    </button>
                    <button onClick={handleAcceptDraft} className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-black transition-all shadow-lg shadow-slate-300 flex items-center gap-2">
                        <CheckIcon className="h-5 w-5" />
                        确认并入库
                    </button>
                 </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
