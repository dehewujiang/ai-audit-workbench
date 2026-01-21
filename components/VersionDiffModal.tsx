import React, { useState, useEffect, useMemo } from 'react';
import { AuditProgram, DiffResult } from '../types';
import { compareAuditPrograms } from '../utils/diffEngine';
import { CloseIcon, CompareIcon } from './icons';
import { useProject } from '../contexts/ProjectContext';

interface VersionDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getVersionLabel = (program: AuditProgram, index: number, total: number) => {
    const date = new Date(program.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `版本 ${total - index} - ${date} - ${program.revisionReason || ''}`;
};


export const VersionDiffModal: React.FC<VersionDiffModalProps> = ({ isOpen, onClose }) => {
  const { activeProjectState } = useProject();
  const { auditPrograms: programs } = activeProjectState;
  
  const [baseVersionId, setBaseVersionId] = useState<string>('');
  const [compareVersionId, setCompareVersionId] = useState<string>('');

  const reversedPrograms = useMemo(() => [...programs].reverse(), [programs]);

  useEffect(() => {
    if (isOpen && reversedPrograms.length > 1) {
      setCompareVersionId(reversedPrograms[0]?.id || '');
      setBaseVersionId(reversedPrograms[1]?.id || '');
    }
  }, [isOpen, reversedPrograms]);

  const baseProgram = useMemo(() => programs.find(p => p.id === baseVersionId), [programs, baseVersionId]);
  const compareProgram = useMemo(() => programs.find(p => p.id === compareVersionId), [programs, compareVersionId]);

  const diffResult = useMemo(() => {
    if (baseProgram && compareProgram) {
      return compareAuditPrograms(baseProgram, compareProgram);
    }
    return [];
  }, [baseProgram, compareProgram]);
  
  const stats = useMemo(() => {
    return diffResult.reduce((acc, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + 1;
        return acc;
    }, {} as Record<DiffResult['type'], number>);
  }, [diffResult]);

  if (!isOpen) return null;
  
  const renderProcedure = (proc: any, diffs?: any) => (
      <>
          <td className="p-2 align-top text-sm break-words"><div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: diffs ? diffs.risk : proc.risk.replace(/\n/g, '<br>') }} /></td>
          <td className="p-2 align-top text-sm break-words"><div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: diffs ? diffs.control : proc.control.replace(/\n/g, '<br>') }} /></td>
          <td className="p-2 align-top text-sm break-words"><div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: diffs ? diffs.testStep : proc.testStep.replace(/\n/g, '<br>') }} /></td>
      </>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-7xl m-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <style>{`.diff-view del { background-color: #fee2e2; text-decoration: none; border-radius: 2px; } .diff-view ins { background-color: #dcfce7; text-decoration: none; border-radius: 2px; }`}</style>
        <div className="flex justify-between items-center border-b pb-3 mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3"><CompareIcon className="h-6 w-6 text-blue-600" />审计程序版本对比</h2>
          <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600"><CloseIcon className="h-6 w-6" /></button>
        </div>

        <div className="grid grid-cols-2 gap-4 items-center mb-4 flex-shrink-0">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">基准版本 (旧)</label>
                <select value={baseVersionId} onChange={e => setBaseVersionId(e.target.value)} className="w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                    {programs.map((p, i) => <option key={p.id} value={p.id}>{getVersionLabel(p, programs.length - 1 - i, programs.length)}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">对比版本 (新)</label>
                <select value={compareVersionId} onChange={e => setCompareVersionId(e.target.value)} className="w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                    {programs.map((p, i) => <option key={p.id} value={p.id}>{getVersionLabel(p, programs.length - 1 - i, programs.length)}</option>)}
                </select>
            </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm mb-3 border-t pt-3 flex-shrink-0">
            <span className="font-semibold">差异统计:</span>
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-200 rounded-sm"></div> {stats.added || 0} 新增</span>
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-200 rounded-sm"></div> {stats.deleted || 0} 删除</span>
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-yellow-100 rounded-sm"></div> {stats.modified || 0} 修改</span>
            <span className="flex items-center gap-1.5 text-gray-500">{stats.unchanged || 0} 未变</span>
        </div>

        <div className="overflow-y-auto flex-1 diff-view">
          <table className="min-w-full table-fixed border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="w-10 p-2 text-left text-xs font-semibold text-gray-600"></th>
                <th className="w-28 p-2 text-left text-xs font-semibold text-gray-600">旧版本程序ID</th>
                <th className="w-28 p-2 text-left text-xs font-semibold text-gray-600">新版本程序ID</th>
                <th className="w-1/3 p-2 text-left text-xs font-semibold text-gray-600">已识别风险</th>
                <th className="w-1/3 p-2 text-left text-xs font-semibold text-gray-600">现有控制</th>
                <th className="w-1/3 p-2 text-left text-xs font-semibold text-gray-600">审计测试步骤</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {diffResult.length === 0 && (!stats.unchanged) && (
                    <tr><td colSpan={6} className="text-center p-8 text-gray-500">选择的版本相同，或未找到差异。</td></tr>
                )}
                {diffResult.map((item, index) => {
                    let rowClass = '';
                    let symbol = '';
                    switch (item.type) {
                        case 'added': rowClass = 'bg-green-50'; symbol = '+'; break;
                        case 'deleted': rowClass = 'bg-red-50'; symbol = '-'; break;
                        case 'modified': rowClass = 'bg-yellow-50'; symbol = '~'; break;
                        default: rowClass = '';
                    }
                    return (
                        <tr key={index} className={rowClass}>
                             <td className="p-2 text-center font-mono font-bold text-lg">{symbol}</td>
                             <td className="p-2 align-top text-sm font-mono text-gray-500">{item.oldProcedure?.id}</td>
                             <td className="p-2 align-top text-sm font-mono text-gray-500">{item.newProcedure?.id}</td>
                             {item.type === 'added' && renderProcedure(item.newProcedure)}
                             {item.type === 'deleted' && renderProcedure(item.oldProcedure)}
                             {item.type === 'modified' && renderProcedure(item.newProcedure, item.fieldDiffs)}
                             {item.type === 'unchanged' && renderProcedure(item.newProcedure)}
                        </tr>
                    );
                })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t pt-4 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">关闭</button>
        </div>
      </div>
    </div>
  );
};