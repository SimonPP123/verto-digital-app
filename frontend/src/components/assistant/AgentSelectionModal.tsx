'use client';

import React, { useState, useEffect } from 'react';

type Agent = {
  id: string;
  name: string;
  webhookUrl: string;
  icon: string;
  description: string;
};

type AgentSelectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectAgent: (agent: Agent) => void;
};

export default function AgentSelectionModal({
  isOpen,
  onClose,
  onSelectAgent,
}: AgentSelectionModalProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/assistant/agents');
        
        if (!response.ok) {
          throw new Error('Failed to fetch agents');
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.agents)) {
          setAgents(data.agents);
        } else {
          setAgents([]);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
        setError('Failed to load agents. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Select an AI Agent</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading agents...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-500">
              <p>{error}</p>
              <button 
                onClick={() => setLoading(true)} 
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : agents.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p>No agents available.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  className="flex items-start p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  onClick={() => onSelectAgent(agent)}
                >
                  <div className="bg-blue-100 text-blue-600 p-3 rounded-full mr-4">
                    {agent.icon === 'database' && (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                      </svg>
                    )}
                    {agent.icon === 'chart-bar' && (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )}
                    {agent.icon === 'bot' && (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{agent.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 mr-2"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 