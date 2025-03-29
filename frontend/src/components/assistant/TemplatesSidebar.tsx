'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';

// Update the TemplateVariable type to match what's in TemplateVariablesModal
export type VariableType = 'text' | 'select' | 'multiChoice' | 'date' | 'dateRange';

export type TemplateVariable = {
  _id?: string;
  name: string;
  description: string;
  defaultValue: string;
  type: VariableType;
  options?: string; // For select type variables, we'll store as newline-separated string
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
    setTemplateVariables(template.variables || []);
    setIsPublic(template.isPublic);
    setShowTemplateForm(true);
  };
  
  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Clean variables to remove MongoDB _id properties before sending
      const cleanedVariables = templateVariables.map(({ _id, ...rest }) => rest);
      
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
      { name: '', description: '', defaultValue: '', type: 'text' }
    ]);
  };
  
  const handleVariableChange = (index: number, field: keyof TemplateVariable, value: string) => {
    const updatedVariables = [...templateVariables];
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
              type: 'text'
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
    <div className="flex flex-col h-full">
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">Templates</h2>
            <button
              onClick={handleAddTemplate}
              className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + New Template
            </button>
          </div>
          
          <div className="flex items-center space-x-2 w-full">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
              <svg 
                className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center">
            <label className="flex items-center text-xs sm:text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showPublicOnly}
                onChange={(e) => setShowPublicOnly(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              Show public templates only
            </label>
          </div>
        </div>
      </div>
      
      {showTemplateForm ? (
        <div className="p-3 sm:p-4 flex-1 overflow-y-auto">
          <form onSubmit={handleSubmitTemplate} className="space-y-4">
            <div>
              <label htmlFor="template-title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                id="template-title"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                required
              />
            </div>
            
            <div>
              <label htmlFor="template-content" className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                id="template-content"
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                rows={8}
                required
              ></textarea>
              
              <div className="mt-1 flex justify-end">
                <button
                  type="button"
                  onClick={detectVariables}
                  className="text-xs sm:text-sm px-2 py-1 text-blue-600 hover:text-blue-800"
                >
                  Detect Variables
                </button>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Variables
                </label>
                <button
                  type="button"
                  onClick={handleAddVariable}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  + Add Variable
                </button>
              </div>
              
              {templateVariables.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {templateVariables.map((variable, index) => (
                    <div key={index} className="p-2 border border-gray-200 rounded-md bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">Variable {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariable(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Name</label>
                          <input
                            type="text"
                            value={variable.name}
                            onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Description</label>
                          <input
                            type="text"
                            value={variable.description}
                            onChange={(e) => handleVariableChange(index, 'description', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Default Value</label>
                          <input
                            type="text"
                            value={variable.defaultValue}
                            onChange={(e) => handleVariableChange(index, 'defaultValue', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Type</label>
                          <select
                            value={variable.type}
                            onChange={(e) => handleVariableChange(index, 'type', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          >
                            <option value="text">Text</option>
                            <option value="select">Select (Dropdown)</option>
                          </select>
                        </div>
                        
                        {variable.type === 'select' && (
                          <div>
                            <div className="flex items-center mb-1">
                              <label className="block text-xs text-gray-600 flex-1">Options</label>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!optionInput.trim()) return;
                                  
                                  const currentOptions = variable.options || '';
                                  handleVariableChange(index, 'options', currentOptions ? 
                                    `${currentOptions}\n${optionInput.trim()}` : optionInput.trim());
                                  setOptionInput('');
                                }}
                                className="text-xs px-1 py-0.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                disabled={!optionInput.trim()}
                              >
                                + Add
                              </button>
                            </div>
                            
                            <div className="flex mb-1">
                              <input
                                type="text"
                                value={optionInput}
                                onChange={(e) => setOptionInput(e.target.value)}
                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-l focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                placeholder="Enter option value"
                              />
                            </div>
                            
                            {variable.options && variable.options.trim() && (
                              <div className="bg-white p-1 border border-gray-200 rounded max-h-24 overflow-y-auto">
                                <ul className="space-y-1">
                                  {variable.options.split('\n').filter(Boolean).map((option: string, optIdx: number) => (
                                    <li key={optIdx} className="flex items-center justify-between text-xs">
                                      <span className="truncate">{option}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const options = variable.options?.split('\n').filter(Boolean) || [];
                                          options.splice(optIdx, 1);
                                          handleVariableChange(index, 'options', options.join('\n'));
                                        }}
                                        className="text-red-500 hover:text-red-700 ml-1"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="text-xs text-gray-500 mb-2">
                  No variables added yet. Variables allow users to customize the template.
                </div>
              )}
            </div>
            
            <div>
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
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingTemplate ? 'Update Template' : 'Save Template'}
              </button>
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
            </div>
          </form>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {sortedTemplates.length === 0 ? (
            <div className="text-center text-gray-500 p-4">
              {searchQuery ? 'No templates match your search' : 'No templates available'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {sortedTemplates.map(template => (
                <li key={template._id} className="relative hover:bg-gray-50">
                  <div className="p-2 sm:p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <h3 className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-[180px]">
                            {template.title}
                          </h3>
                          {template.isPublic && (
                            <span className="ml-1 sm:ml-2 px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
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
                          className="p-1 text-gray-500 hover:text-gray-700 mr-1"
                          onClick={() => handleEditTemplate(template)}
                          title="Edit template"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          className="p-1 text-gray-500 hover:text-gray-700"
                          onClick={() => handleDeleteTemplate(template._id)}
                          title="Delete template"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs sm:text-sm text-gray-600 line-clamp-2">
                      {template.content}
                    </div>
                    
                    {template.variables && template.variables.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Variables:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((variable, index) => (
                            <span key={index} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                              {variable.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <button
                      className="mt-2 sm:mt-3 px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      onClick={() => onUseTemplate(template)}
                    >
                      Use Template
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
} 