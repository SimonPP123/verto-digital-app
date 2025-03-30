'use client';

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { TemplateVariable, VariableType } from './TemplatesSidebar';

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
      // Make a copy of the variable to avoid modifying the original
      const varCopy = { ...variable };
      
      // Determine effective type (uiType has priority over type)
      const effectiveType = varCopy.uiType || varCopy.type;
      console.log(`Initializing ${varCopy.name}: type=${varCopy.type}, uiType=${varCopy.uiType}, effective=${effectiveType}`);
      
      // Initialize based on effective type
      if (effectiveType === 'multiChoice') {
        // Initialize as array for multiChoice
        initialValues[varCopy.name] = varCopy.defaultValue ? 
          varCopy.defaultValue.split(',').map(v => v.trim()) : [];
      } else if (effectiveType === 'select') {
        // For select type, initialize as a string value (single selection)
        initialValues[varCopy.name] = varCopy.defaultValue || '';
      } else if (effectiveType === 'date') {
        initialValues[varCopy.name] = varCopy.defaultValue ? 
          new Date(varCopy.defaultValue) : new Date();
      } else if (effectiveType === 'dateRange') {
        try {
          // For date ranges, we expect defaultValue to be a comma-separated string of dates
          if (varCopy.defaultValue && varCopy.defaultValue.includes(',')) {
            const dateParts = varCopy.defaultValue.split(',');
            const start = dateParts[0]?.trim() ? new Date(dateParts[0].trim()) : new Date();
            const end = dateParts[1]?.trim() ? new Date(dateParts[1].trim()) : new Date();
            initialValues[varCopy.name] = [start, end];
          } else {
            initialValues[varCopy.name] = [new Date(), new Date()];
          }
        } catch (error) {
          console.error('Error parsing date range:', error);
          initialValues[varCopy.name] = [new Date(), new Date()];
        }
      } else {
        initialValues[varCopy.name] = varCopy.defaultValue || '';
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
            className="text-black hover:text-gray-800"
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
            <h3 className="font-medium text-black border-b pb-2">Variables</h3>
            {variables.map(variable => {
              // Make a copy but RESPECT the original type 
              const varCopy = { ...variable };
              
              // Determine display type based on uiType first (if available), fallback to type
              let displayType = varCopy.uiType || varCopy.type;
              
              // Log for debugging
              console.log(`Variable ${varCopy.name}: type=${varCopy.type}, uiType=${varCopy.uiType}, displayType=${displayType}`);
              
              return (
                <div key={varCopy.name} className="border border-gray-300 rounded-md p-3 bg-white">
                  <label className="block font-medium text-black mb-1">
                    {varCopy.name}
                    {varCopy.description && (
                      <span className="ml-1 font-normal text-black text-sm">
                        ({varCopy.description})
                      </span>
                    )}
                  </label>

                  {displayType === 'select' && (
                    <div className="space-y-2">
                      <span className="block text-xs text-black mb-1">
                        <span className="inline-block bg-purple-100 text-purple-800 font-medium rounded px-2 py-0.5 mr-1">Single Choice</span>
                        Select exactly one option:
                      </span>
                      <div className="relative">
                        <select
                          value={values[varCopy.name] as string}
                          onChange={(e) => handleChange(varCopy.name, e.target.value)}
                          className="w-full p-2 border border-purple-300 rounded text-sm bg-white text-black appearance-none pl-3 pr-8 focus:border-purple-500 focus:ring-2 focus:ring-purple-300 focus:outline-none"
                        >
                          <option value="" className="text-black">-- Select one option --</option>
                          {(Array.isArray(varCopy.options) 
                            ? varCopy.options 
                            : (varCopy.options || '').split('\n').filter(Boolean)
                          ).map((option: string, optIndex: number) => (
                            <option key={`${varCopy.name}-${option}-${optIndex}`} value={option} className="text-black">
                              {option}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {displayType === 'multiChoice' && (
                    <div className="space-y-2">
                      <span className="block text-xs text-black mb-1">
                        <span className="inline-block bg-pink-100 text-pink-800 font-medium rounded px-2 py-0.5 mr-1">Multiple Choice</span>
                        Select one or more options:
                      </span>
                      <div className="p-2 border border-pink-200 rounded-md bg-white max-h-48 overflow-y-auto">
                        {(Array.isArray(varCopy.options) 
                          ? varCopy.options 
                          : (varCopy.options || '').split('\n').filter(Boolean)
                        ).map((option: string, optIndex: number) => (
                          <div key={`${varCopy.name}-${option}-${optIndex}`} className="flex items-center py-1 hover:bg-pink-50 rounded px-1">
                            <input
                              type="checkbox"
                              id={`${varCopy.name}-${option}-${optIndex}`}
                              checked={(values[varCopy.name] as string[] || []).includes(option)}
                              onChange={(e) => {
                                const currentValues = values[varCopy.name] as string[] || [];
                                if (e.target.checked) {
                                  handleChange(varCopy.name, [...currentValues, option]);
                                } else {
                                  handleChange(
                                    varCopy.name,
                                    currentValues.filter(v => v !== option)
                                  );
                                }
                              }}
                              className="mr-2 h-4 w-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                            />
                            <label htmlFor={`${varCopy.name}-${option}-${optIndex}`} className="text-sm text-black">
                              {option}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {displayType === 'date' && (
                    <div>
                      <span className="block text-xs text-black mb-1">Format: YYYY-MM-DD</span>
                      <DatePicker
                        selected={values[varCopy.name] as Date}
                        onChange={(date: Date | null) => handleChange(varCopy.name, date || new Date())}
                        className="w-full p-2 border border-gray-300 rounded text-sm bg-white text-black"
                        dateFormat="yyyy-MM-dd"
                      />
                    </div>
                  )}

                  {displayType === 'dateRange' && (
                    <div>
                      <span className="block text-xs text-black mb-1">Select start and end dates for your range</span>
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <label className="block text-xs text-black mb-1">Start Date</label>
                          <DatePicker
                            selected={Array.isArray(values[varCopy.name]) ? (values[varCopy.name] as [Date | null, Date | null])[0] : new Date()}
                            onChange={(date: Date | null) => {
                              const currentRange = Array.isArray(values[varCopy.name]) ? 
                                values[varCopy.name] as [Date | null, Date | null] : 
                                [new Date(), new Date()];
                              handleChange(varCopy.name, [date || new Date(), currentRange[1] || new Date()]);
                            }}
                            className="w-full p-2 border border-gray-300 rounded text-sm bg-white text-black"
                            dateFormat="yyyy-MM-dd"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-black mb-1">End Date</label>
                          <DatePicker
                            selected={Array.isArray(values[varCopy.name]) ? (values[varCopy.name] as [Date | null, Date | null])[1] : new Date()}
                            onChange={(date: Date | null) => {
                              const currentRange = Array.isArray(values[varCopy.name]) ? 
                                values[varCopy.name] as [Date | null, Date | null] : 
                                [new Date(), new Date()];
                              handleChange(varCopy.name, [currentRange[0] || new Date(), date || new Date()]);
                            }}
                            className="w-full p-2 border border-gray-300 rounded text-sm bg-white text-black"
                            dateFormat="yyyy-MM-dd"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {displayType === 'text' && (
                    <div>
                      <span className="block text-xs text-black mb-1">Enter your text:</span>
                      <input
                        type="text"
                        value={values[varCopy.name] as string || ''}
                        onChange={(e) => handleChange(varCopy.name, e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm bg-white text-black"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Preview Section */}
          <div className="space-y-2">
            <h3 className="font-medium text-black border-b pb-2">Template Preview</h3>
            <div className="border border-gray-300 rounded-md p-3 bg-white min-h-[300px] whitespace-pre-wrap text-black">
              {previewContent || <span className="text-gray-700 italic">Preview will appear here</span>}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 space-x-2">
          <button
            className="px-4 py-2 bg-gray-200 text-black rounded hover:bg-gray-300"
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