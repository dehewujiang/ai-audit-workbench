
import React, { useState, useEffect, useRef } from 'react';
import { Spinner } from './icons';
import { useUI } from '../contexts/UIContext';
import { useProject } from '../contexts/ProjectContext';

interface FindingAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormTextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  disabled: boolean;
  isOptional?: boolean;
}

const FormTextarea: React.FC<FormTextareaProps> = 
  ({id, label, value, onChange, placeholder, disabled, isOptional}) => {
     const textareaRef = useRef<HTMLTextAreaElement>(null);

     useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
     }, [value, id]); // Trigger on value change or id change (reset)

     return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                {label} {isOptional && <span className="text-gray-500 font-normal">(可选)</span>}
            </label>
            <textarea
                ref={textareaRef}
                id={id}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                disabled={disabled}
            />
        </div>
     );
  };

export const FindingAnalysisModal: React.FC<FindingAnalysisModalProps> = ({ isOpen, onClose }) => {
  const { isAnalyzing } = useUI();
  const { handleGenerateFindingQuestions, handleSubmitFindingAnalysis } = useProject();

  const [step, setStep] = useState<'initial' | 'questioning'>('initial');
  const [condition, setCondition] = useState('');
  const [criteria, setCriteria] = useState('');
  const [effect, setEffect] = useState('');
  const [cause, setCause] = useState('');
  const [questions, setQuestions] = useState('');
  const [answers, setAnswers] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('initial');
      setCondition('');
      setCriteria('');
      setEffect('');
      setCause('');
      setQuestions('');
      setAnswers('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = async () => {
    if (condition.trim() && criteria.trim() && effect.trim()) {
      setError(null);
      setIsGeneratingQuestions(true);
      try {
        const generatedQuestions = await handleGenerateFindingQuestions({ condition, criteria, effect, cause });
        setQuestions(generatedQuestions);
        setStep('questioning');
      } catch (e) {
        setError(e instanceof Error ? e.message : '生成问题时出错');
      } finally {
        setIsGeneratingQuestions(false);
      }
    } else {
      setError('请填写所有必填字段 (状况, 标准, 影响)。');
    }
  };

  const handleSubmit = () => {
    // Hand off to the ProjectContext to start the Chat PER flow
    handleSubmitFindingAnalysis({ condition, criteria, effect, cause, answers });
  };

  const renderStepContent = () => {
    if (step === 'initial') {
      return (
        <div className="pt-1">
          <div className="space-y-3">
            <FormTextarea id="condition" label="状况 (Condition)" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="描述已发现的实际情况是什么..." disabled={isAnalyzing} />
            <FormTextarea id="criteria" label="标准 (Criteria)" value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder="描述标准或预期应该是什么..." disabled={isAnalyzing} />
            <FormTextarea id="effect" label="影响 (Effect)" value={effect} onChange={(e) => setEffect(e.target.value)} placeholder="描述该差异可能导致的风险或后果..." disabled={isAnalyzing} />
            <FormTextarea id="cause" label="初步原因 (Cause)" value={cause} onChange={(e) => setCause(e.target.value)} placeholder="如果您有初步判断，请在此处填写..." disabled={isAnalyzing} isOptional={true} />
          </div>
          {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
        </div>
      );
    }
  
    if (step === 'questioning') {
      return (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {/* Left Column: AI Questions (Read Only) */}
            <div className="flex flex-col h-full min-h-0">
                <h3 className="block text-sm font-bold text-gray-700 mb-2 flex-shrink-0">AI 补充提问</h3>
                <div className="flex-1 overflow-y-auto p-4 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {questions}
                </div>
            </div>

            {/* Right Column: User Answer (Input) */}
            <div className="flex flex-col h-full min-h-0">
                 <label htmlFor="answers" className="block text-sm font-bold text-gray-700 mb-2 flex-shrink-0">您的回答</label>
                 <textarea 
                    id="answers" 
                    value={answers} 
                    onChange={(e) => setAnswers(e.target.value)} 
                    placeholder="针对左侧的问题，请在此处补充具体情况..." 
                    disabled={isAnalyzing} 
                    className="flex-1 w-full p-4 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none shadow-sm"
                 />
            </div>
        </div>
      );
    }
    return null;
  };

  const renderFooter = () => {
    if (step === 'initial') {
      return (
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={isGeneratingQuestions} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50">取消</button>
          <button onClick={handleNext} disabled={isGeneratingQuestions || !condition.trim() || !criteria.trim() || !effect.trim()} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center gap-2">
            {isGeneratingQuestions ? <><Spinner className="h-5 w-5" /> 正在准备问题...</> : '下一步'}
          </button>
        </div>
      );
    }

    if (step === 'questioning') {
      return (
        <div className="flex justify-between gap-3">
          <button onClick={() => setStep('initial')} disabled={isAnalyzing} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50">返回上一步</button>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={isAnalyzing} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50">取消</button>
            <button onClick={handleSubmit} disabled={isAnalyzing || !answers.trim()} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center gap-2">
              {isAnalyzing ? <><Spinner className="h-5 w-5"/> 正在提交...</> : '开始深度分析'}
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" role="dialog" aria-modal="true">
      <div className={`bg-white rounded-lg shadow-2xl p-6 w-full m-4 flex flex-col transition-all duration-300 ease-in-out ${
          step === 'questioning' ? 'max-w-6xl h-[85vh]' : 'max-w-2xl max-h-[90vh]'
      }`}>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex-shrink-0">分析新的审计发现 ({step === 'initial' ? '第1步/共2步' : '第2步/共2步'})</h2>
        
        {/* Dynamic overflow handling based on step */}
        <div className={`flex-1 min-h-0 ${step === 'initial' ? 'overflow-y-auto pr-2' : 'overflow-hidden'}`}>
          {renderStepContent()}
        </div>

        <div className="flex-shrink-0 mt-6 pt-4 border-t">
          {renderFooter()}
        </div>
      </div>
    </div>
  );
};
