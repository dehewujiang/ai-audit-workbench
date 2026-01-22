
import React, { useState } from 'react';
import { marked } from 'marked';
import { Finding, ActionItem, DrillTurn, AIAnalysis } from '../types';
import { BookmarkIcon, PencilIcon, ConversationIcon, ClipboardIcon, ChevronDownIcon, FlagIcon, LightbulbIcon } from './icons';

interface FindingCardProps {
  finding: Finding;
  isSaved: boolean;
  isSelected: boolean;
  onUpdateFinding: (updatedFinding: Finding) => void;
  onToggleSnippet: (finding: Finding) => void;
  onStartCommDrill: (finding: Finding) => void;
  onStartResponseAnalysis: (finding: Finding) => void;
  onSelectItem: (id: string | null) => void;
  onStartEdit: () => void;
}

const InfoSection: React.FC<{ label: string; children: React.ReactNode; }> = ({ label, children }) => (
  <div className="mb-3">
    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</h4>
    <p className="text-gray-800 mt-1 text-sm whitespace-pre-wrap">{children}</p>
  </div>
);

// 5-Whys 图形化组件
const WhysVisualizer: React.FC<{ chain: string[] | string }> = ({ chain }) => {
    // 兼容性防御：如果 chain 是字符串（旧数据），按行拆分
    const steps = Array.isArray(chain) ? chain : chain.split('\n').filter(s => s.trim()).map(s => s.replace(/^\d+\.\s*/, ''));

    if (steps.length === 0) return <p className="text-xs text-gray-400 italic">暂无逻辑分析链</p>;

    return (
        <div className="flex flex-col items-center py-4 px-2 bg-slate-100/40 rounded-xl border border-slate-200/50">
            {steps.map((step, index) => (
                <React.Fragment key={index}>
                    <div className={`relative group w-full max-w-sm p-3 rounded-lg border shadow-sm transition-all duration-300 ${
                        index === steps.length - 1 
                        ? 'bg-blue-600 border-blue-700 text-white shadow-blue-100 ring-2 ring-blue-100' 
                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                    }`}>
                        <div className="flex items-start gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                index === steps.length - 1 ? 'bg-white/20' : 'bg-slate-100 text-slate-400'
                            }`}>
                                {index + 1}
                            </span>
                            <p className="text-xs leading-relaxed font-medium">{step}</p>
                        </div>
                        {index === 0 && <span className="absolute -top-2 left-4 text-[9px] font-bold text-slate-400 uppercase tracking-tighter bg-white px-1">现象</span>}
                        {index === steps.length - 1 && <span className="absolute -bottom-2 right-4 text-[9px] font-bold text-white uppercase tracking-tighter bg-blue-600 px-1 rounded shadow-sm">根因</span>}
                    </div>
                    
                    {index < steps.length - 1 && (
                        <div className="flex flex-col items-center py-1">
                            <div className="w-0.5 h-3 bg-slate-200"></div>
                            <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

const AIAnalysisDisplay: React.FC<{ analysis: AIAnalysis }> = ({ analysis }) => (
    <div className="space-y-4 text-sm bg-gray-50/70 p-3 rounded-md border border-gray-200">
        <div>
            <h5 className="font-semibold text-gray-700 flex items-center gap-2">
                <LightbulbIcon className="h-4 w-4 text-yellow-500" />
                AI 总结
            </h5>
            <p className="text-gray-800 mt-1 pl-1">{analysis.summary}</p>
        </div>
        <div>
            <h5 className="font-semibold text-gray-700 mb-2">根本原因假设</h5>
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                    <thead className="bg-gray-200/50">
                        <tr>
                            <th className="px-2 py-1 font-semibold">类别</th>
                            <th className="px-2 py-1 font-semibold">描述</th>
                            <th className="px-2 py-1 font-semibold">可能性</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/60 bg-white">
                        {analysis.rootCauseHypotheses.map((h, i) => (
                            <tr key={i}>
                                <td className="px-2 py-1.5 align-top"><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-medium">{h.category}</span></td>
                                <td className="px-2 py-1.5 align-top text-gray-700">{h.description}</td>
                                <td className="px-2 py-1.5 align-top text-gray-700">{h.likelihood}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <h5 className="font-semibold text-gray-700 mb-2">系统性/独立性</h5>
                <p className="text-gray-800 pl-1">{analysis.systemicVsIsolated}</p>
            </div>
            <div>
                <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-blue-500">⛓️</span> 5 Whys 因果追踪
                </h5>
                <WhysVisualizer chain={analysis['5WhysChain']} />
            </div>
        </div>
    </div>
);


const ActionItemDisplay: React.FC<{ item: ActionItem; onToggle: () => void; }> = ({ item, onToggle }) => (
    <div className="flex items-start py-1.5">
        <input
            id={item.id}
            type="checkbox"
            checked={item.completed}
            onChange={onToggle}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
        />
        <label htmlFor={item.id} className={`ml-3 text-sm ${item.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
            {item.text}
        </label>
    </div>
);

// PROF-2024-UI-MARKDOWN-ENHANCE: Apply markdown parsing to drill history display
const renderDrillTurn = (turn: DrillTurn, index: number) => {
    const roleMap = {
        'auditee': { icon: '🗣️', label: '被审计单位' },
        'user': { icon: '👨‍💼', label: '审计师' },
        'coach': { icon: '🎓', label: '教练' },
    };
    const { icon, label } = roleMap[turn.actor];
    return (
        <div key={index} className="text-sm">
            <p className="font-semibold">{icon} {label}:</p>
            <div 
                className="pl-6 text-gray-700 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0" 
                dangerouslySetInnerHTML={{ __html: marked.parse(turn.text) as string }} 
            />
        </div>
    );
};

export const FindingCard: React.FC<FindingCardProps> = ({ finding, isSaved, isSelected, onUpdateFinding, onToggleSnippet, onStartCommDrill, onStartResponseAnalysis, onSelectItem, onStartEdit }) => {
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    
    const handleToggleActionItem = (itemId: string) => {
        const updatedActionItems = finding.actionItems.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        onUpdateFinding({ ...finding, actionItems: updatedActionItems });
    };
    
    const history = finding.responseAnalysisHistory || [];
    const displayedHistory = isHistoryExpanded ? history : history.slice(-2);

    return (
        <div 
            onClick={() => onSelectItem(`finding-${finding.id}`)}
            className={`bg-white shadow-sm rounded-lg p-5 mb-4 border group relative transition-all duration-200 ease-in-out ${isSelected ? 'border-gray-400 shadow-md' : 'border-gray-200 hover:shadow-md hover:border-gray-300'}`}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-10">
                    <h3 className="font-semibold text-gray-800 text-base mb-3 flex items-center">
                       <FlagIcon className="h-5 w-5 mr-2 text-blue-500" /> 审计发现
                    </h3>
                    <InfoSection label="状况">{finding.condition}</InfoSection>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onStartEdit(); }} className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-100 rounded-full" title="编辑"><PencilIcon className="h-5 w-5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onToggleSnippet(finding); }} className={`p-2 rounded-full ${isSaved ? 'text-orange-500 hover:bg-orange-100' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-100'}`} title={isSaved ? "从片段库中移除" : "保存至片段库"}><BookmarkIcon className="h-5 w-5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onStartCommDrill(finding); }} className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-100 rounded-full" title="沟通演练"><ConversationIcon className="h-5 w-5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onStartResponseAnalysis(finding); }} className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-100 rounded-full" title="分析已有回复"><ClipboardIcon className="h-5 w-5" /></button>
                </div>
            </div>
            
            <details className="mt-2" open={isSelected}>
                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-blue-600 list-none [&::-webkit-details-marker]:hidden">
                    <span className="summary-text">查看详细信息 (标准、影响、AI分析)</span>
                </summary>
                <div className="mt-3 pl-2 border-l-2 border-gray-200 space-y-3">
                    <InfoSection label="标准">{finding.criteria}</InfoSection>
                    <InfoSection label="影响">{finding.effect}</InfoSection>
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">AI 分析与根本原因</h4>
                        <AIAnalysisDisplay analysis={finding.aiAnalysis} />
                    </div>
                </div>
            </details>
            
            <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">建议行动项</h4>
                <div className="divide-y divide-gray-200/60">
                    {finding.actionItems.map(item => <ActionItemDisplay key={item.id} item={item} onToggle={() => handleToggleActionItem(item.id)} />)}
                </div>
            </div>
            
            {history.length > 0 && (
                <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">沟通分析记录 ({history.length}轮)</h4>
                        {history.length > 2 && (
                            <button onClick={(e) => {e.stopPropagation(); setIsHistoryExpanded(!isHistoryExpanded)}} className="text-xs text-blue-600 hover:underline flex items-center">
                                {isHistoryExpanded ? '收起' : '展开全部'} <ChevronDownIcon className={`h-4 w-4 ml-1 transform transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                    </div>
                    <div className="space-y-3 p-3 bg-gray-50/70 rounded-md">
                        {displayedHistory.map(renderDrillTurn)}
                    </div>
                </div>
            )}
        </div>
    );
};
