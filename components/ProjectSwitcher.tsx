import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../types';
import { ChevronDownIcon, PlusIcon, TrashIcon } from './icons';
import { useUI } from '../contexts/UIContext';

interface ProjectSwitcherProps {
  projects: Project[];
  activeProject: Project | null;
  onSwitchProject: (projectId: string) => void;
  onCreateProject: () => void;
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  projects,
  activeProject,
  onSwitchProject,
  onCreateProject,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { showDeleteConfirmation } = useUI();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  const handleSelect = (projectId: string) => {
    onSwitchProject(projectId);
    setIsOpen(false);
  };

  const handleCreate = () => {
    onCreateProject();
    setIsOpen(false);
  };
  
  const handleDelete = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    showDeleteConfirmation({ id: project.id, name: project.name });
  };


  if (!activeProject) {
    return <div className="text-xl font-semibold tracking-tight text-gray-800">审计助手</div>;
  }

  return (
    <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-gray-800">审计助手</h1>
        <div ref={wrapperRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-lg font-semibold tracking-tight text-gray-800 hover:bg-gray-100 transition-colors rounded-md border border-transparent hover:border-gray-200"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <span>{activeProject.name}</span>
                <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-72 bg-white rounded-md shadow-lg border border-gray-200 z-30 animate-fade-in-down">
                <div className="p-2">
                    <button
                        onClick={handleCreate}
                        className="w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 text-gray-700 hover:bg-gray-100"
                    >
                        <PlusIcon className="h-5 w-5 text-gray-500" />
                        <span>新建项目</span>
                    </button>
                    <hr className="my-1 border-gray-200" />
                    <div className="max-h-48 overflow-y-auto">
                    {projects.map(project => (
                        <button
                        key={project.id}
                        onClick={() => handleSelect(project.id)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md flex justify-between items-center group ${project.id === activeProject.id ? 'bg-gray-100 text-gray-800 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                        <span className="truncate pr-2">{project.name}</span>
                        {project.id === activeProject.id ? (
                            <span className="text-xs text-gray-600">当前</span>
                        ) : (
                            <button onClick={(e) => handleDelete(e, project)} className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="删除项目">
                            <TrashIcon className="h-4 w-4" />
                            </button>
                        )}
                        </button>
                    ))}
                    </div>
                </div>
                </div>
            )}
        </div>
        <style>{`
            @keyframes fade-in-down {
            0% { opacity: 0; transform: translateY(-10px); }
            100% { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-down { animation: fade-in-down 0.2s ease-out forwards; }
        `}</style>
    </div>
  );
};