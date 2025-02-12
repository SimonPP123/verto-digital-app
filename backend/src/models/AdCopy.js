const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const User = require('./User');

const AdCopy = sequelize.define('AdCopy', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  campaign_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  input_channels: {
    type: DataTypes.STRING,
    allowNull: false
  },
  input_content_types: {
    type: DataTypes.STRING,
    allowNull: false
  },
  variations: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  landing_page_content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  content_material: {
    type: DataTypes.TEXT
  },
  additional_information: {
    type: DataTypes.TEXT
  },
  keywords: {
    type: DataTypes.STRING
  },
  internal_knowledge: {
    type: DataTypes.TEXT
  },
  asset_link: {
    type: DataTypes.STRING
  },
  landing_page_url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tone_and_language: {
    type: DataTypes.STRING
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['campaign_name']
    }
  ]
});

// Set up associations
AdCopy.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(AdCopy, { foreignKey: 'user_id' });

module.exports = AdCopy; 