'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// 'select' is used in the UI but mapped to 'multiChoice' when saving to the backend
// Backend only accepts: text, multiChoice, date, dateRange
export type VariableType = 'text' | 'select' | 'multiChoice' | 'date' | 'dateRange';

export type TemplateVariable = {
  _id?: string;
  name: string;
  description: string;
  defaultValue: string;
  type: VariableType;
  options: string[] | string;
  uiType?: 'select' | 'multiChoice'; // Added to preserve UI display preference
};

export type Template = {
  _id: string;
  title: string;
  content: string;
  variables: TemplateVariable[];
  isPublic: boolean;
  user: string;
  createdAt: string;
  updatedAt: string;
};

type TemplatesSidebarProps = {
  templates: Template[];
  onUseTemplate: (template: Template) => void;
  onTemplatesChanged: () => void;
};

export default function TemplatesSidebar({
  templates,
  onUseTemplate,
  onTemplatesChanged
}: TemplatesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [showPublicOnly, setShowPublicOnly] = useState(false);
  const [optionInput, setOptionInput] = useState('');
  
  const resetForm = () => {
    setTemplateTitle('');
    setTemplateContent('');
    setTemplateVariables([]);
    setIsPublic(false);
    setEditingTemplate(null);
    setOptionInput('');
  };
  
  const handleAddTemplate = () => {
    setShowTemplateForm(true);
    resetForm();
  };
  
  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setTemplateTitle(template.title);
    setTemplateContent(template.content);
    
    // Map the variables to ensure UI consistency, but PRESERVE multiChoice and properly handle options
    const mappedVariables = template.variables?.map(variable => {
      // Clone the variable
      const mappedVar = { ...variable };
      
      // Set UI type based on the backend data
      if (variable.type === 'multiChoice') {
        // Check if this variable has a stored UI preference
        if (variable.uiType === 'select') {
          // If it has a UI preference for select, use that
          mappedVar.type = 'select';
        } else {
          // Otherwise determine type based on name/description
          if (!variable.name.toLowerCase().includes('multi') && 
              !variable.description.toLowerCase().includes('multi') &&
              !variable.description.toLowerCase().includes('multiple') &&
              !variable.description.toLowerCase().includes('choices') &&
              !variable.description.toLowerCase().includes('several')) {
            mappedVar.type = 'select';
          } else {
            mappedVar.type = 'multiChoice';
          }
        }
      }
      
      // Ensure options are proper arrays for select and multiChoice
      if (mappedVar.type === 'select' || mappedVar.type === 'multiChoice') {
        // When options come from the backend, they might need conversion
        if (!Array.isArray(mappedVar.options)) {
          // If options is a string, split it into an array
          if (typeof mappedVar.options === 'string') {
            mappedVar.options = mappedVar.options.split('\n').filter(Boolean);
          } else {
            // Initialize as empty array if undefined or null
            mappedVar.options = [];
          }
        }
      } else {
        // For other types, options should be an empty array
        mappedVar.options = [];
      }
      
      return mappedVar;
    }) || [];
    
    setTemplateVariables(mappedVariables);
    setIsPublic(template.isPublic);
    setShowTemplateForm(true);
    
    // Debug
    console.log("Loaded template variables for editing:", JSON.stringify(mappedVariables));
  };
  
  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Log for debugging
      console.log("Original variables before cleaning:", JSON.stringify(templateVariables));
      
      // Clean variables and ensure options is an array for select and multiChoice types
      const cleanedVariables = templateVariables.map(({ _id, ...variable }) => {
        const cleanedVar = { ...variable };
        
        // Convert options to proper format based on type
        if (variable.type === 'select' || variable.type === 'multiChoice') {
          // Always ensure options is an array
          if (typeof variable.options === 'string') {
            cleanedVar.options = variable.options.split('\n').filter(Boolean);
          } else if (!Array.isArray(variable.options)) {
            cleanedVar.options = [];
          } else {
            // Make a copy of the array to avoid reference issues
            cleanedVar.options = [...variable.options];
          }
          
          // Ensure no empty options
          cleanedVar.options = cleanedVar.options.filter(opt => opt.trim().length > 0);
        } else {
          // For other types, options should be an empty array
          cleanedVar.options = [];
        }
        
        // Store the UI preference before converting for backend
        if (cleanedVar.type === 'select') {
          cleanedVar.uiType = 'select';
          cleanedVar.type = 'multiChoice'; // Backend only accepts multiChoice
        } else if (cleanedVar.type === 'multiChoice') {
          cleanedVar.uiType = 'multiChoice';
        }
        
        return cleanedVar;
      });
      
      // Log for debugging
      console.log("Cleaned variables being sent to backend:", JSON.stringify(cleanedVariables));
      
      const templateData = {
        title: templateTitle,
        content: templateContent,
        variables: cleanedVariables,
        isPublic
      };
      
      let response;
      
      if (editingTemplate) {
        // Update existing template
        response = await fetch(`/api/assistant/templates/${editingTemplate._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(templateData)
        });
      } else {
        // Create new template
        response = await fetch('/api/assistant/templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(templateData)
        });
      }
      
      if (!response.ok) {
        // Try to get detailed error message from response
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || 
                            errorData?.error || 
                            `Failed to ${editingTemplate ? 'update' : 'create'} template`;
        throw new Error(errorMessage);
      }
      
      // Refresh templates list
      onTemplatesChanged();
      
      // Reset form and hide it
      resetForm();
      setShowTemplateForm(false);
    } catch (error) {
      console.error('Error saving template:', error);
      alert(`Failed to save template: ${error instanceof Error ? error.message : 'Please try again later.'}`);
    }
  };
  
  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/assistant/templates/${templateId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete template');
        }
        
        // Refresh templates list
        onTemplatesChanged();
      } catch (error) {
        console.error('Error deleting template:', error);
        alert('Failed to delete template. Please try again later.');
      }
    }
  };
  
  const handleAddVariable = () => {
    setTemplateVariables([
      ...templateVariables,
      { name: '', description: '', defaultValue: '', type: 'text', options: [] }
    ]);
  };
  
  const handleVariableChange = (index: number, field: keyof TemplateVariable, value: any) => {
    const updatedVariables = [...templateVariables];
    
    if (field === 'type') {
      // When changing type, initialize appropriate options structure
      if (value === 'select' || value === 'multiChoice') {
        // For select/multiChoice, convert existing options string to array if needed
        if (typeof updatedVariables[index].options === 'string') {
          const optionsString = updatedVariables[index].options as string;
          updatedVariables[index].options = optionsString.split('\n').filter(Boolean);
        } else if (!updatedVariables[index].options) {
          updatedVariables[index].options = [];
        }
        
        // If changing from select to multiChoice or vice versa, ensure the defaultValue is updated
        if (value === 'multiChoice' && updatedVariables[index].type === 'select') {
          // If changing from select to multiChoice, convert string to array
          if (typeof updatedVariables[index].defaultValue === 'string' && updatedVariables[index].defaultValue) {
            updatedVariables[index].defaultValue = updatedVariables[index].defaultValue;
          } else {
            updatedVariables[index].defaultValue = '';
          }
        } else if (value === 'select' && updatedVariables[index].type === 'multiChoice') {
          // If changing from multiChoice to select, take first value or empty
          if (typeof updatedVariables[index].defaultValue === 'string' && updatedVariables[index].defaultValue.includes(',')) {
            updatedVariables[index].defaultValue = updatedVariables[index].defaultValue.split(',')[0].trim();
          }
        }
      } else {
        // For other types, options is not needed
        updatedVariables[index].options = [];
      }
    } else if (field === 'options') {
      // Special handling for options field to ensure it's always properly formatted
      if (updatedVariables[index].type === 'select' || updatedVariables[index].type === 'multiChoice') {
        // If value is a string, convert to array
        if (typeof value === 'string') {
          updatedVariables[index].options = value.split('\n').filter(Boolean);
        } else if (Array.isArray(value)) {
          // Make a copy of the array to avoid reference issues
          updatedVariables[index].options = [...value];
        } else {
          // Initialize as empty array if undefined or null
          updatedVariables[index].options = [];
        }
      } else {
        // For other types, options should be an empty array
        updatedVariables[index].options = [];
      }
      
      // Set the updated variable with the processed options
      updatedVariables[index] = {
        ...updatedVariables[index],
        options: updatedVariables[index].options
      };
      
      // Debug
      console.log(`Updated options for variable ${index}:`, updatedVariables[index].options);
      
      // Update the state and return to avoid setting the field again below
      setTemplateVariables(updatedVariables);
      return;
    }
    
    updatedVariables[index] = {
      ...updatedVariables[index],
      [field]: value
    };
    
    setTemplateVariables(updatedVariables);
  };
  
  const handleRemoveVariable = (index: number) => {
    const updatedVariables = [...templateVariables];
    updatedVariables.splice(index, 1);
    setTemplateVariables(updatedVariables);
  };
  
  const detectVariables = () => {
    // Find all variables in the format {{variableName}}
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = templateContent.match(variableRegex);
    
    if (matches) {
      const newVariables: TemplateVariable[] = [];
      const varNames = new Set<string>();
      
      matches.forEach(match => {
        const varName = match.slice(2, -2).trim();
        
        if (!varNames.has(varName)) {
          varNames.add(varName);
          
          // Check if variable already exists in the list
          const existingVar = templateVariables.find(v => v.name === varName);
          
          if (existingVar) {
            newVariables.push(existingVar);
          } else {
            newVariables.push({
              name: varName,
              description: '',
              defaultValue: '',
              type: 'text',
              options: []
            });
          }
        }
      });
      
      setTemplateVariables(newVariables);
    }
  };
  
  const filteredTemplates = templates.filter(template => {
    // Filter by search query
    const matchesSearch = !searchQuery || 
      template.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by visibility
    const matchesVisibility = !showPublicOnly || template.isPublic;
    
    return matchesSearch && matchesVisibility;
  });
  
  // Sort templates - public templates first, then by title
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.isPublic !== b.isPublic) {
      return a.isPublic ? -1 : 1;
    }
    return a.title.localeCompare(b.title);
  });
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-3 sm:p-4 border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">Templates</h2>
            <button
              onClick={handleAddTemplate}
              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Template
              </span>
            </button>
          </div>
          
          <div className="flex items-center space-x-2 w-full">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors text-black"
              />
              <svg 
                className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center">
            <label className="flex items-center text-sm text-gray-700 cursor-pointer group">
              <span className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  checked={showPublicOnly}
                  onChange={(e) => setShowPublicOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </span>
              <span className="ml-2 text-sm">Show public templates only</span>
            </label>
          </div>
        </div>
      </div>
      
      {showTemplateForm ? (
        <div className="p-3 sm:p-4 flex-1 overflow-y-auto bg-gray-50">
          <form onSubmit={handleSubmitTemplate} className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <label htmlFor="template-title" className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                id="template-title"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                placeholder="Enter template title..."
                required
              />
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <label htmlFor="template-content" className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                id="template-content"
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                rows={10}
                placeholder="Enter template content with variables in {{variableName}} format..."
                required
              ></textarea>
              
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={detectVariables}
                  className="text-sm px-3 py-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Detect Variables
                </button>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Variables
                </label>
                <button
                  type="button"
                  onClick={handleAddVariable}
                  className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  + Add Variable
                </button>
              </div>
              
              {templateVariables.length > 0 ? (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                  {templateVariables.map((variable, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-md bg-gray-50 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Variable {index + 1}: {variable.name || '[Unnamed]'}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariable(index)}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Name</label>
                          <input
                            type="text"
                            value={variable.name}
                            onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                            placeholder="Variable name"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Type</label>
                          <select
                            value={variable.type}
                            onChange={(e) => handleVariableChange(index, 'type', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                          >
                            <option value="text">Text</option>
                            <option value="select">Select (Dropdown)</option>
                            <option value="multiChoice">Multiple Choice</option>
                            <option value="date">Date</option>
                            <option value="dateRange">Date Range</option>
                          </select>
                        </div>
                        
                        <div className="sm:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">Description</label>
                          <input
                            type="text"
                            value={variable.description}
                            onChange={(e) => handleVariableChange(index, 'description', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                            placeholder="Describe this variable (optional)"
                          />
                        </div>
                        
                        {variable.type !== 'select' && variable.type !== 'multiChoice' && variable.type !== 'dateRange' && (
                          <div className="sm:col-span-2">
                            <label className="block text-sm text-gray-600 mb-1">Default Value</label>
                            {variable.type === 'date' ? (
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Format: YYYY-MM-DD</div>
                                <DatePicker
                                  selected={variable.defaultValue ? new Date(variable.defaultValue) : new Date()}
                                  onChange={(date: Date | null) => {
                                    if (!date) return;
                                    // Format date as YYYY-MM-DD
                                    const formattedDate = date.toISOString().split('T')[0];
                                    handleVariableChange(index, 'defaultValue', formattedDate);
                                  }}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                                  dateFormat="yyyy-MM-dd"
                                />
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={variable.defaultValue}
                                onChange={(e) => handleVariableChange(index, 'defaultValue', e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                                placeholder="Default value (optional)"
                              />
                            )}
                          </div>
                        )}
                        
                        {variable.type === 'dateRange' && (
                          <div className="sm:col-span-2">
                            <label className="block text-sm text-gray-600 mb-1">Default Date Range</label>
                            <div className="text-xs text-gray-500 mb-1">Format: YYYY-MM-DD to YYYY-MM-DD</div>
                            <div className="flex space-x-2">
                              <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                                <DatePicker
                                  selected={variable.defaultValue && variable.defaultValue.includes(' to ') 
                                    ? new Date(variable.defaultValue.split(' to ')[0]) 
                                    : new Date()}
                                  onChange={(date: Date | null) => {
                                    if (!date) return;
                                    // Get current end date or today
                                    const endDateStr = variable.defaultValue && variable.defaultValue.includes(' to ')
                                      ? variable.defaultValue.split(' to ')[1]
                                      : new Date().toISOString().split('T')[0];
                                    // Format start date as YYYY-MM-DD
                                    const startDateStr = date.toISOString().split('T')[0];
                                    // Combine into a range
                                    handleVariableChange(index, 'defaultValue', `${startDateStr} to ${endDateStr}`);
                                  }}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                                  dateFormat="yyyy-MM-dd"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                                <DatePicker
                                  selected={variable.defaultValue && variable.defaultValue.includes(' to ') 
                                    ? new Date(variable.defaultValue.split(' to ')[1]) 
                                    : new Date()}
                                  onChange={(date: Date | null) => {
                                    if (!date) return;
                                    // Get current start date or today
                                    const startDateStr = variable.defaultValue && variable.defaultValue.includes(' to ')
                                      ? variable.defaultValue.split(' to ')[0]
                                      : new Date().toISOString().split('T')[0];
                                    // Format end date as YYYY-MM-DD
                                    const endDateStr = date.toISOString().split('T')[0];
                                    // Combine into a range
                                    handleVariableChange(index, 'defaultValue', `${startDateStr} to ${endDateStr}`);
                                  }}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                                  dateFormat="yyyy-MM-dd"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {(variable.type === 'select' || variable.type === 'multiChoice') && (
                          <div className="sm:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-sm text-gray-600">Options</label>
                              {variable.type === 'multiChoice' && <div className="text-xs text-gray-500">(Multiple Selection)</div>}
                            </div>
                            <div className="flex space-x-2 mb-2">
                              <input
                                type="text"
                                value={optionInput}
                                onChange={(e) => setOptionInput(e.target.value)}
                                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-l-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black"
                                placeholder="Enter option value"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!optionInput.trim()) return;
                                  
                                  const currentOptions = variable.options || [];
                                  const updatedOptions = Array.isArray(currentOptions) 
                                    ? [...currentOptions, optionInput.trim()] 
                                    : currentOptions.split('\n').filter(Boolean).concat(optionInput.trim());
                                  
                                  handleVariableChange(index, 'options', updatedOptions);
                                  setOptionInput('');
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-r-md hover:bg-blue-700 transition-colors"
                                disabled={!optionInput.trim()}
                              >
                                Add Option
                              </button>
                            </div>
                            
                            {variable.options && (Array.isArray(variable.options) ? variable.options.length > 0 : variable.options.trim()) && (
                              <div className="bg-white p-2 border border-gray-200 rounded-md max-h-28 overflow-y-auto">
                                <ul className="space-y-1.5">
                                  {(Array.isArray(variable.options) 
                                    ? variable.options 
                                    : variable.options.split('\n').filter(Boolean)
                                  ).map((option: string, optIdx: number) => (
                                    <li key={optIdx} className="flex items-center justify-between text-sm px-2 py-1 rounded-md hover:bg-gray-50">
                                      <span className="truncate text-black">{option}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentOptions = variable.options;
                                          if (Array.isArray(currentOptions)) {
                                            const updatedOptions = [...currentOptions];
                                            updatedOptions.splice(optIdx, 1);
                                            handleVariableChange(index, 'options', updatedOptions);
                                          } else {
                                            const optionsArray = currentOptions.split('\n').filter(Boolean);
                                            optionsArray.splice(optIdx, 1);
                                            handleVariableChange(index, 'options', optionsArray.join('\n'));
                                          }
                                        }}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1 transition-colors ml-2"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-blue-50 text-blue-800 p-3 rounded-md mb-3">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm">No variables added yet.</p>
                      <p className="text-xs mt-1">Variables allow users to customize the template with their own values. 
                      Use the format {"{{variableName}}"} in your template content and click "Detect Variables" or add them manually.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                Make this template available to all users
              </label>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowTemplateForm(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingTemplate ? 'Update Template' : 'Save Template'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-4">
          {sortedTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-10 text-center text-gray-500">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">
                {searchQuery ? 'No templates match your search' : 'No templates available'}
              </p>
              <p className="text-sm mt-2 max-w-md">
                {searchQuery ? 'Try using different keywords or clear your search' : 'Create your first template by clicking "+ New Template"'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {sortedTemplates.map(template => (
                <div key={template._id} className="relative bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                  <div className="p-5">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-medium text-gray-900 truncate max-w-[280px]">
                            {template.title}
                          </h3>
                          {template.isPublic && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Public
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(template.updatedAt), 'PP')}
                        </p>
                      </div>
                      
                      <div className="flex">
                        <button
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                          onClick={() => handleEditTemplate(template)}
                          title="Edit template"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors ml-1"
                          onClick={() => handleDeleteTemplate(template._id)}
                          title="Delete template"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-sm text-gray-600">
                      <p className="line-clamp-3">{template.content}</p>
                    </div>
                    
                    {template.variables && template.variables.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2">Variables:</p>
                        <div className="flex flex-wrap gap-2">
                          {template.variables.map((variable, index) => (
                            <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full flex items-center">
                              <span className="w-2 h-2 rounded-full mr-1.5" 
                                style={{ 
                                  backgroundColor: 
                                    variable.type === 'text' ? '#6366f1' : 
                                    variable.uiType === 'select' || variable.type === 'select' ? '#8b5cf6' :
                                    variable.type === 'multiChoice' ? '#ec4899' :
                                    variable.type === 'date' ? '#14b8a6' :
                                    '#f97316'
                                }}
                              ></span>
                              {variable.name}
                              <span className="ml-1 text-xs text-gray-500">
                                ({variable.uiType === 'select' || variable.type === 'select' ? 'Select' :
                                  variable.type === 'multiChoice' ? 'Multiple Choice' : 
                                  variable.type === 'date' ? 'Date' : 
                                  variable.type === 'dateRange' ? 'Date Range' : 'Text'})
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center"
                        onClick={() => onUseTemplate(template)}
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Use Template
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 