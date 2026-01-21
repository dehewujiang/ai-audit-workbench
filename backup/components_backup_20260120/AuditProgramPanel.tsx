
import React, { useState, useMemo } from 'react';
import { AuditProgram, AuditProcedure } from '../types';
import { BookmarkIcon, FeasibilityIcon, PencilIcon, LibraryIcon, CheckIcon, CompareIcon, ExportIcon } from './icons';
import { useProject } from '../contexts/ProjectContext';
import { useAudit } from '../contexts/AuditContext'; // New Hook
import { useGlobal } from '../contexts/GlobalContext';
import { useUI } from '../contexts/UIContext';
import { exportToCsv } from '../utils/csvExport';

// ... ProcedureEditDrawer (unchanged) ...
interface ProcedureEditDrawerProps {
    proc: AuditProcedure;
    onSave: (updatedProc: AuditProcedure) => void;
    onCancel: () => void;
}

const ProcedureEditDrawer: React.FC<ProcedureEditDrawerProps> = ({ proc, onSave, onCancel }) => {
    const [editedProc, setEditedProc] = useState(proc);

    const handleChange = (field: keyof AuditProcedure, value: string) => {
        if (field === 'risk' || field === 'control' || field === 'testStep' || field === 'riskLevel') {
            setEditedProc(prev => ({ ...prev, [field]: value }));
        }
    };

    return (
        <div className="bg-slate-50 p-6 rounded-lg shadow-inner border border-slate-200 my-2 mx-4 animate-fade-in relative">
            <div className="absolute -top-2 left-1/2 -ml-2 w-4 h-4 bg-slate-50 border-t border-l border-slate-200 transform rotate-45"></div>
            <div className="flex justify-between items-center mb-4 relative z-10">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <PencilIcon className="h-4 w-4 text-slate-500" />
                    编辑审计程序 ({proc.id})
                </h4>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-md text-sm hover:bg-slate-50 transition-colors">取消</button>
                    <button onClick={() => onSave(editedProc)} className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 shadow-sm font-medium transition-colors flex items-center gap-1">
                        <CheckIcon className="h-3.5 w-3.5" /> 保存修改
                    </button>
                </div>
            </div>
            
            {/* 增加了风险等级的选择编辑 */}
            <div className="mb-4 relative z-10">
                 <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">风险等级</label>
                 <select 
                    value={editedProc.riskLevel} 
                    onChange={e => handleChange('riskLevel', e.target.value)}
                    className="p-2 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500"
                 >
                    <option value="高">高</option>
                    <option value="中">中</option>
                    <option value="低">低</option>
                 </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                <div className="flex flex-col group">
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase group-focus-within:text-blue-600 transition-colors">风险描述</label>
                    <textarea value={editedProc.risk} onChange={(e) => handleChange('risk', e.target.value)} className="w-full flex-1 min-h-[200px] p-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y outline-none transition-shadow shadow-sm" placeholder="描述潜在的风险..." />
                </div>
                <div className="flex flex-col group">
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase group-focus-within:text-blue-600 transition-colors">控制措施</label>
                    <textarea value={editedProc.control} onChange={(e) => handleChange('control', e.target.value)} className="w-full flex-1 min-h-[200px] p-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y outline-none transition-shadow shadow-sm" placeholder="描述现有的控制..." />
                </div>
                <div className="flex flex-col group">
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase group-focus-within:text-blue-600 transition-colors">测试步骤</label>
                    <textarea value={editedProc.testStep} onChange={(e) => handleChange('testStep', e.target.value)} className="w-full flex-1 min-h-[200px] p-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y outline-none transition-shadow shadow-sm" placeholder="描述审计测试步骤..." />
                </div>
            </div>
        </div>
    );
};

