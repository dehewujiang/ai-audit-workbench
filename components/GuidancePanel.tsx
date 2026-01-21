
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import * as aiService from '../services/aiService';
import { AIEnrichedFormField } from './AIEnrichedFormField';
import { PencilIcon, ChevronLeftIcon } from './icons';
import { useProject } from '../contexts/ProjectContext';
import { marked } from 'marked';
import { useGlobal } from '../contexts/GlobalContext';

interface GuidancePanelProps {
  projectName: string;
  user: User | null;
  isOverviewMode?: boolean;
}

// PROF-2024-UI-MARKDOWN-ENHANCE: Consistent Typography for Guidance Panel
const GUIDANCE_MARKDOWN_STYLES = `
  prose prose-sm max-w-none text-slate-700 
  prose-headings:font-bold prose-headings:text-slate-900 prose-headings:mt-2 prose-headings:mb-1
  prose-p:my-1 prose-p:leading-relaxed
  prose-ul:my-1 prose-ul:list-disc prose-ul:pl-4
  prose-ol:my-1 prose-ol:list-decimal prose-ol:pl-4
  prose-li:my-0.5 prose-li:marker:text-slate-400
  prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-slate-50 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r-md prose-blockquote:text-slate-600 prose-blockquote:font-medium prose-blockquote:italic
  prose-pre:bg-slate-800 prose-pre:text-white prose-pre:rounded-lg prose-pre:shadow-sm prose-pre:p-2 prose-pre:text-xs
  prose-code:text-pink-600 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono prose-code:text-[0.9em]
  prose-code:before:content-none prose-code:after:content-none
  prose-strong:font-bold prose-strong:text-slate-900
  prose-table:border-collapse prose-table:w-full prose-table:text-xs prose-table:border prose-table:border-slate-200
  prose-th:bg-slate-50 prose-th:text-slate-700 prose-th:p-1 prose-th:border prose-th:border-slate-200 prose-th:text-left
  prose-td:p-1 prose-td:border prose-td:border-slate-200
`;

const AutoGrowingTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [props.value]);

    return (
        <textarea
            ref={textareaRef}
            rows={4}
            {...props}
            className={`${props.className || ''} resize-none`}
        />
    );
};

const CheckboxGroup: React.FC<{ options: string[]; value: string[]; onChange: (selected: string[]) => void; disabled?: boolean; }> = ({ options, value, onChange, disabled }) => (
    <div className="space-y-2">
        {options.map(option => {
            const isChecked = value.includes(option);
            return (
                <label key={option} className={`flex items-center gap-2 p-2 rounded-md ${disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-gray-100 cursor-pointer'}`}>
                    <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                            if (disabled) return;
                            const newValue = isChecked ? value.filter(v => v !== option) : [...value, option];
                            onChange(newValue);
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={disabled}
                    />
                    <span className="text-sm text-gray-800">{option}</span>
                </label>
            )
        })}
    </div>
);

const RadioGroup: React.FC<{ options: string[]; value: string; onChange: (selected: string) => void; disabled?: boolean; }> = ({ options, value, onChange, disabled }) => (
    <div className="space-y-2">
        {options.map(option => (
            <label key={option} className={`flex items-center gap-2 p-2 rounded-md ${disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-gray-100 cursor-pointer'}`}>
                <input
                    type="radio"
                    name="radio-group"
                    checked={value === option}
                    onChange={() => onChange(option)}
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={disabled}
                />
                <span className="text-sm text-gray-800">{option}</span>
            </label>
        ))}
    </div>
);

const stageTitles = ["", "项目基础信息", "审计对象与范围", "风险与目标", "控制环境了解", "舞弊风险评估", "资源与约束", "利益相关方", "特殊考虑"];

