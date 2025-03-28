const Joi = require('joi');

const assistantTemplateSchema = Joi.object({
  title: Joi.string().required().trim().min(1).max(100),
  content: Joi.string().required().min(1),
  variables: Joi.array().items(
    Joi.object({
      name: Joi.string().required().pattern(/^[a-zA-Z0-9_]+$/),
      description: Joi.string().allow(''),
      defaultValue: Joi.string().allow('')
    })
  ),
  isPublic: Joi.boolean().default(false)
});

module.exports = assistantTemplateSchema; 