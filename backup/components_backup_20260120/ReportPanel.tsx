
import React, { useState } from 'react';
import { ArticleIcon, Spinner, ExportIcon, ClipboardIcon, CheckIcon } from './icons';
import { useProject } from '../contexts/ProjectContext';
import { useUI } from '../contexts/UIContext';
import { exportToDocx } from '../utils/docxExport';

export const ReportPanel: React.FC = () => {
  const { activeProjectState, handleUpdateReportContent } = useProject();
  const { isGeneratingReport } = useUI();
  const [copied, setCopied] = useState(false);

  const reportContent = activeProjectState.generatedReportContent;
  const reportTitle = activeProjectState.reportGenerationTitle || '审计报告';
  const isLoading = isGeneratingReport;

  if (!reportContent && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
        <ArticleIcon className="h-16 w-16 mb-4 text-gray-300" />
        <h2 className="text-lg font-semibold">您还没有生成任何报告。</h2>
        <p className="mt-2 text-sm max-w-sm">
          请在左侧操作栏点击“生成审计报告”以开始撰写。
        </p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExport = () => {
    // 传入 findings 以便渲染图形化附件
    exportToDocx(reportContent, reportTitle, activeProjectState.findings);
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col bg-white">
      {/* 顶部工具栏 */}
      {(reportContent || isLoading) && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
           <div className="flex items-center gap-2">
             <ArticleIcon className="h-5 w-5 text-blue-600" />
             <h3 className="font-bold text-slate-700 text-sm truncate max-w-[200px] md:max-w-md">
               {reportTitle}
             </h3>
           </div>
           <div className="flex items-center gap-2">
             <button 
                onClick={handleCopy}
                disabled={!reportContent}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
             >
                {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardIcon className="h-4 w-4" />}
                {copied ? '已复制' : '复制全文'}
             </button>
             <button 
                onClick={handleExport}
                disabled={!reportContent || isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white hover:bg-black rounded-lg transition-all shadow-sm disabled:opacity-30"
             >
                {isLoading ? <Spinner className="h-4 w-4 text-white" /> : <ExportIcon className="h-4 w-4" />}
                导出 Word
             </button>
           </div>
        </div>
      )}

      {isLoading && !reportContent && (
        <div className="flex flex-col items-center justify-center flex-1">
          <Spinner className="h-12 w-12 text-blue-500" />
          <p className="mt-4 text-gray-600">助手正在撰写报告，请稍候...</p>
        </div>
      )}

      {(reportContent || isLoading) && (
        <div className="flex-1 flex flex-col min-h-0">
          {isLoading && (
            <div className="flex items-center justify-center mb-2 text-xs text-blue-600 font-medium animate-pulse">
              <Spinner className="h-3 w-3 mr-2" />
              AI 正在撰写中，实时同步内容...
            </div>
          )}
          <textarea
            value={reportContent}
            onChange={(e) => handleUpdateReportContent(e.target.value)}
            readOnly={isLoading}
            className="w-full flex-1 p-5 border border-slate-200 rounded-xl bg-slate-50/30 font-sans text-sm leading-relaxed focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:bg-white outline-none resize-none shadow-inner transition-all"
            placeholder="报告内容将在此处显示..."
          />
          <div className="mt-2 text-[10px] text-slate-400 flex justify-end gap-3 px-1">
            <span>字符数: {reportContent.length}</span>
            <span>格式: Markdown (支持手动编辑)</span>
          </div>
        </div>
      )}
    </div>
  );
};
