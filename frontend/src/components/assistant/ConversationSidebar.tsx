'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';

type Conversation = {
  conversationId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  agent?: {
    name: string;
    webhookUrl: string;
    icon: string;
    description: string;
  };
};

type ConversationSidebarProps = {
  conversations: Conversation[];
  currentConversationId: string | undefined;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (conversationId: string, newTitle: string) => void;
  onArchiveConversation: (conversationId: string, isArchived: boolean) => void;
  onDeleteConversation: (conversationId: string) => void;
  onExportConversation: (conversationId: string) => void;
  renderAgentBadge?: (conversation: Conversation) => React.ReactNode;
};

export default function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onArchiveConversation,
  onDeleteConversation,
  onExportConversation,
  renderAgentBadge
}: ConversationSidebarProps) {
  const [isRenamingConversation, setIsRenamingConversation] = useState<string | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleRename = (conversationId: string) => {
    setIsRenamingConversation(conversationId);
    const conversation = conversations.find(c => c.conversationId === conversationId);
    setNewConversationTitle(conversation ? conversation.title : '');
  };
  
  const submitRename = (conversationId: string) => {
    if (newConversationTitle.trim()) {
      onRenameConversation(conversationId, newConversationTitle.trim());
    }
    setIsRenamingConversation(null);
  };
  
  const filteredConversations = conversations.filter(conversation => {
    // Filter by search query
    const matchesSearch = !searchQuery || 
      conversation.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by archived status
    const matchesArchived = showArchived || !conversation.isArchived;
    
    return matchesSearch && matchesArchived;
  });
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Conversations</h2>
        
        <button
          onClick={onNewConversation}
          className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Conversation
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
              placeholder="Search conversations..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>
        </div>
        
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="show-archived"
            checked={showArchived}
            onChange={() => setShowArchived(!showArchived)}
            className="mr-2"
          />
          <label htmlFor="show-archived" className="text-sm text-gray-600">
            Show archived conversations
          </label>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="text-center text-gray-500 p-4">
            {searchQuery ? 'No conversations match your search' : 'No conversations available'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredConversations.map(conversation => (
              <li 
                key={conversation.conversationId}
                className={`relative ${
                  currentConversationId === conversation.conversationId
                    ? 'bg-blue-50 text-blue-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                {isRenamingConversation === conversation.conversationId ? (
                  <div className="p-3">
                    <input
                      type="text"
                      className="w-full p-1 border border-gray-300 rounded text-black"
                      value={newConversationTitle}
                      onChange={(e) => setNewConversationTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          submitRename(conversation.conversationId);
                        } else if (e.key === 'Escape') {
                          setIsRenamingConversation(null);
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex mt-2 text-sm">
                      <button
                        onClick={() => submitRename(conversation.conversationId)}
                        className="text-blue-500 hover:text-blue-700 mr-3 text-black"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsRenamingConversation(null)}
                        className="text-gray-500 hover:text-gray-700 text-black"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="w-full text-left p-3 focus:outline-none group cursor-pointer"
                    onClick={() => onSelectConversation(conversation.conversationId)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900 truncate max-w-[180px]">
                          {conversation.title}
                        </h3>
                        <div className="flex items-center mt-1">
                          <p className="text-xs text-gray-500">
                            {format(new Date(conversation.updatedAt), 'PP p')}
                          </p>
                          {renderAgentBadge && conversation.agent && (
                            <div className="ml-2">
                              {renderAgentBadge(conversation)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="relative flex items-center">
                          <button
                            className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRename(conversation.conversationId);
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          
                          <button
                            className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              const dropdown = document.getElementById(`dropdown-${conversation.conversationId}`);
                              dropdown?.classList.toggle('hidden');
                            }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          
                          {/* Dropdown menu */}
                          <div
                            id={`dropdown-${conversation.conversationId}`}
                            className="hidden absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="py-1">
                              <button
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onArchiveConversation(conversation.conversationId, !conversation.isArchived);
                                }}
                              >
                                {conversation.isArchived ? 'Unarchive' : 'Archive'}
                              </button>
                              <button
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onExportConversation(conversation.conversationId);
                                }}
                              >
                                Export as PDF
                              </button>
                              <button
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
                                    onDeleteConversation(conversation.conversationId);
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}