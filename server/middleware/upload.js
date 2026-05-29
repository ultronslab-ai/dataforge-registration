const multer = require('multer');
const path = require('path');

const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let subfolder = 'others';
    if (file.fieldname === 'qr_code') subfolder = 'qr-codes';
    else if (file.fieldname === 'banner') subfolder = 'event-banners';
    else if (file.fieldname === 'payment_proof') subfolder = 'payment-proofs';
    else if (file.fieldname === 'captainFile') subfolder = 'resumes';

    const dir = path.join(__dirname, '..', 'uploads', subfolder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File filter (e.g. only images or pdfs)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Images and PDFs only!'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

module.exports = upload;
