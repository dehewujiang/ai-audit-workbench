import React, { useState, useEffect } from 'react';
import { EntityProfile } from '../types';
import { useGlobal } from '../contexts/GlobalContext';

interface EntityProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Moved outside to prevent re-creation on every render causing focus loss
const InputField = ({ 
  label, 
  value, 
  onChange, 
  placeholder 
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  placeholder: string 
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
    />
  </div>
);

export const EntityProfileModal: React.FC<EntityProfileModalProps> = ({ isOpen, onClose }) => {
  const { globalState, handleUpdateEntityProfile } = useGlobal();
  const [profile, setProfile] = useState<EntityProfile>(globalState.entityProfile);

  useEffect(() => {
    if (isOpen) {
      setProfile(globalState.entityProfile);
    }
  }, [isOpen, globalState.entityProfile]);

  if (!isOpen) return null;

  const handleChange = (field: keyof EntityProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    handleUpdateEntityProfile(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">企业/实体档案 (Global)</h2>
            <p className="text-xs text-gray-500 mt-1">设置全局背景信息，这些信息将自动应用于所有审计项目，提升助手回答的行业相关性。</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
           <InputField 
             label="所属行业" 
             value={profile.industry} 
             onChange={(val) => handleChange('industry', val)} 
             placeholder="例如：汽车零部件制造、金融科技、生物医药" 
           />
           <InputField 
             label="企业规模" 
             value={profile.scale} 
             onChange={(val) => handleChange('scale', val)} 
             placeholder="例如：2000人, 上市公司, 跨国集团" 
           />
           <InputField 
             label="核心系统 (ERP/OA)" 
             value={profile.coreSystems} 
             onChange={(val) => handleChange('coreSystems', val)} 
             placeholder="例如：SAP S/4HANA, 泛微OA, 自研MES" 
           />
           <InputField 
             label="主要合规框架" 
             value={profile.regulatoryFramework} 
             onChange={(val) => handleChange('regulatoryFramework', val)} 
             placeholder="例如：IATF 16949, SOX, ISO 27001" 
           />
           <InputField 
             label="风险偏好" 
             value={profile.riskAppetite} 
             onChange={(val) => handleChange('riskAppetite', val)} 
             placeholder="例如：稳健合规型, 业务导向型, 创新激进型" 
           />
        </div>
        
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">其他背景描述</label>
            <textarea
                value={profile.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="例如：公司正处于数字化转型期，对内控自动化要求较高；或者公司近期刚完成并购，组织架构尚在整合中；或者老板是个傻逼，一天到晚净他妈的扯淡。"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm">
            取消
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors text-sm shadow-md">
            保存
          </button>
        </div>
      </div>
    </div>
  );
};