const Joi = require('joi');

const messageSchema = Joi.object({
  role: Joi.string().valid('user', 'assistant', 'system').required(),
  content: Joi.string().required(),
  timestamp: Joi.date()
});

const agentSchema = Joi.object({
  name: Joi.string().default('BigQuery Agent'),
  webhookUrl: Joi.string().allow(''),
  icon: Joi.string().default('database'),
  description: Joi.string().default('Default agent'),
  ga4AccountId: Joi.string().allow('', null)
});

const assistantConversationSchema = Joi.object({
  conversationId: Joi.string().allow(null),
  title: Joi.string().default('New Conversation'),
  messages: Joi.array().items(messageSchema),
  isArchived: Joi.boolean().default(false),
  agent: agentSchema
});

module.exports = assistantConversationSchema; 