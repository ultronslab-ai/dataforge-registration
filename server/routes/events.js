const express = require('express');
const router = express.Router();
const { getEvents, getEvent, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/')
  .get(getEvents)
  .post(
    protect,
    authorize('admin'),
    upload.fields([
      { name: 'qr_code', maxCount: 1 },
      { name: 'banner', maxCount: 1 }
    ]),
    createEvent
  );

router.route('/:id')
  .get(getEvent)
  .put(
    protect,
    authorize('admin'),
    upload.fields([
      { name: 'qr_code', maxCount: 1 },
      { name: 'banner', maxCount: 1 }
    ]),
    updateEvent
  )
  .delete(protect, authorize('admin'), deleteEvent);

module.exports = router;
