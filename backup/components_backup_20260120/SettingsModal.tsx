
import React, { useState, useEffect } from 'react';
import { LLMProfile, LLMProvider } from '../types';
import { CloseIcon, PlusIcon, TrashIcon, CheckIcon, PencilIcon } from './icons';
import { useGlobal } from '../contexts/GlobalContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emptyProfile: Omit<LLMProfile, 'id' | 'apiKey'> = {
  name: '',
  provider: 'google',
  modelName: '',
  apiEndpoint: '',
  contextWindow: 32000,
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { globalState, handleSaveSettings } = useGlobal();
  const { llmProfiles: profiles, activeLlmProfileId: activeProfileId } = globalState;

  const [localProfiles, setLocalProfiles] = useState<LLMProfile[]>([]);
  const [localActiveId, setLocalActiveId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<Partial<LLMProfile> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalProfiles(profiles ? JSON.parse(JSON.stringify(profiles)) : []);
      setLocalActiveId(activeProfileId);
    }
  }, [isOpen, profiles, activeProfileId]);

  if (!isOpen) return null;

  const handleSave = () => {
    const newActiveId = localProfiles.length > 0
      ? (localActiveId && localProfiles.some(p => p.id === localActiveId) ? localActiveId : localProfiles[0].id)
      : null;
    handleSaveSettings(localProfiles, newActiveId);
    onClose();
  };

  const handleAddNew = () => {
    setEditingProfile({ ...emptyProfile });
  };

  const handleEdit = (profile: LLMProfile) => {
    setEditingProfile({ ...profile });
  };

  const handleDelete = (id: string) => {
    setLocalProfiles(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveEdit = () => {
    if (!editingProfile || !editingProfile.name || !editingProfile.modelName) {
      alert('请填写所有必填字段。');
      return;
    }
    
    // Validation for DeepSeek/Custom providers
    if (editingProfile.provider !== 'google' && !editingProfile.apiKey) {
        alert('非 Google 服务商必须填写 API Key。');
        return;
    }

    if (editingProfile.id) { // Editing existing
      setLocalProfiles(prev => prev.map(p => p.id === editingProfile!.id ? (editingProfile as LLMProfile) : p));
    } else { // Adding new
      const newProfile: LLMProfile = { 
          ...editingProfile, 
          id: `llm-${Date.now()}`,
          apiKey: editingProfile.apiKey || '' // Ensure apiKey is set
      } as LLMProfile;
      setLocalProfiles(prev => [...prev, newProfile]);
    }
    setEditingProfile(null);
  };
  
  const renderProfileForm = () => {
    if (!editingProfile) return null;
    
    const updateField = (field: keyof Omit<LLMProfile, 'id'>, value: string | number) => {
        setEditingProfile(prev => ({...prev, [field]: value}));
    };

    return (
        <div className="bg-slate-50 p-4 rounded-lg border space-y-3 my-4">
            <h3 className="font-semibold text-lg">{editingProfile.id ? '编辑配置' : '添加新配置'}</h3>
             <div>
                <label className="block text-sm font-medium text-gray-700">配置名称</label>
                <input type="text" value={editingProfile.name || ''} onChange={e => updateField('name', e.target.value)} className="mt-1 w-full p-2 border rounded-md" placeholder="例如：我的 DeepSeek"/>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">服务提供商</label>
                <select value={editingProfile.provider || 'google'} onChange={e => updateField('provider', e.target.value as LLMProvider)} className="mt-1 w-full p-2 border rounded-md bg-white">
                    <option value="google">Google Gemini</option>
                    <option value="deepseek">DeepSeek</option>
                    {/* <option value="openrouter" disabled>OpenRouter (即将支持)</option> */}
                </select>
            </div>
            
            {editingProfile.provider !== 'google' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700">API Key <span className="text-red-500">*</span></label>
                    <input 
                        type="password" 
                        value={editingProfile.apiKey || ''} 
                        onChange={e => updateField('apiKey', e.target.value)} 
                        className="mt-1 w-full p-2 border rounded-md" 
                        placeholder="sk-..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Key 将仅存储在您的本地浏览器中。</p>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700">模型名称</label>
                <input type="text" value={editingProfile.modelName || ''} onChange={e => updateField('modelName', e.target.value)} className="mt-1 w-full p-2 border rounded-md" placeholder={editingProfile.provider === 'deepseek' ? 'deepseek-chat' : 'gemini-2.5-pro'}/>
            </div>
            
            {editingProfile.provider !== 'google' && (
                 <div>
                    <label className="block text-sm font-medium text-gray-700">API Endpoint (可选)</label>
                    <input type="text" value={editingProfile.apiEndpoint || ''} onChange={e => updateField('apiEndpoint', e.target.value)} className="mt-1 w-full p-2 border rounded-md" placeholder="https://api.deepseek.com/chat/completions"/>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700">最大上下文窗口 (Tokens)</label>
                <input type="number" value={editingProfile.contextWindow || 32000} onChange={e => updateField('contextWindow', parseInt(e.target.value, 10))} className="mt-1 w-full p-2 border rounded-md" placeholder="例如：32000"/>
                <p className="text-xs text-gray-500 mt-1">注意：更大的上下文会增加成本和响应时间，并可能影响准确性。</p>
            </div>
            
            {editingProfile.provider === 'google' && (
                 <p className="text-xs text-gray-500 pt-2">注意：Google Gemini 使用系统预置的 API Key (环境变量)，无需在此输入。</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditingProfile(null)} className="px-3 py-1.5 bg-gray-200 rounded-md text-sm">取消</button>
                <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm">保存</button>
            </div>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl m-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold text-gray-800">LLM 服务配置</h2>
          <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600"><CloseIcon className="h-6 w-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {localProfiles.map(profile => (
                <div key={profile.id} className={`flex items-center p-3 rounded-lg border transition-colors ${localActiveId === profile.id ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
                    <div className="flex-1 cursor-pointer" onClick={() => setLocalActiveId(profile.id)}>
                        <p className="font-semibold text-gray-800">{profile.name} {localActiveId === profile.id && <span className="text-xs text-blue-600 font-normal">(当前使用)</span>}</p>
                        <p className="text-sm text-gray-500">{profile.provider} / {profile.modelName} / {profile.contextWindow || 32000} Tokens</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => handleEdit(profile)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-full"><PencilIcon className="h-5 w-5"/></button>
                         <button onClick={() => handleDelete(profile.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-full"><TrashIcon className="h-5 w-5"/></button>
                    </div>
                </div>
            ))}
            {!editingProfile && (
                 <button onClick={handleAddNew} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg text-gray-500 hover:bg-slate-50 hover:border-blue-400 transition-colors">
                    <PlusIcon className="h-5 w-5"/>
                    添加新的配置
                 </button>
            )}
             {renderProfileForm()}
        </div>
        
        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">取消</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
            <CheckIcon className="h-5 w-5"/> 保存并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
