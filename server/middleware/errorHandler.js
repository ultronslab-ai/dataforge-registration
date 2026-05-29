/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Sequelize unique constraint error (e.g. duplicate username/email)
  if (err.name === 'SequelizeUniqueConstraintError') {
    message = err.errors.map(e => `${e.path} must be unique`).join(', ');
    statusCode = 400;
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    message = err.errors.map(e => e.message).join(', ');
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    message: message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = errorHandler;