// 强化 RiskLevelBadge 以应对意外数据
const RiskLevelBadge: React.FC<{ level: string }> = ({ level }) => {
    const levelStyles = {
        '高': 'bg-red-50 text-red-700 border border-red-200 ring-1 ring-red-100',
        '中': 'bg-orange-50 text-orange-700 border border-orange-200 ring-1 ring-orange-100',
        '低': 'bg-blue-50 text-blue-700 border border-blue-200 ring-1 ring-blue-100',
    };
    const style = levelStyles[level as keyof typeof levelStyles] || 'bg-gray-50 text-gray-400 border-gray-200 italic';
    return <span className={`px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full border ${style}`}>{level || '未识别'}</span>;
};

export const AuditProgramPanel: React.FC = () => {
  // OPTIMIZATION: Use useAudit() directly
  const { auditPrograms, activeProgramId } = useAudit(); 
  const { handleUpdateProgram, handleToggleSnippet, handleAssessFeasibility, switchProgramVersion } = useProject();
  const { globalState } = useGlobal();
  const { selectedItemId, setSelectedItemId, showModal } = useUI();
  
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedRowIndices, setExpandedRowIndices] = useState<Set<number>>(new Set());

  const program = auditPrograms.find(p => p.id === activeProgramId) || null;
  const snippets = globalState.snippets;

  const reversedPrograms = useMemo(() => [...auditPrograms].reverse(), [auditPrograms]);

  if (!program) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <LibraryIcon className="h-8 w-8 text-slate-300" />
              </div>
              <h2 className="text-lg font-semibold text-slate-700">暂无审计程序</h2>
              <p className="mt-2 text-sm max-w-sm">请在左侧与助手对话，告知审计目标，为您生成定制化的审计程序。</p>
          </div>
      );
  }
  
  const handleToggleProcedureSnippet = (proc: AuditProcedure, sourceId: string) => {
    const content = `| ID | 风险水平 | 风险 | 控制 | 测试步骤 |
|:---|:---|:---|:---|:---|
| ${proc.id} | ${proc.riskLevel} | ${proc.risk} | ${proc.control} | ${proc.testStep} |`;
    handleToggleSnippet({ sourceId, content, type: "完整审计程序" });
  };

  const handleSaveEdit = (updatedProc: AuditProcedure) => {
    if (program && editingIndex !== null) {
        const updatedProcedures = [...program.procedures];
        updatedProcedures[editingIndex] = updatedProc;
        handleUpdateProgram(program, updatedProcedures);
        setEditingIndex(null);
    }
  };
  
  const toggleRowExpansion = (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedRowIndices(prev => {
          const newSet = new Set(prev);
          if (newSet.has(index)) newSet.delete(index);
          else newSet.add(index);
          return newSet;
      });
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2">
                <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">审计目标</h3>
             </div>
             <div className="flex items-center gap-2">
                {/* 方案 UI-REF-2024-CONTEXT-015: 将版本对比移入此处 */}
                <button 
                  onClick={() => showModal('diff')} 
                  disabled={auditPrograms.length < 2} 
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-30" 
                  title="版本对比"
                >
                    <CompareIcon className="h-4 w-4"/>
                </button>

                {auditPrograms.length > 1 && (
                    <select
                        value={program.id}
                        onChange={(e) => switchProgramVersion(e.target.value)}
                        className="p-1.5 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-200 outline-none cursor-pointer"
                    >
                        {reversedPrograms.map((p, index) => {
                            const date = new Date(p.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                            return <option key={p.id} value={p.id}>版本 {reversedPrograms.length - index} ({date})</option>;
                        })}
                    </select>
                )}

                {/* 方案 UI-REF-2024-CONTEXT-015: 将导出 CSV 移入此处 */}
                <div className="h-4 w-px bg-slate-200 mx-1"></div>
                <button 
                    onClick={() => exportToCsv(program)} 
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all border border-slate-200 shadow-sm"
                >
                    <ExportIcon className="h-3.5 w-3.5"/>
                    导出 CSV
                </button>
             </div>
        </div>
        <p className="text-slate-800 leading-relaxed text-lg font-medium">{program.objective}</p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">执行程序 ({program.procedures.length})</h3>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="min-w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="w-16 px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="w-20 px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">等级</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">风险描述</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">控制措施</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">测试步骤</th>
                <th className="w-16 px-2 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {program.procedures.map((proc, index) => {
                const sourceId = `${program.id}-proc-${index}`;
                const isSaved = snippets.some(s => s.sourceId === sourceId);
                const isSelected = selectedItemId === `procedure-${index}`;
                const isEditing = editingIndex === index;
                const isExpanded = expandedRowIndices.has(index);

                return (
                    <React.Fragment key={`proc-group-${index}`}>
                        <tr 
                        onClick={() => setSelectedItemId(`procedure-${index}`)}
                        className={`group transition-colors cursor-default hover:bg-slate-50/80 ${isSelected || isEditing ? 'bg-blue-50/30' : ''}`}
                        >
                        <td className="px-6 py-5 align-top text-sm font-mono font-medium text-slate-400">{proc.id}</td>
                        <td className="px-6 py-5 align-top"><RiskLevelBadge level={proc.riskLevel} /></td>
                        <td className="px-6 py-5 align-top text-sm text-slate-700 leading-relaxed">
                            <div onClick={(e) => toggleRowExpansion(index, e)} className={`cursor-pointer hover:bg-slate-100 rounded p-1 -m-1 transition-colors ${isExpanded ? '' : 'line-clamp-3'}`}>
                                {proc.risk}
                            </div>
                        </td>
                        <td className="px-6 py-5 align-top text-sm text-slate-700 leading-relaxed">
                            <div onClick={(e) => toggleRowExpansion(index, e)} className={`cursor-pointer hover:bg-slate-100 rounded p-1 -m-1 transition-colors ${isExpanded ? '' : 'line-clamp-3'}`}>
                                {proc.control}
                            </div>
                        </td>
                        <td className="px-6 py-5 align-top text-sm text-slate-700 leading-relaxed group-hover:text-slate-900">
                            <div className="relative">
                                <div onClick={(e) => toggleRowExpansion(index, e)} className={`cursor-pointer hover:bg-slate-100 rounded p-1 -m-1 transition-colors ${isExpanded ? '' : 'line-clamp-3'}`}>
                                    {proc.testStep}
                                </div>
                                {proc.sourceSnippetId && (
                                <span className="inline-block ml-2 text-blue-400" title={`参考自知识片段:\n\n${snippets.find(s => s.id === proc.sourceSnippetId)?.content || '内容'}`}>
                                    <LibraryIcon className="h-3 w-3" />
                                </span>
                                )}
                            </div>
                        </td>
                        <td className="px-2 py-5 align-top text-center">
                            <div className={`flex flex-col justify-center items-center gap-2 transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <button onClick={(e) => { e.stopPropagation(); handleAssessFeasibility(proc); }} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title="可行性评估"><FeasibilityIcon className="h-4 w-4" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setEditingIndex(isEditing ? null : index); }} className={`p-1.5 rounded-md transition-colors ${isEditing ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-200' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`} title={isEditing ? "收起编辑" : "编辑"}><PencilIcon className="h-4 w-4" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleToggleProcedureSnippet(proc, sourceId); }} className={`p-1.5 rounded-md transition-colors ${isSaved ? 'text-orange-500 bg-orange-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`} title={isSaved ? "已收藏" : "收藏"}><BookmarkIcon className="h-4 w-4" /></button>
                            </div>
                        </td>
                        </tr>
                        {isEditing && (
                            <tr className="animate-slide-down">
                                <td colSpan={6} className="p-0 border-b border-slate-100 bg-slate-50/30 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                    <ProcedureEditDrawer proc={proc} onSave={handleSaveEdit} onCancel={() => setEditingIndex(null)} />
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@keyframes slide-down { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } } .animate-slide-down { animation: slide-down 0.2s ease-out forwards; }`}</style>
    </div>
  );
};
