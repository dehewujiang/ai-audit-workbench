import React, { useState } from 'react';
import { SwordIcon, Spinner } from './icons';
import { useProject } from '../contexts/ProjectContext';
import { useUI } from '../contexts/UIContext';

interface ChallengeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChallengeConfirmationModal: React.FC<ChallengeConfirmationModalProps> = ({ isOpen, onClose }) => {
  const { handleChallengeProgram } = useProject();
  const { isChallenging: isLoading } = useUI();
  const [focusNote, setFocusNote] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    handleChallengeProgram(focusNote);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center mb-4">
          <SwordIcon className="h-8 w-8 text-red-500 mr-3" />
          <h2 className="text-2xl font-bold text-gray-800">启动挑战者模式</h2>
        </div>

        <p className="text-gray-600 mb-4">
          即将开始对当前的审计程序进行深入的批判性审视。助手将会接收以下信息作为输入以确保挑战的深度和上下文相关性：
        </p>
        <ul className="list-disc list-inside bg-gray-50 p-3 rounded-md text-gray-700 text-sm space-y-1 mb-6">
          <li>
            <span className="font-semibold">✅ 最终审计程序:</span> 当前在右侧面板显示的最新版本。
          </li>
          <li>
            <span className="font-semibold">✅ 完整对话历史:</span> 从开始到现在的全部对话上下文，以理解方案的演进过程。
          </li>
        </ul>

        <div>
          <label htmlFor="focus-note" className="block text-sm font-medium text-gray-700 mb-2">
            附加挑战重点 (可选)
          </label>
          <textarea
            id="focus-note"
            value={focusNote}
            onChange={(e) => setFocusNote(e.target.value)}
            placeholder="请重点关注该程序在应对管理层凌驾于控制之上的风险方面是否充分。"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            提供一个具体的思考角度，会让挑战更加精准、深刻。
          </p>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors disabled:bg-red-300 flex items-center gap-2"
          >
            {isLoading ? <Spinner className="h-5 w-5" /> : <SwordIcon className="h-5 w-5" />}
            {isLoading ? '正在挑战...' : '确认并挑战'}
          </button>
        </div>
      </div>
    </div>
  );
};