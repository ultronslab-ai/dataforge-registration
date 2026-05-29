const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Event model.
 * Stores all club events. Supports both FREE and PAID events.
 * For paid events: qr_code_path, upi_id, fees, and payment_note are required.
 */
const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  date_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  venue: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other'),
    defaultValue: 'Technical'
  },
  max_teams: {
    type: DataTypes.INTEGER,
    allowNull: true   // null = unlimited
  },
  team_size: {
    type: DataTypes.INTEGER,
    defaultValue: 4   // max members per team
  },
  registration_deadline: {
    type: DataTypes.DATE,
    allowNull: false
  },
  // --- PAID / FREE ---
  is_paid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  fees: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  upi_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  qr_code_path: {
    type: DataTypes.STRING,
    allowNull: true   // path to uploaded QR image file
  },
  payment_note: {
    type: DataTypes.TEXT,
    defaultValue: 'Please mention your TEAM NAME in the payment notes/remittance field.'
  },
  // --- BANNER ---
  banner_image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // --- STATUS ---
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active'
  },
  created_by: {
    type: DataTypes.INTEGER,  // FK to User
    allowNull: true
  }
}, {
  tableName: 'events',
  timestamps: true,
});

module.exports = Event;
