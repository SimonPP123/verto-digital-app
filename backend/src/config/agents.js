// Load agent configurations from environment variables
// Only BigQuery and Google Analytics 4 agents will be available for selection

/**
 * Get available agents from environment variables
 * @returns {Array} Array of agent objects
 */
function getAgentsFromEnv() {
  const agents = [];
  const whitelistedAgents = ['BIGQUERY', 'GOOGLE_ANALYTICS_4'];
  
  const agentMetadata = {
    'BIGQUERY': {
      name: 'BigQuery Agent',
      icon: 'database',
      description: 'AI agent specialized in querying and analyzing BigQuery data'
    },
    'GOOGLE_ANALYTICS_4': {
      name: 'Google Analytics 4',
      icon: 'chart-bar',
      description: 'AI agent for Google Analytics 4 insights and reporting'
    }
  };

  // Loop through environment variables to find agents
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('N8N_')) {
      // Extract agent identifier (everything after N8N_)
      const agentId = key.replace('N8N_', '');
      const webhookUrl = process.env[key];
      
      // Skip empty webhook URLs or non-whitelisted agents
      if (!webhookUrl || !whitelistedAgents.includes(agentId)) return;
      
      // Use metadata for the specific agent
      const metadata = agentMetadata[agentId];
      
      // Skip if no metadata found (should not happen with whitelist)
      if (!metadata) return;
      
      agents.push({
        id: key,
        name: metadata.name,
        webhookUrl,
        icon: metadata.icon,
        description: metadata.description
      });
    }
  });
  
  return agents;
}

// Export the array of available agents
const availableAgents = getAgentsFromEnv();

module.exports = {
  availableAgents
}; 