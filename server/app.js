const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Load env vars via config (which internally calls dotenv)
const config = require('./config/config');

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Security headers
app.use(helmet());

// Enable CORS
app.use(cors({ origin: config.clientUrl }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api', apiLimiter);

// Make uploads folder static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/admin', require('./routes/admin'));

// Basic route
app.get('/', (req, res) => {
  res.send('DataForge API is running...');
});

// Custom error handler
app.use(errorHandler);

const PORT = config.port || 5000;

app.listen(PORT, () => {
  console.log(\`Server running in \${process.env.NODE_ENV || 'development'} mode on port \${PORT}\`);
});
