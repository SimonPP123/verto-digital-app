const Joi = require('joi');

const messageSchema = Joi.object({
  role: Joi.string().valid('user', 'assistant', 'system').required(),
  content: Joi.string().required(),
  timestamp: Joi.date()
});

const assistantConversationSchema = Joi.object({
  conversationId: Joi.string().allow(null),
  title: Joi.string().default('New Conversation'),
  messages: Joi.array().items(messageSchema),
  isArchived: Joi.boolean().default(false)
});

module.exports = assistantConversationSchema; 