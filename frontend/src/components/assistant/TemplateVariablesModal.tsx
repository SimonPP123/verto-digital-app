'use client';

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

type VariableType = 'text' | 'multiChoice' | 'date' | 'dateRange';

export type TemplateVariable = {
  _id?: string; // Optional MongoDB ID
  name: string;
  description: string;
  defaultValue: string;
  type: VariableType;
  options?: string[]; // For multiChoice variables
};

type VariableValue = string | string[] | Date | [Date | null, Date | null];

type TemplateVariablesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
  variables: TemplateVariable[];
  templateContent: string;
};

export default function TemplateVariablesModal({
  isOpen,
  onClose,
  onSubmit,
  variables,
  templateContent
}: TemplateVariablesModalProps) {
  const [values, setValues] = useState<Record<string, VariableValue>>({});
  const [previewContent, setPreviewContent] = useState('');

  // Initialize default values
  useEffect(() => {
    const initialValues: Record<string, VariableValue> = {};
    variables.forEach(variable => {
      if (variable.type === 'multiChoice') {
        initialValues[variable.name] = variable.defaultValue ? 
          variable.defaultValue.split(',').map(v => v.trim()) : [];
      } else if (variable.type === 'date') {
        initialValues[variable.name] = variable.defaultValue ? 
          new Date(variable.defaultValue) : new Date();
      } else if (variable.type === 'dateRange') {
        try {
          // For date ranges, we expect defaultValue to be a comma-separated string of dates
          if (variable.defaultValue && variable.defaultValue.includes(',')) {
            const dateParts = variable.defaultValue.split(',');
            const start = dateParts[0]?.trim() ? new Date(dateParts[0].trim()) : new Date();
            const end = dateParts[1]?.trim() ? new Date(dateParts[1].trim()) : new Date();
            initialValues[variable.name] = [start, end];
          } else {
            initialValues[variable.name] = [new Date(), new Date()];
          }
        } catch (error) {
          console.error('Error parsing date range:', error);
          initialValues[variable.name] = [new Date(), new Date()];
        }
      } else {
        initialValues[variable.name] = variable.defaultValue || '';
      }
    });
    setValues(initialValues);
  }, [variables]);

  // Update preview whenever values change
  useEffect(() => {
    updatePreview();
  }, [values, templateContent]);

  const updatePreview = () => {
    let preview = templateContent;
    const variableRegex = /\{\{([^}]+)\}\}/g;
    
    // Convert current values to string representation for preview
    const stringValues: Record<string, string> = {};
    Object.entries(values).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0 && value[0] instanceof Date) {
          // Date range
          const dateRange = value as [Date | null, Date | null];
          stringValues[key] = dateRange.map(d => d ? d.toISOString().split('T')[0] : '').join(' to ');
        } else {
          // Multi-choice options
          stringValues[key] = (value as string[]).join(', ');
        }
      } else if (value instanceof Date) {
        stringValues[key] = value.toISOString().split('T')[0];
      } else {
        stringValues[key] = value as string;
      }
    });
    
    // Replace variables in template with current values
    preview = preview.replace(variableRegex, (match, varName) => {
      const variableName = varName.trim();
      return stringValues[variableName] || match;
    });
    
    setPreviewContent(preview);
  };

  const handleChange = (name: string, value: VariableValue) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    // Convert all values to strings before submitting
    const stringValues: Record<string, string> = {};
    Object.entries(values).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0 && value[0] instanceof Date) {
          // This is a date range
          const dateRange = value as [Date | null, Date | null];
          stringValues[key] = dateRange.map(d => d ? d.toISOString().split('T')[0] : '').join(' to ');
        } else {
          // This is a multi-choice option
          stringValues[key] = (value as string[]).join(', ');
        }
      } else if (value instanceof Date) {
        stringValues[key] = value.toISOString().split('T')[0];
      } else {
        stringValues[key] = value as string;
      }
    });
    
    onSubmit(stringValues);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Fill in Template Variables</h2>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Variables Form */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700 border-b pb-2">Variables</h3>
            {variables.map(variable => (
              <div key={variable.name} className="border border-gray-200 rounded-md p-3">
                <label className="block font-medium text-gray-700 mb-1">
                  {variable.name}
                  {variable.description && (
                    <span className="ml-1 font-normal text-gray-500 text-sm">
                      ({variable.description})
                    </span>
                  )}
                </label>

                {variable.type === 'multiChoice' && (
                  <div className="space-y-2">
                    <span className="block text-xs text-gray-500 mb-1">Select one or more options:</span>
                    {variable.options?.map(option => (
                      <div key={option} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`${variable.name}-${option}`}
                          checked={(values[variable.name] as string[] || []).includes(option)}
                          onChange={(e) => {
                            const currentValues = values[variable.name] as string[] || [];
                            if (e.target.checked) {
                              handleChange(variable.name, [...currentValues, option]);
                            } else {
                              handleChange(
                                variable.name,
                                currentValues.filter(v => v !== option)
                              );
                            }
                          }}
                          className="mr-2"
                        />
                        <label htmlFor={`${variable.name}-${option}`} className="text-sm text-gray-700">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {variable.type === 'date' && (
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">Format: YYYY-MM-DD</span>
                    <DatePicker
                      selected={values[variable.name] as Date}
                      onChange={(date: Date | null) => handleChange(variable.name, date || new Date())}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      dateFormat="yyyy-MM-dd"
                    />
                  </div>
                )}

                {variable.type === 'dateRange' && (
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">Select start and end dates for your range</span>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                        <DatePicker
                          selected={Array.isArray(values[variable.name]) ? (values[variable.name] as [Date | null, Date | null])[0] : new Date()}
                          onChange={(date: Date | null) => {
                            const currentRange = Array.isArray(values[variable.name]) ? 
                              values[variable.name] as [Date | null, Date | null] : 
                              [new Date(), new Date()];
                            handleChange(variable.name, [date || new Date(), currentRange[1] || new Date()]);
                          }}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                          dateFormat="yyyy-MM-dd"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">End Date</label>
                        <DatePicker
                          selected={Array.isArray(values[variable.name]) ? (values[variable.name] as [Date | null, Date | null])[1] : new Date()}
                          onChange={(date: Date | null) => {
                            const currentRange = Array.isArray(values[variable.name]) ? 
                              values[variable.name] as [Date | null, Date | null] : 
                              [new Date(), new Date()];
                            handleChange(variable.name, [currentRange[0] || new Date(), date || new Date()]);
                          }}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                          dateFormat="yyyy-MM-dd"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {variable.type === 'text' && (
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">Enter your text:</span>
                    <input
                      type="text"
                      value={values[variable.name] as string || ''}
                      onChange={(e) => handleChange(variable.name, e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Preview Section */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700 border-b pb-2">Template Preview</h3>
            <div className="border border-gray-200 rounded-md p-3 bg-gray-50 min-h-[300px] whitespace-pre-wrap">
              {previewContent || <span className="text-gray-400 italic">Preview will appear here</span>}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 space-x-2">
          <button
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleSubmit}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
} 