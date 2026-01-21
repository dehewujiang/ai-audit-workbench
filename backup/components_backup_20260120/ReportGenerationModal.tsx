
import React, { useState, useEffect } from 'react';
import { Finding } from '../types';
import { useProject } from '../contexts/ProjectContext';
import { useUI } from '../contexts/UIContext';

interface ReportGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportGenerationModal: React.FC<ReportGenerationModalProps> = ({ isOpen, onClose }) => {
  const { activeProjectState, handleGenerateReport } = useProject();
  const { isGeneratingReport } = useUI();
  
  const findings = activeProjectState.findings;

  const [title, setTitle] = useState('');
  const [auditee, setAuditee] = useState('');
  const [auditor, setAuditor] = useState('王二麻子');
  const [selectedFindings, setSelectedFindings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setTitle('关于XXX的专项审计报告');
      setAuditee('我和我的朋友们有限责任公司');
      const initialSelection: Record<string, boolean> = {};
      findings.forEach(f => { initialSelection[f.id] = true; });
      setSelectedFindings(initialSelection);
    }
  }, [isOpen, findings]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const includedFindingIds = Object.keys(selectedFindings).filter(id => selectedFindings[id]);
    // This now triggers the Chat PER flow instead of a direct generation
    handleGenerateReport({ title, auditee, auditor, includedFindingIds });
  };
  
  const hasSelectedFindings = Object.values(selectedFindings).some(Boolean);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-3xl m-4 flex flex-col max-h-[90vh]">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">审计报告生成配置</h2>
        
        <div className="space-y-4 overflow-y-auto pr-2 flex-1">
            <div>
            <label htmlFor="report-title" className="block text-sm font-medium text-gray-700 mb-1">报告标题</label>
            <input id="report-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isGeneratingReport} />
            </div>
            <div>
            <label htmlFor="report-auditee" className="block text-sm font-medium text-gray-700 mb-1">被审计单位</label>
            <input id="report-auditee" type="text" value={auditee} onChange={(e) => setAuditee(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isGeneratingReport} />
            </div>
            <div>
            <label htmlFor="report-auditor" className="block text-sm font-medium text-gray-700 mb-1">审计人员</label>
            <input id="report-auditor" type="text" value={auditor} onChange={(e) => setAuditor(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isGeneratingReport} />
            </div>
            <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">选择要纳入的审计发现 (共 {findings.length} 项):</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2 bg-gray-50">
                {findings.length === 0 && <p className="text-sm text-gray-500 p-2">暂无审计发现。请先在工作底稿中添加发现。</p>}
                {findings.map(finding => (
                <div key={finding.id} className="flex items-center">
                    <input id={`finding-checkbox-${finding.id}`} type="checkbox" checked={selectedFindings[finding.id] || false} onChange={() => setSelectedFindings(prev => ({ ...prev, [finding.id]: !prev[finding.id] }))} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" disabled={isGeneratingReport} />
                    <label htmlFor={`finding-checkbox-${finding.id}`} className="ml-3 text-sm text-gray-800 truncate" title={finding.condition}>{finding.condition}</label>
                </div>
                ))}
            </div>
            </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 flex-shrink-0">
            <button onClick={onClose} disabled={isGeneratingReport} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50">取消</button>
            <button onClick={handleSubmit} disabled={isGeneratingReport || !hasSelectedFindings} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center gap-2">
                开始生成大纲 (进入对话)
            </button>
        </div>
      </div>
    </div>
  );
};
