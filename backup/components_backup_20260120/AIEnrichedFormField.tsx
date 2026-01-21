import React from 'react';
import { Spinner } from './icons';

interface AIEnrichedFormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isLoading: boolean;
  options?: string[];
  explanation?: string;
  helpText?: string;
}

export const AIEnrichedFormField: React.FC<AIEnrichedFormFieldProps> = ({
  label,
  value,
  onChange,
  isLoading,
  options = [],
  explanation,
  helpText,
}) => {

  const handleOptionToggle = (option: string) => {
    const currentValues = value ? value.split('\n').map(s => s.trim()).filter(Boolean) : [];
    const optionIndex = currentValues.findIndex(o => o.toLowerCase() === option.toLowerCase());

    let newValues;
    if (optionIndex > -1) {
      newValues = currentValues.filter((_, index) => index !== optionIndex);
    } else {
      newValues = [...currentValues, option];
    }
    onChange(newValues.join('\n'));
  };

  const isOptionSelected = (option: string) => {
    return value && value.toLowerCase().includes(option.toLowerCase());
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
      
      <div className="mt-2">
        {isLoading ? (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border text-sm text-gray-500">
            <Spinner className="h-4 w-4" />
            <span>正在为您生成建议...</span>
          </div>
        ) : (
          <>
            {options.length > 0 && (
              <div className="space-y-2 mb-2">
                {options.map(option => (
                  <label key={option} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOptionSelected(option)}
                      onChange={() => handleOptionToggle(option)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-800">{option}</span>
                  </label>
                ))}
              </div>
            )}
            <textarea
              value={value}
              onChange={e => onChange(e.target.value)}
              rows={4}
              placeholder="您可在此处自由输入，或通过勾选上方选项填充"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </>
        )}
      </div>

      {!isLoading && explanation && (
        <p className="mt-2 text-xs text-gray-600 p-2 bg-blue-50 border-l-4 border-blue-300 rounded-r-md">
          <span className="font-semibold">原因说明:</span> {explanation}
        </p>
      )}
    </div>
  );
};
