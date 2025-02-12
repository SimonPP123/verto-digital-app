const Joi = require('joi');

const adCopySchema = Joi.object({
  inputs: Joi.object({
    campaign_name: Joi.string().required(),
    input_channels: Joi.string().required(),
    input_content_types: Joi.string().required(),
    landing_page_content: Joi.string().required(),
    content_material: Joi.string().allow(''),
    additional_information: Joi.string().allow(''),
    keywords: Joi.string().allow(''),
    internal_knowledge: Joi.string().allow(''),
    asset_link: Joi.string().uri().allow(''),
    landing_page_url: Joi.string().uri().required(),
    tone_and_language: Joi.string().allow(''),
    files: Joi.array().items(Joi.object({
      transfer_method: Joi.string().valid('local_file', 'remote_url').required(),
      upload_file_id: Joi.string().when('transfer_method', {
        is: 'local_file',
        then: Joi.required(),
      }),
      url: Joi.string().uri().when('transfer_method', {
        is: 'remote_url',
        then: Joi.required(),
      }),
      type: Joi.string().required(),
    })).optional(),
  }).required(),
  response_mode: Joi.string().valid('blocking', 'streaming').required(),
  user: Joi.string().required(),
});

module.exports = adCopySchema; 