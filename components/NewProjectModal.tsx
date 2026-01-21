import React, { useState, useEffect } from 'react';
import { Spinner } from './icons';
import { useUI } from '../contexts/UIContext';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { isCreatingProject: isLoading } = useUI();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (isLoading) return;
    if (name.trim()) {
      onSubmit(name.trim());
    } else {
      setError('项目名称不能为空。');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md m-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">新建审计项目</h2>
        <p className="text-sm text-gray-600 mb-6">为您的新审计项目命名，以便于将来识别和切换。</p>
        
        <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
            <input
                id="project-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：固定资产审计"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75"
                autoFocus
                disabled={isLoading}
            />
        </div>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} disabled={isLoading} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50">取消</button>
          <button onClick={handleSubmit} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed min-w-[110px] flex justify-center">
            {isLoading ? <Spinner className="h-5 w-5" /> : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
};