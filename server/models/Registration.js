const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Registration model.
 * One row per team registration. Team members are stored as a JSON array
 * in the `team_members` column — avoids a separate join table for simplicity.
 *
 * payment_status values:
 *   'n/a'      — free event, no payment needed
 *   'pending'  — paid event, proof uploaded, awaiting admin review
 *   'verified' — admin has approved the payment
 *   'rejected' — admin has rejected (reason stored in rejection_reason)
 *
 * verification_status mirrors payment_status for paid events;
 * for free events it is set to 'verified' immediately on submission.
 */
const Registration = sequelize.define('Registration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  registration_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true  // e.g. "REG-A1B2C3"
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  team_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  /**
   * JSON array of team members. Each member object:
   * { full_name, student_id, email, phone, department, year,
   *   alternate_email (optional), is_leader (boolean) }
   */
  team_members: {
    type: DataTypes.TEXT,  // stored as JSON string
    allowNull: false,
    get() {
      const raw = this.getDataValue('team_members');
      return raw ? JSON.parse(raw) : [];
    },
    set(val) {
      this.setDataValue('team_members', JSON.stringify(val));
    }
  },
  // --- PAYMENT ---
  payment_status: {
    type: DataTypes.ENUM('n/a', 'pending', 'verified', 'rejected'),
    defaultValue: 'n/a'
  },
  transaction_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  upi_reference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payment_proof_path: {
    type: DataTypes.STRING,
    allowNull: true  // path to uploaded payment screenshot/PDF
  },
  captain_file_path: {
    type: DataTypes.STRING,
    allowNull: true  // path to uploaded resume/ID PDF
  },
  // --- VERIFICATION ---
  verification_status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    defaultValue: 'pending'
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'registrations',
  timestamps: true,
});

module.exports = Registration;
