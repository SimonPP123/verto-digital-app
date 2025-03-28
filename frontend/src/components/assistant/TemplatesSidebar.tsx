'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { TemplateVariable } from './TemplateVariablesModal';

type Template = {
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
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Templates</h2>
        
        <button
          onClick={handleAddTemplate}
          className="w-full py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center justify-center mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Template
        </button>
        
        <div className="px-3 py-2">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search templates..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>
        </div>
        
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="show-public-only"
            checked={showPublicOnly}
            onChange={() => setShowPublicOnly(!showPublicOnly)}
            className="mr-2"
          />
          <label htmlFor="show-public-only" className="text-sm text-gray-600">
            Show public templates only
          </label>
        </div>
      </div>
      
      {showTemplateForm ? (
        <div className="p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">
            {editingTemplate ? 'Edit Template' : 'New Template'}
          </h3>
          
          <form onSubmit={handleSubmitTemplate}>
            <div className="mb-4">
              <label htmlFor="template-title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                id="template-title"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="template-content" className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <div className="flex items-end mb-1">
                <span className="text-xs text-gray-500 ml-auto">
                  Use {'{{'} variableName {'}}' } for variables
                </span>
              </div>
              <textarea
                id="template-content"
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[150px] text-black"
                required
              />
              <button
                type="button"
                onClick={detectVariables}
                className="mt-1 text-sm text-blue-500 hover:text-blue-700"
              >
                Detect Variables
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Variables
                </label>
                <button
                  type="button"
                  onClick={handleAddVariable}
                  className="text-sm text-blue-500 hover:text-blue-700"
                >
                  + Add Variable
                </button>
              </div>
              
              {templateVariables.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No variables defined. Add variables or use the detect button.
                </p>
              ) : (
                <div className="space-y-3">
                  {templateVariables.map((variable, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-3">
                      <div className="flex justify-between mb-2">
                        <h4 className="text-sm font-medium">Variable {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariable(index)}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div className="mb-2">
                        <label className="block text-xs text-gray-500 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={variable.name}
                          onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                          className="w-full p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          required
                        />
                      </div>
                      
                      <div className="mb-2">
                        <label className="block text-xs text-gray-500 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={variable.description}
                          onChange={(e) => handleVariableChange(index, 'description', e.target.value)}
                          className="w-full p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Default Value
                        </label>
                        <input
                          type="text"
                          value={variable.defaultValue}
                          onChange={(e) => handleVariableChange(index, 'defaultValue', e.target.value)}
                          className="w-full p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        />
                      </div>
                      
                      <div className="mb-2">
                        <label className="block text-xs text-gray-500 mb-1">
                          Variable Type
                        </label>
                        <select
                          value={variable.type || 'text'}
                          onChange={(e) => handleVariableChange(index, 'type', e.target.value)}
                          className="w-full p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        >
                          <option value="text">Text</option>
                          <option value="multiChoice">Multiple Choice</option>
                          <option value="date">Date</option>
                          <option value="dateRange">Date Range</option>
                        </select>
                        
                        {/* Variable Type Information */}
                        <div className="mt-1 text-xs text-gray-500 italic">
                          {variable.type === 'text' && (
                            <p>Text: Simple text input field.</p>
                          )}
                          {variable.type === 'multiChoice' && (
                            <p>Multiple Choice: Add options below that users can select from. Users can select multiple options.</p>
                          )}
                          {variable.type === 'date' && (
                            <p>Date: A calendar date picker. Default value format: YYYY-MM-DD (e.g., 2023-12-31)</p>
                          )}
                          {variable.type === 'dateRange' && (
                            <p>Date Range: Two calendar date pickers for start and end dates. Default value format: YYYY-MM-DD,YYYY-MM-DD (e.g., 2023-01-01,2023-12-31)</p>
                          )}
                        </div>
                      </div>
                      
                      {variable.type === 'multiChoice' && (
                        <div className="mb-2">
                          <label className="block text-xs text-gray-500 mb-1">
                            Options
                          </label>
                          <div className="flex space-x-2 mb-2">
                            <input
                              type="text"
                              value={optionInput || ''}
                              onChange={(e) => setOptionInput(e.target.value)}
                              placeholder="Enter an option"
                              className="flex-1 p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (optionInput && optionInput.trim() !== '') {
                                  const updatedVariables = [...templateVariables];
                                  const currentOptions = updatedVariables[index].options || [];
                                  updatedVariables[index] = {
                                    ...updatedVariables[index],
                                    options: [...currentOptions, optionInput.trim()]
                                  };
                                  setTemplateVariables(updatedVariables);
                                  setOptionInput('');
                                }
                              }}
                              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                            >
                              Add
                            </button>
                          </div>
                          {variable.options && variable.options.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {variable.options.map((opt, optIndex) => (
                                <div key={optIndex} className="flex items-center bg-gray-100 px-2 py-1 rounded text-sm">
                                  <span>{opt}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedVariables = [...templateVariables];
                                      const filteredOptions = (updatedVariables[index].options || []).filter(
                                        (_, i) => i !== optIndex
                                      );
                                      updatedVariables[index] = {
                                        ...updatedVariables[index],
                                        options: filteredOptions
                                      };
                                      setTemplateVariables(updatedVariables);
                                    }}
                                    className="ml-1 text-gray-500 hover:text-red-500"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 italic mt-2">No options added yet</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is-public"
                  checked={isPublic}
                  onChange={() => setIsPublic(!isPublic)}
                  className="mr-2"
                />
                <label htmlFor="is-public" className="text-sm text-gray-700">
                  Make this template public (visible to all users)
                </label>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                {editingTemplate ? 'Update' : 'Create'}
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
                  <div className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-medium text-gray-900 truncate max-w-[180px]">
                            {template.title}
                          </h3>
                          {template.isPublic && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
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
                    
                    <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {template.content}
                    </div>
                    
                    {template.variables && template.variables.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Variables:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((variable, index) => (
                            <span key={index} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                              {variable.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <button
                      className="mt-3 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
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