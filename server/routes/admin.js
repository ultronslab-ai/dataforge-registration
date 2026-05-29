const express = require('express');
const router = express.Router();
const { getDashboard, getEventStats } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/events/:id/stats', getEventStats);

module.exports = router;
