const Joi = require('joi');

const assistantTemplateSchema = Joi.object({
  title: Joi.string().required().trim().min(1).max(100),
  content: Joi.string().required().min(1),
  variables: Joi.array().items(
    Joi.object({
      _id: Joi.any(),
      name: Joi.string().required().pattern(/^[a-zA-Z0-9_]+$/),
      description: Joi.string().allow(''),
      defaultValue: Joi.string().allow(''),
      type: Joi.string().valid('text', 'multiChoice', 'date', 'dateRange').default('text'),
      options: Joi.array().items(Joi.string()).when('type', {
        is: 'multiChoice',
        then: Joi.array().items(Joi.string()),
        otherwise: Joi.array().items(Joi.string()).optional()
      })
    })
  ),
  isPublic: Joi.boolean().default(false)
});

module.exports = assistantTemplateSchema; 