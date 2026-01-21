import React, { useMemo } from 'react';
import { KnowledgeSnippet } from '../types';
import { TrashIcon, LibraryIcon } from './icons';
import { useGlobal } from '../contexts/GlobalContext';

interface MySnippetsPanelProps {
  searchTerm: string;
}

const ConsolidatedSnippetTable: React.FC<{ snippets: KnowledgeSnippet[]; onDeleteSnippet: (id: string) => void; }> = ({ snippets, onDeleteSnippet }) => {
  if (snippets.length === 0) {
    return null;
  }

  try {
    const firstSnippetContent = snippets[0].content;
    const lines = firstSnippetContent.trim().split('\n');
    if (lines.length < 2 || !lines[1].includes('|:---|')) {
      throw new Error("Snippet is not a valid markdown table.");
    }

    const markdownHeaders = lines[0].split('|').slice(1, -1).map(h => h.trim());
    const finalHeaders = [...markdownHeaders, "项目", "操作"];


    return (
      <div className="mt-3 text-sm overflow-x-auto border border-slate-200 rounded-md">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr>
              {finalHeaders.map((header, index) => (
                <th key={index} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {snippets.map(snippet => {
              // Join all lines after the header and separator to handle multiline content within a single cell.
              const dataLines = snippet.content.trim().split('\n');
              const dataRowLine = dataLines.slice(2).join('\n');
              const cells = dataRowLine.split('|').slice(1, -1).map(cell => cell.trim());

              if (cells.length !== markdownHeaders.length) {
                return (
                  <tr key={snippet.id}><td colSpan={finalHeaders.length} className="p-2 text-red-500 text-xs">格式错误：无法正确解析此片段的内容。</td></tr>
                );
              }

              return (
                <tr key={snippet.id} className="group hover:bg-blue-50 transition-colors">
                  {cells.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 align-top text-gray-800 break-words" dangerouslySetInnerHTML={{ __html: cell.replace(/\n/g, '<br/>') }} />
                  ))}
                  <td className="px-3 py-2 align-top text-gray-800 break-words">{snippet.projectName || '未指定'}</td>
                  <td className="px-3 py-2 align-top text-center">
                    <button
                      onClick={() => onDeleteSnippet(snippet.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                      title="删除此行"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  } catch (error) {
    console.error("Failed to render consolidated table:", error);
    return <p className="text-red-500 mt-2 text-sm">无法渲染表格片段。</p>;
  }
};

export const MySnippetsPanel: React.FC<MySnippetsPanelProps> = ({ searchTerm }) => {
  const { globalState, handleDeleteSnippet } = useGlobal();
  const snippets = globalState.snippets;

  const filteredSnippets = useMemo(() => snippets.filter(snippet =>
    snippet.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    snippet.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (snippet.projectName && snippet.projectName.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [snippets, searchTerm]);

  const { tableGroups, otherSnippets } = useMemo(() => {
    const tableTypes = ['完整审计程序', '审计发现', '舞弊案例分析'];
    const tableGroups: Record<string, KnowledgeSnippet[]> = {};
    const otherSnippets: KnowledgeSnippet[] = [];

    for (const snippet of filteredSnippets) {
      if (tableTypes.includes(snippet.type) && snippet.content.includes('|:---|')) {
        if (!tableGroups[snippet.type]) {
          tableGroups[snippet.type] = [];
        }
        tableGroups[snippet.type].push(snippet);
      } else {
        otherSnippets.push(snippet);
      }
    }
    // Sort snippets within each group by creation date
    for(const type in tableGroups) {
        tableGroups[type].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return { tableGroups, otherSnippets };
  }, [filteredSnippets]);


  if (snippets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
        <LibraryIcon className="h-16 w-16 mb-4 text-gray-300" />
        <h2 className="text-lg font-semibold">您的知识片段库是空的</h2>
        <p className="mt-2 text-sm max-w-sm">
          在“审计程序”或“工作底稿”视图中，点击保存图标即可将知识片段添加到此处。
        </p>
      </div>
    );
  }
  
  if (filteredSnippets.length === 0) {
      return (
           <div className="text-center text-gray-500 p-8">
              <h2 className="text-lg font-semibold">未找到匹配的片段</h2>
              <p className="mt-2 text-sm">请尝试使用其他关键词进行搜索。</p>
          </div>
      )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {Object.entries(tableGroups).map(([type, snippetGroup]) => (
        <div key={type} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">{type}</h3>
          <ConsolidatedSnippetTable snippets={snippetGroup} onDeleteSnippet={handleDeleteSnippet} />
        </div>
      ))}
      {otherSnippets.map(snippet => (
        <div key={snippet.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm group relative">
          <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
            {snippet.type}
          </span>
          <p className="text-gray-700 mt-2 text-sm" style={{ whiteSpace: 'pre-wrap' }}>{snippet.content}</p>
          <button
            onClick={() => handleDeleteSnippet(snippet.id)}
            className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50"
            title="删除片段"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};