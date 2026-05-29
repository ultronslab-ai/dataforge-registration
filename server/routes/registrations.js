const express = require('express');
const router = express.Router();
const {
  registerForEvent,
  getEventRegistrations,
  getRegistration,
  verifyRegistration,
  rejectRegistration,
  bulkVerify,
  exportCSV
} = require('../controllers/registrationController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const protectDownload = (req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
};

// Public route to submit registration
router.post(
  '/',
  upload.fields([
    { name: 'captainFile', maxCount: 1 },
    { name: 'payment_proof', maxCount: 1 }
  ]),
  registerForEvent
);

router.get('/event/:eventId/export', protectDownload, protect, authorize('admin'), exportCSV);

// Admin-only protected routes
router.use(protect);
router.use(authorize('admin'));

router.get('/event/:eventId', getEventRegistrations);
router.post('/bulk-verify', bulkVerify);

router.route('/:id')
  .get(getRegistration);

router.put('/:id/verify', verifyRegistration);
router.put('/:id/reject', rejectRegistration);

module.exports = router;
