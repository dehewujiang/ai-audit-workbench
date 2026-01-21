import React from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useUI } from '../contexts/UIContext';
import { TrashIcon, Spinner } from './icons';

export const DeleteConfirmationModal: React.FC = () => {
  const { activeModal, closeModal, projectToDelete } = useUI();
  const { deleteProject } = useProject();

  const isOpen = activeModal === 'deleteProject';

  if (!isOpen || !projectToDelete) {
    return null;
  }

  const handleConfirm = () => {
    deleteProject(projectToDelete.id);
    closeModal();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <TrashIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-4 text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
              确认删除项目
            </h3>
          </div>
        </div>

        <p className="text-gray-600 mb-6">
          您确定要删除 “<strong className="text-gray-800">{projectToDelete.name}</strong>” 项目吗？此操作将永久移除该项目的所有相关数据，且无法撤销。
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={closeModal}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <TrashIcon className="h-5 w-5" />
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
};
