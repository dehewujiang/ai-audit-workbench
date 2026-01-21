import React, { useState, useEffect } from 'react';
import { AuditeeProfile } from '../types';
import { useUI } from '../contexts/UIContext';

interface AuditeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialProfile: AuditeeProfile = {
  position: '业务部门经理',
  personality: '谨慎，对数据敏感，有一定防御心理',
  professionalAbility: '资深专家，非常熟悉业务流程',
  attitude: '表面配合，但内心认为审计在“找麻烦”',
};

// The FormField component is moved outside of the main component to prevent it from being re-created on every render.
// It now receives `value` and `onChange` as props for proper state management.
interface FormFieldProps {
    label: string;
    field: keyof AuditeeProfile;
    value: string;
    onChange: (field: keyof AuditeeProfile, value: string) => void;
    placeholder: string;
}

const FormField: React.FC<FormFieldProps> = React.memo(({ label, field, value, onChange, placeholder }) => (
    <div>
        <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
        </label>
        <textarea
            id={field}
            value={value}
            onChange={(e) => onChange(field, e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    </div>
));


export const AuditeeProfileModal: React.FC<AuditeeProfileModalProps> = ({ isOpen, onClose }) => {
  const { handleStartAuditeeProfile } = useUI();
  const [profile, setProfile] = useState<AuditeeProfile>(initialProfile);

  useEffect(() => {
    if (isOpen) {
      setProfile(initialProfile);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof AuditeeProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = () => {
      handleStartAuditeeProfile(profile);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">审计沟通演练 - 情景设置</h2>
        <p className="text-sm text-gray-600 mb-4">为了让模拟更逼真，请简要描述您将要沟通的对象：</p>
        <div className="space-y-4">
            <FormField label="对方职务" field="position" value={profile.position} onChange={handleChange} placeholder="例如：业务部门经理" />
            <FormField label="性格特点" field="personality" value={profile.personality} onChange={handleChange} placeholder="例如：强势、谨慎、乐于合作、推诿" />
            <FormField label="专业能力" field="professionalAbility" value={profile.professionalAbility} onChange={handleChange} placeholder="例如：资深专家、业务新手、流程不熟" />
            <FormField label="对审计的态度" field="attitude" value={profile.attitude} onChange={handleChange} placeholder="例如：支持配合、中立、抵触、戒备" />
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">
            取消
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">
            开始演练
          </button>
        </div>
      </div>
    </div>
  );
};