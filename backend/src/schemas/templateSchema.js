const Joi = require('joi');

const templateSchema = Joi.object({
  name: Joi.string().required(),
  campaignName: Joi.string().required(),
  brandName: Joi.string().required(),
  landingPageContent: Joi.string().required(),
  landingPageUrl: Joi.string().uri().required(),
  additionalInfo: Joi.string().allow(''),
  keywords: Joi.string().allow(''),
  internalKnowledge: Joi.string().allow(''),
  assetLink: Joi.string().allow(''),
  toneAndLanguage: Joi.string().allow(''),
  contentMaterial: Joi.string().allow(''),
  user: Joi.alternatives().try(
    Joi.string(),
    Joi.object()
  ).required()
});

module.exports = templateSchema; 