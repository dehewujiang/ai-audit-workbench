
import React, { useState } from 'react';
import { Finding, KnowledgeSnippet, AIAnalysis, RootCauseHypothesis, DrillTurn } from '../types';
import { FlagIcon, PencilIcon } from './icons';
import { FindingCard } from './FindingCard';
import { useProject } from '../contexts/ProjectContext';
import { useGlobal } from '../contexts/GlobalContext';
import { useUI } from '../contexts/UIContext';

interface EditableFindingCardProps {
    finding: Finding;
    onSave: (updatedFinding: Finding) => void;
    onCancel: () => void;
}

const EditableFindingCard: React.FC<EditableFindingCardProps> = ({ finding, onSave, onCancel }) => {
    const [editedFinding, setEditedFinding] = useState(finding);

    const handleChange = (field: keyof Finding, value: string) => {
        setEditedFinding(prev => ({...prev, [field]: value} as Finding));
    };

    const handleAnalysisChange = (field: keyof AIAnalysis, value: any) => {
        setEditedFinding(prev => ({
            ...prev,
            aiAnalysis: { ...prev.aiAnalysis, [field]: value }
        }));
    };
    
    const handleHypothesisChange = (index: number, field: keyof RootCauseHypothesis, value: string) => {
        const updatedHypotheses = [...editedFinding.aiAnalysis.rootCauseHypotheses];
        updatedHypotheses[index] = { ...updatedHypotheses[index], [field]: value as any };
        setEditedFinding(prev => ({
            ...prev,
            aiAnalysis: { ...prev.aiAnalysis, rootCauseHypotheses: updatedHypotheses }
        }));
    };
    
    const EditableField: React.FC<{ label: string; field: keyof Finding, rows?: number }> = ({ label, field, rows=3 }) => (
        <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
            <textarea
                value={editedFinding[field] as string}
                onChange={(e) => handleChange(field, e.target.value)}
                rows={rows}
                className="w-full mt-1 p-2 border border-blue-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500"
            />
        </div>
    );
    
    return (
        <div className="bg-blue-50 shadow-md rounded-lg p-5 mb-4 border border-blue-400 space-y-4">
            <EditableField label="状况" field="condition" />
            <EditableField label="标准" field="criteria" />
            <EditableField label="影响" field="effect" />
            <EditableField label="初步原因" field="cause" />

            <div className="p-3 border border-blue-200 rounded-md bg-white space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">分析与根本原因 (编辑)</h4>
                <div>
                    <label className="text-xs font-semibold text-gray-500">总结</label>
                    <textarea value={editedFinding.aiAnalysis.summary} onChange={(e) => handleAnalysisChange('summary', e.target.value)} rows={2} className="w-full mt-1 p-1.5 border rounded-md text-sm" />
                </div>
                <div>
                     <label className="text-xs font-semibold text-gray-500">根本原因假设</label>
                     <div className="space-y-2 mt-1">
                        {editedFinding.aiAnalysis.rootCauseHypotheses.map((h, i) => (
                           <div key={i} className="grid grid-cols-5 gap-2 text-sm">
                             <input type="text" placeholder="类别" value={h.category} onChange={e => handleHypothesisChange(i, 'category', e.target.value)} className="col-span-1 p-1.5 border rounded" />
                             <input type="text" placeholder="描述" value={h.description} onChange={e => handleHypothesisChange(i, 'description', e.target.value)} className="col-span-3 p-1.5 border rounded" />
                             <input type="text" placeholder="可能性" value={h.likelihood} onChange={e => handleHypothesisChange(i, 'likelihood', e.target.value)} className="col-span-1 p-1.5 border rounded" />
                           </div>
                        ))}
                     </div>
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-500">系统性/独立性</label>
                    <textarea value={editedFinding.aiAnalysis.systemicVsIsolated} onChange={(e) => handleAnalysisChange('systemicVsIsolated', e.target.value)} rows={2} className="w-full mt-1 p-1.5 border rounded-md text-sm" />
                </div>
                 <div>
                    <label className="text-xs font-semibold text-gray-500">5 Whys 因果链 (按行分隔)</label>
                    <textarea 
                        value={Array.isArray(editedFinding.aiAnalysis['5WhysChain']) ? editedFinding.aiAnalysis['5WhysChain'].join('\n') : editedFinding.aiAnalysis['5WhysChain']} 
                        onChange={(e) => handleAnalysisChange('5WhysChain', e.target.value.split('\n'))} 
                        rows={5} 
                        className="w-full mt-1 p-1.5 border rounded-md text-sm font-mono" 
                        placeholder="第1层原因: 现象...&#10;第2层原因: 诱因...&#10;..."
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300">取消</button>
                <button onClick={() => onSave(editedFinding)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">保存</button>
            </div>
        </div>
    );
};


export const WorkbenchPanel: React.FC = () => {
  const { activeProjectState, handleUpdateFinding, handleToggleSnippet, handleStartCommDrill, handleStartResponseAnalysis } = useProject();
  const { globalState } = useGlobal();
  const { selectedItemId, setSelectedItemId } = useUI();
  const [editingId, setEditingId] = useState<string | null>(null);

  const findings = activeProjectState.findings;
  const snippets = globalState.snippets;

  if (findings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
        <FlagIcon className="h-16 w-16 mb-4 text-gray-300" />
        <h2 className="text-lg font-semibold">工作底稿为空</h2>
        <p className="mt-2 text-sm max-w-sm">
          在左侧面板中点击 <FlagIcon className="h-4 w-4 inline-block mx-1" /> “记录新发现”按钮来分析和记录新的审计发现。
        </p>
      </div>
    );
  }

  const handleSaveEdit = (updatedFinding: Finding) => {
      handleUpdateFinding(updatedFinding);
      setEditingId(null);
  };
  
  const handleToggleFindingSnippet = (finding: Finding) => {
    const condition = finding.condition || 'N/A';
    const criteria = finding.criteria || 'N/A';
    const effect = finding.effect || 'N/A';
    const summary = finding.aiAnalysis.summary || 'N/A';
    const hypotheses = finding.aiAnalysis.rootCauseHypotheses
        .map(h => `- ${h.category} (${h.likelihood}): ${h.description}`)
        .join('<br/>') || '未识别';
    const actionItems = finding.actionItems
        .map(item => `[${item.completed ? 'x' : ' '}] ${item.text}`)
        .join('<br/>') || '暂无';
    // 5whys 在片段中仍保留文本形式
    const whys = Array.isArray(finding.aiAnalysis['5WhysChain']) 
        ? finding.aiAnalysis['5WhysChain'].join(' -> ') 
        : finding.aiAnalysis['5WhysChain'];

    const content = `| 状况 (Condition) | 标准 (Criteria) | 影响 (Effect) | RCA总结 | 5-Whys因果链 | 建议行动项 |
|:---|:---|:---|:---|:---|:---|
| ${condition} | ${criteria} | ${effect} | ${summary} | ${whys} | ${actionItems} |`;

    handleToggleSnippet({ sourceId: finding.id, content, type: '审计发现' });
  };


  return (
    <div className="p-2 overflow-y-auto">
      {findings.map(finding => {
          if (editingId === finding.id) {
            return (
                <EditableFindingCard
                    key={`edit-${finding.id}`}
                    finding={finding}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingId(null)}
                />
            );
          }

          const isSaved = snippets.some(s => s.sourceId === finding.id);
          const isSelected = selectedItemId === `finding-${finding.id}`;
          
          return (
            <FindingCard
              key={finding.id}
              finding={finding}
              isSaved={isSaved}
              isSelected={isSelected}
              onUpdateFinding={handleUpdateFinding}
              onToggleSnippet={handleToggleFindingSnippet}
              onStartCommDrill={handleStartCommDrill}
              onStartResponseAnalysis={handleStartResponseAnalysis}
              onSelectItem={setSelectedItemId}
              onStartEdit={() => setEditingId(finding.id)}
            />
          );
      })}
    </div>
  );
};
