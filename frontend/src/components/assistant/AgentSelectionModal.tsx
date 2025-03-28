'use client';

import React, { useState, useEffect } from 'react';
import GoogleAnalyticsAuthModal from './GoogleAnalyticsAuthModal';

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
  onSelectAgent
}: AgentSelectionModalProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGA4AuthModal, setShowGA4AuthModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/assistant/agents');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.agents)) {
        setAgents(data.agents);
      } else {
        setAgents([]);
        setError('No available agents found');
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setError('Failed to load available agents. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const checkGA4AuthStatus = async (agent: Agent): Promise<boolean> => {
    if (agent.name !== 'Google Analytics 4') {
      return true; // Not a GA4 agent, no auth needed
    }
    
    try {
      const response = await fetch('/api/analytics/auth/status');
      const data = await response.json();
      
      return data.authenticated === true;
    } catch (error) {
      console.error('Error checking GA4 auth status:', error);
      return false;
    }
  };

  const handleAgentSelection = async (agent: Agent) => {
    // Check if this is the GA4 agent and if authentication is required
    if (agent.name === 'Google Analytics 4') {
      setSelectedAgent(agent);
      
      const isAuthenticated = await checkGA4AuthStatus(agent);
      if (!isAuthenticated) {
        // Show the GA4 auth modal instead of immediately selecting
        setShowGA4AuthModal(true);
        return;
      }
    }
    
    // For non-GA4 agents or if already authenticated, proceed normally
    onSelectAgent(agent);
  };

  const handleAuthSuccess = () => {
    setShowGA4AuthModal(false);
    // Now that authentication is successful, proceed with the agent selection
    if (selectedAgent) {
      onSelectAgent(selectedAgent);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
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
          
          <div className="max-h-[70vh] overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                No agents available
              </div>
            ) : (
              <div className="grid gap-4">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => handleAgentSelection(agent)}
                  >
                    <div className="flex items-center">
                      <div className="bg-blue-100 text-blue-600 p-2 rounded-full mr-3">
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
                        {(!agent.icon || agent.icon === 'bot') && (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-800">{agent.name}</h3>
                        <p className="text-gray-600">{agent.description}</p>
                        {agent.name === 'Google Analytics 4' && (
                          <span className="text-xs text-blue-600 mt-1 block">
                            Requires Google Analytics authentication
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Google Analytics Auth Modal */}
      <GoogleAnalyticsAuthModal 
        isOpen={showGA4AuthModal} 
        onClose={() => setShowGA4AuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
} 