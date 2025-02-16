const Joi = require('joi');

const adCopySchema = Joi.object({
  inputs: Joi.object({
    campaign_name: Joi.string().required(),
    input_channels: Joi.string().pattern(/^(Google|Linkedin|Email|Reddit|Twitter|Facebook)(,\s*(Google|Linkedin|Email|Reddit|Twitter|Facebook))*$/).required(),
    landing_page_content: Joi.string().required(),
    content_material: Joi.string().allow(''),
    additional_information: Joi.string().allow(''),
    keywords: Joi.string().allow(''),
    internal_knowledge: Joi.string().allow(''),
    asset_link: Joi.string().uri().allow(''),
    landing_page_url: Joi.string().uri().required(),
    tone_and_language: Joi.string().allow('')
  }).required(),
  response_mode: Joi.string().valid('blocking', 'streaming').required(),
  user: Joi.string().required(),
});

module.exports = adCopySchema; 