const stageFields: Record<number, { name: string, label: string, helpText?: string, isTextArea: boolean }[]> = {
    1: [
        { name: 'auditType', label: '审计类型 (可多选)', isTextArea: false },
        { name: 'triggerReason', label: '审计触发原因', isTextArea: false },
    ],
    2: [
        { name: 'auditeeDept', label: '被审计单位/部门', helpText: '请提供名称、组织架构位置、负责人、人员规模等信息。', isTextArea: true },
        { name: 'scope', label: '审计范围', helpText: '请明确审计期间、涉及的业务流程/系统、地域范围等。', isTextArea: true },
        { name: 'boundaries', label: '审计边界', helpText: '请明确包含和排除的内容，以及特别关注的领域。', isTextArea: true },
    ],
    3: [
        { name: 'objectives', label: '审计目标', helpText: '请描述具体、可衡量的主要和次要目标。', isTextArea: true },
        { name: 'knownRisks', label: '已识别的主要风险', helpText: '请列出固有风险、控制风险、舞弊风险等，并标注风险等级。', isTextArea: true },
        { name: 'history', label: '历史审计发现', helpText: '以往审计发现的问题、整改情况、反复出现的问题。', isTextArea: true },
    ],
    4: [
        { name: 'controlSystem', label: '现有内部控制体系', helpText: '描述控制框架 (COSO/其他), 关键控制点, 控制测试历史, 已知控制缺陷。', isTextArea: true },
        { name: 'policies', label: '相关政策制度', helpText: '列出公司政策, 行业规范, 法律法规, 以及最近的政策变更。', isTextArea: true },
        { name: 'itEnvironment', label: '信息系统环境', helpText: '描述使用的主要系统, 系统控制程度, 数据可获得性, IT审计需求。', isTextArea: true },
    ],
    5: [
        { name: 'fraudPressure', label: '压力/动机因素', helpText: '分析可能导致舞弊的业绩压力, 财务困难, 或不合理的目标。', isTextArea: true },
        { name: 'fraudOpportunity', label: '机会因素', helpText: '描述控制薄弱环节, 监督缺失区域, 或职责分离问题。', isTextArea: true },
        { name: 'fraudRationalization', label: '合理化因素', helpText: '评估企业文化, 道德氛围, 或历史违规情况。', isTextArea: true },
        { name: 'fraudScenarios', label: '高风险舞弊情景 (如适用)', helpText: '列出具体的资产侵占, 财务报表舞弊, 或腐败舞弊风险点。', isTextArea: true },
    ],
    6: [
        { name: 'resources', label: '审计资源', helpText: '说明审计团队规模, 专业背景要求, 是否需要外部专家, 预算限制。', isTextArea: true },
        { name: 'timeline', label: '时间安排', helpText: '明确计划开始日期, 要求完成日期, 关键时间节点。', isTextArea: true },
        { name: 'dataAvailability', label: '数据与文档可获得性', helpText: '评估可获取的数据类型, 数据质量, 访问权限, 文档完整性。', isTextArea: true },
        { name: 'constraints', label: '其他约束条件', helpText: '例如业务连续性要求, 保密性要求, 访谈限制等。', isTextArea: true },
    ],
    7: [
        { name: 'stakeholders', label: '关键利益相关方', helpText: '列出审计委员会, 高级管理层, 被审计部门, 监管机构等。', isTextArea: true },
        { name: 'communicationReqs', label: '沟通要求', helpText: '明确报告对象, 沟通频率, 报告格式要求等。', isTextArea: true },
    ],
    8: [
        { name: 'sensitivity', label: '敏感性评估', helpText: '评估项目可能涉及的政治敏感性, 商业敏感性, 或人际关系复杂度。', isTextArea: true },
        { name: 'otherInfo', label: '其他重要信息', helpText: '任何您认为相关的背景信息, 特殊关注事项, 或预期的挑战。', isTextArea: true },
    ]
};


