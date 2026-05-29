const { Sequelize } = require('sequelize');
const config = require('./config');
const path = require('path');

/**
 * SQLite database connection via Sequelize ORM.
 * The database is stored as a single file (database.sqlite) in the project root.
 * No external database server or account is needed.
 */
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.resolve(config.dbPath),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

/**
 * Test the connection and sync all models to the database.
 * `alter: true` safely updates table structures if models change,
 * without destroying existing data.
 */
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite database connected successfully.');
    // Sync all registered models — creates tables if they don't exist
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synced.');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
