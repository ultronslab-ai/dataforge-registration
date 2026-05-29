const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');

/**
 * GET /api/admin/dashboard
 * Returns quick stats for the admin dashboard overview panel.
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const [totalEvents, totalRegistrations, pendingVerifications, verifiedRegistrations, verifiedRegsList] = await Promise.all([
      Event.count(),
      Registration.count(),
      Registration.count({ where: { verification_status: 'pending' } }),
      Registration.count({ where: { verification_status: 'verified' } }),
      Registration.findAll({ where: { verification_status: 'verified' } })
    ]);

    let totalRevenue = 0;
    for (const reg of verifiedRegsList) {
      const ev = await Event.findByPk(reg.event_id);
      if (ev && ev.is_paid) {
        totalRevenue += (ev.fees || 0);
      }
    }

    // Recent registrations (last 10)
    const recentRegistrations = await Registration.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Upcoming events (next 5)
    const upcomingEvents = await Event.findAll({
      where: { status: 'Active' },
      order: [['date_time', 'ASC']],
      limit: 5
    });

    // Registration counts per event for chart
    const events = await Event.findAll({ order: [['createdAt', 'DESC']], limit: 10 });
    const eventStats = await Promise.all(events.map(async (ev) => ({
      event: ev.name,
      registrations: await Registration.count({ where: { event_id: ev.id } }),
      verified: await Registration.count({ where: { event_id: ev.id, verification_status: 'verified' } }),
      pending: await Registration.count({ where: { event_id: ev.id, verification_status: 'pending' } })
    })));

    res.status(200).json({
      success: true,
      data: {
        stats: { totalEvents, totalRegistrations, pendingVerifications, verifiedRegistrations, totalRevenue },
        recentRegistrations,
        upcomingEvents,
        eventStats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/events/:id/stats
 * Per-event statistics for the event detail page header.
 */
exports.getEventStats = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findByPk(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const [total, verified, pending, rejected] = await Promise.all([
      Registration.count({ where: { event_id: eventId } }),
      Registration.count({ where: { event_id: eventId, verification_status: 'verified' } }),
      Registration.count({ where: { event_id: eventId, verification_status: 'pending' } }),
      Registration.count({ where: { event_id: eventId, verification_status: 'rejected' } })
    ]);

    res.status(200).json({
      success: true,
      data: { event, stats: { total, verified, pending, rejected } }
    });
  } catch (error) {
    next(error);
  }
};