export const GuidancePanel: React.FC<GuidancePanelProps> = ({ projectName, user, isOverviewMode }) => {
  const { activeProjectState, handleGuidanceUpdate, handleGuidanceSave, handleGenerateProgram } = useProject();
  const { globalState } = useGlobal();
  
  // Safe access to state with defaults to prevent crashes
  const currentStage = activeProjectState?.guidanceStage || 1;
  const data = activeProjectState?.collectedGuidanceData || {};

  // Use a ref to track the latest data without triggering re-renders or dependency loops in useEffect
  const dataRef = useRef(data);
  useEffect(() => {
      dataRef.current = data;
  }, [data]);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [aiContentCache, setAiContentCache] = useState<Record<string, { options?: string[]; explanation?: string; }>>({});
  const [loadingFields, setLoadingFields] = useState<Set<string>>(new Set());
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  
  // Ref to track ongoing requests to prevent duplicates
  const fetchingKeys = useRef<Set<string>>(new Set());
  
  const [editingStage, setEditingStage] = useState<number | null>(null);
  const [stageFormData, setStageFormData] = useState<Record<string, any>>({});


  useEffect(() => {
    setFormData(data);
    if(isOverviewMode) {
      setEditingStage(null);
    }
  }, [currentStage, data, isOverviewMode]);
  
  const fetchAIContent = useCallback(async (stage: number, fieldName: string, fieldLabel: string) => {
      const cacheKey = `stage${stage}-${fieldName}`;
      
      // Check if we already have cached content OR if a request is already in flight
      if (aiContentCache[cacheKey] || fetchingKeys.current.has(cacheKey)) return;

      // Mark as fetching immediately
      fetchingKeys.current.add(cacheKey);
      setLoadingFields(prev => new Set(prev).add(cacheKey));
      
      try {
          // Use dataRef.current to get latest data without adding 'data' to dependency array
          const content = await aiService.generateGuidanceOptions({
              projectName,
              stageNumber: stage,
              fieldName,
              fieldLabel,
              collectedData: dataRef.current,
              user,
              entityProfile: globalState.entityProfile,
          });
          setAiContentCache(prev => ({ ...prev, [cacheKey]: content }));
      } catch (error) {
          console.error(`Failed to fetch AI content for ${fieldName}:`, error);
          setAiContentCache(prev => ({ ...prev, [cacheKey]: { options: [], explanation: "无法加载建议。" } }));
      } finally {
          // Remove from fetching set
          fetchingKeys.current.delete(cacheKey);
          setLoadingFields(prev => {
              const newSet = new Set(prev);
              newSet.delete(cacheKey);
              return newSet;
          });
      }
  }, [aiContentCache, projectName, user, globalState.entityProfile]);


  useEffect(() => {
    // 方案 REF-2024-GUIDE-SCOPE-021: 仅在 3, 4, 5 阶段触发 AI 建议
    const AI_STAGES = [3, 4, 5];
    if (!isOverviewMode && currentStage && AI_STAGES.includes(currentStage)) {
      const fieldsToFetch = stageFields[currentStage];
      if (fieldsToFetch) {
        fieldsToFetch.forEach(field => {
            fetchAIContent(currentStage, field.name, field.label);
        });
      }
    }
  }, [currentStage, fetchAIContent, isOverviewMode]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleStageFormChange = (field: string, value: any) => {
    setStageFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNav = (nextStage: number) => {
    // Save current data
    handleGuidanceUpdate(formData, nextStage);
    
    // If finishing the last stage (8 -> 9), Trigger Generation
    if (currentStage === 8 && nextStage === 9) {
        // Trigger generation immediately
        handleGenerateProgram("项目背景信息已收集完毕，请基于这些信息生成审计程序。");
    }
  };

  const handleSkipClick = () => {
    setShowSkipWarning(true);
  };

  const handleConfirmSkip = () => {
      setShowSkipWarning(false);
      handleNav(0);
  };

  const handleEdit = (stageNum: number) => {
    const stageData: Record<string, any> = {};
    stageFields[stageNum].forEach(field => {
        stageData[field.name] = data[field.name] || '';
    });
    setStageFormData(stageData);
    setEditingStage(stageNum);
  };
  
  const handleSaveEdit = () => {
    handleGuidanceSave(stageFormData);
    setEditingStage(null);
  };
  
  const renderSimpleForm = (stageNum: number) => {
     if (stageNum === 1) {
       return (
          <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">审计类型 (可多选)</label>
                <CheckboxGroup options={["财务审计", "运营审计", "合规审计", "信息系统审计", "舞弊调查", "专项审计", "其他"]} value={stageFormData.auditType || []} onChange={v => handleStageFormChange('auditType', v)} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">审计触发原因</label>
                <RadioGroup options={["年度审计计划", "风险评估结果", "管理层要求", "舞弊举报", "监管要求", "事件驱动", "其他"]} value={stageFormData.triggerReason || ''} onChange={v => handleStageFormChange('triggerReason', v)} />
            </div>
          </div>
        );
    }
    
    return (
      <div className="space-y-4">
        {stageFields[stageNum].map(field => (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">{field.label}</label>
            <AutoGrowingTextarea
              id={field.name}
              value={stageFormData[field.name] || ''}
              onChange={e => handleStageFormChange(field.name, e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        ))}
      </div>
    );
  };

  const renderWizardStageContent = () => {
    if (!currentStage || currentStage < 1 || currentStage > 8) {
        return <p>阶段 {currentStage} 内容待定义。</p>;
    }

    if (currentStage === 1) {
       return (
          <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">审计类型 (可多选)</label>
                <CheckboxGroup options={["财务审计", "运营审计", "合规审计", "信息系统审计", "舞弊调查", "专项审计", "其他"]} value={formData.auditType || []} onChange={v => handleChange('auditType', v)} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">审计触发原因</label>
                <RadioGroup options={["年度审计计划", "风险评估结果", "管理层要求", "舞弊举报", "监管要求", "事件驱动", "其他"]} value={formData.triggerReason || ''} onChange={v => handleChange('triggerReason', v)} />
            </div>
          </div>
        );
    }
    
    const fields = stageFields[currentStage];
    const IS_AI_STAGE = [3, 4, 5].includes(currentStage);

    // 方案 REF-2024-GUIDE-SCOPE-021: 渲染分支控制
    return (
        <div className="space-y-6">
            {fields.map(field => {
                if (IS_AI_STAGE) {
                    const cacheKey = `stage${currentStage}-${field.name}`;
                    const aiContent = aiContentCache[cacheKey];
                    return (
                        <AIEnrichedFormField
                            key={field.name}
                            label={field.label}
                            helpText={field.helpText}
                            value={formData[field.name] || ''}
                            onChange={value => handleChange(field.name, value)}
                            isLoading={loadingFields.has(cacheKey)}
                            options={aiContent?.options}
                            explanation={aiContent?.explanation}
                        />
                    );
                } else {
                    // 非 AI 阶段直接渲染标准输入框
                    return (
                        <div key={field.name} className="animate-fade-in">
                            <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                            {field.helpText && <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>}
                            <AutoGrowingTextarea
                                value={formData[field.name] || ''}
                                onChange={e => handleChange(field.name, e.target.value)}
                                placeholder="请在此处输入相关背景信息..."
                                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                    );
                }
            })}
        </div>
    );
  };
  
  const renderWizardMode = () => (
     <div className="flex flex-col h-full relative">
        <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">项目信息收集向导</h2>
                    <p className="text-sm text-gray-500">
                        阶段 {currentStage}/8: {stageTitles[currentStage]} 
                    </p>
                </div>
                <button
                    onClick={handleSkipClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded-lg hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm group"
                    title="跳过向导，直接进入自由对话模式"
                >
                    <span className="text-base leading-none group-hover:scale-110 transition-transform">⏭</span>
                    <span>一键跳过</span>
                </button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                {renderWizardStageContent()}
            </div>
        </div>
        <div className="flex-shrink-0 bg-white pt-4 pb-4">
            <div className="flex justify-between items-center px-6">
                <button
                    onClick={() => handleNav(currentStage - 1)}
                    disabled={currentStage <= 1}
                    className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-0"
                >
                     <ChevronLeftIcon className="h-4 w-4" />
                     上一阶段
                </button>
                <button
                    onClick={() => handleNav(currentStage + 1)}
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm transition-colors"
                >
                    {currentStage === 8 ? '完成并生成程序' : '下一步'}
                </button>
            </div>
        </div>
        {/* Skip Warning Modal - React Controlled */}
        {showSkipWarning && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full border border-slate-200" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="text-xl">⚠️</span> 极其重要的风险提示
                    </h3>
                    <div className="text-sm text-slate-600 mb-6 space-y-3">
                        <p>跳过向导将导致助手丢失行业背景、风险偏好等关键信息。</p>
                        <p className="bg-red-50 text-red-700 p-3 rounded-md border border-red-100 font-medium">
                            后果：生成的审计程序可能会非常通用，缺乏针对性，甚至不可用。
                        </p>
                        <p>我们强烈建议您至少完成第一、三、四阶段。</p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setShowSkipWarning(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            我再想想
                        </button>
                        <button 
                            onClick={handleConfirmSkip}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-md shadow-red-100 transition-colors"
                        >
                            已知晓风险，确认跳过
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );

  const renderOverviewMode = () => {
    const hasData = Object.keys(data).some(key => {
        const value = data[key];
        if (Array.isArray(value)) return value.length > 0;
        return !!value;
    });

    if (!hasData) {
         return (
             <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
                <h2 className="text-lg font-semibold">项目背景信息为空</h2>
                <p className="mt-2 text-sm max-w-sm">
                    此项目尚未填写背景信息。您可以新建一个项目来启动信息收集向导，或在下方手动补充。
                </p>
            </div>
        )
    }

    return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
        <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-4">
                {Object.keys(stageFields).map(key => Number(key)).map(stageNum => (
                    <div key={stageNum} className="bg-white p-4 rounded-lg border border-gray-200">
                        {editingStage === stageNum ? (
                            <>
                                <h3 className="text-md font-semibold text-gray-800 mb-3">{stageTitles[stageNum]} (编辑中)</h3>
                                {renderSimpleForm(stageNum)}
                                <div className="flex justify-end gap-2 mt-4">
                                    <button onClick={() => setEditingStage(null)} className="px-3 py-1 bg-gray-200 text-sm rounded-md">取消</button>
                                    <button onClick={handleSaveEdit} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md">保存</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between items-center">
                                    <h3 className="text-md font-semibold text-gray-800">{stageTitles[stageNum]}</h3>
                                    <button onClick={() => handleEdit(stageNum)} className="p-1 rounded-full text-gray-400 hover:bg-slate-200 hover:text-slate-700" title="编辑此阶段信息">
                                        <PencilIcon className="h-4 w-4" />
                                    </button>
                                </div>
                                <dl className="mt-2 text-sm text-gray-700 space-y-2">
                                    {stageFields[stageNum].map(field => {
                                        const value = data[field.name];
                                        const displayValue = Array.isArray(value) ? value.join(', ') : value;
                                        return (
                                            <div key={field.name}>
                                                <dt className="font-medium text-gray-500">{field.label}</dt>
                                                <dd
                                                    // PROF-2024-UI-MARKDOWN-ENHANCE: Applied specialized markdown styles here
                                                    className={GUIDANCE_MARKDOWN_STYLES}
                                                    dangerouslySetInnerHTML={{
                                                        __html: displayValue
                                                        ? marked.parse(displayValue) as string
                                                        : '<span class="text-gray-400">未填写</span>'
                                                    }}
                                                />
                                            </div>
                                        )
                                    })}
                                </dl>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    </div>
  )};
  
  return isOverviewMode ? renderOverviewMode() : renderWizardMode();
};
