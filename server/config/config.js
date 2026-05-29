require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || '8f3a9c2e7b4d1f6a0e5c8b3d9f2a7e4c1b6d0f5a8c3e9b2d7f4a1e6c0b5d8f3a',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // SQLite DB file path — stored right inside the project folder
  dbPath: process.env.DB_PATH || './database.sqlite',
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_USER || 'noreply@dataforge.edu'
  },
  club: {
    name: process.env.CLUB_NAME || 'DataForge',
    email: process.env.CLUB_EMAIL || 'club@dataforge.edu',
    phone: process.env.CLUB_PHONE || '+91 XXXXX XXXXX',
    website: process.env.CLUB_WEBSITE || 'http://localhost:4000'
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
    path: process.env.UPLOAD_PATH || './uploads'
  },
  payment: {
    defaultUpiId: process.env.DEFAULT_UPI_ID || 'dataforge@ybl',
    defaultNote: process.env.DEFAULT_PAYMENT_NOTE || 'Please mention your TEAM NAME in the payment notes/remittance field.'
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 3600000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100
  },
  clientUrl: process.env.FRONTEND_URL || 'http://localhost:4000'
};
