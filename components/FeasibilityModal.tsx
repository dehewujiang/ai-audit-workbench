
import React from 'react';
import { FeasibilityAssessment } from '../types';
import { Spinner } from './icons';

interface FeasibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: FeasibilityAssessment | null;
  isLoading: boolean;
  error: string | null;
}

const DimensionBadge: React.FC<{ dimension: string }> = ({ dimension }) => {
  const colorMap: Record<string, string> = {
    '数据': 'bg-blue-100 text-blue-800',
    '人员': 'bg-green-100 text-green-800',
    '系统': 'bg-purple-100 text-purple-800',
    '流程': 'bg-yellow-100 text-yellow-800',
    '其他': 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`inline-block mr-2 px-2 py-0.5 text-xs font-semibold rounded-full ${colorMap[dimension] || colorMap['其他']}`}>
      {dimension}
    </span>
  );
};


export const FeasibilityModal: React.FC<FeasibilityModalProps> = ({ isOpen, onClose, assessment, isLoading, error }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-3xl m-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold text-gray-800">执行难点评估</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64">
              <Spinner className="h-12 w-12 text-blue-500" />
              <p className="mt-4 text-gray-600">正在以资深审计经理的视角进行分析...</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="py-1">
                  <p className="text-sm text-red-700">分析出错: {error}</p>
                </div>
              </div>
            </div>
          )}
          {assessment && !isLoading && !error && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">潜在困难</h3>
                <ul className="space-y-3">
                  {assessment.potentialDifficulties.map((item, index) => (
                    <li key={index} className="text-gray-800 text-sm flex items-start">
                      <span className="mt-0.5"><DimensionBadge dimension={item.dimension} /></span>
                      <span className="flex-1">{item.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">应对策略</h3>
                <div className="space-y-4">
                  {assessment.suggestedStrategies.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md border">
                      <p className="text-sm font-semibold text-gray-600">针对: "{item.difficulty}"</p>
                      <p className="text-sm text-gray-800 mt-1 pl-2 border-l-2 border-blue-400">{item.strategy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};