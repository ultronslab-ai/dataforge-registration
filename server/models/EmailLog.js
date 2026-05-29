const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * EmailLog model.
 * Audit trail for every email sent by the system.
 * Useful for debugging failed emails and tracking communication history.
 */
const EmailLog = sequelize.define('EmailLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  registration_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  email_type: {
    type: DataTypes.ENUM('verification', 'rejection', 'welcome'),
    allowNull: false
  },
  recipient_email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('sent', 'failed'),
    defaultValue: 'sent'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'email_logs',
  timestamps: true,
});

module.exports = EmailLog;
