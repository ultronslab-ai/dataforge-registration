const { Op } = require('sequelize');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const path = require('path');
const fs = require('fs');

/**
 * GET /api/events
 * Returns all Active events (public-facing). Students see this list.
 */
exports.getEvents = async (req, res, next) => {
  try {
    const events = await Event.findAll({
      where: { status: 'Active' },
      order: [['date_time', 'ASC']]
    });
    res.status(200).json({ success: true, count: events.length, data: events });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/all
 * Returns ALL events including Inactive ones (admin use only).
 */
exports.getAllEvents = async (req, res, next) => {
  try {
    const events = await Event.findAll({ order: [['createdAt', 'DESC']] });
    const data = await Promise.all(events.map(async (event) => {
      const regCount = await Registration.count({ where: { event_id: event.id } });
      return {
        ...event.toJSON(),
        registrations_count: regCount
      };
    }));
    res.status(200).json({ success: true, count: events.length, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:id
 * Returns a single event by ID.
 */
exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events
 * Create a new event. Admin only.
 * Handles optional banner image upload (multipart/form-data).
 */
exports.createEvent = async (req, res, next) => {
  try {
    const {
      name, description, date_time, venue, category,
      max_teams, team_size, registration_deadline,
      is_paid, fees, upi_id, payment_note, status
    } = req.body;

    // Handle file uploads
    let qr_code_path = null;
    let banner_image = null;
    if (req.files) {
      if (req.files.qr_code) qr_code_path = '/uploads/qr-codes/' + req.files.qr_code[0].filename;
      if (req.files.banner) banner_image = '/uploads/event-banners/' + req.files.banner[0].filename;
    }

    const event = await Event.create({
      name, description, date_time, venue,
      category: category || 'Technical',
      max_teams: max_teams || null,
      team_size: team_size || 4,
      registration_deadline,
      is_paid: is_paid === 'true' || is_paid === true,
      fees: is_paid ? parseFloat(fees) || 0 : 0,
      upi_id: is_paid ? upi_id : null,
      qr_code_path,
      payment_note: payment_note || 'Please mention your TEAM NAME in the payment notes/remittance field.',
      banner_image,
      status: status || 'Active',
      created_by: req.user.id
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/events/:id
 * Update an existing event. Admin only.
 */
exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const updateData = { ...req.body };

    // Handle file uploads if new files provided
    if (req.files) {
      if (req.files.qr_code) updateData.qr_code_path = '/uploads/qr-codes/' + req.files.qr_code[0].filename;
      if (req.files.banner) updateData.banner_image = '/uploads/event-banners/' + req.files.banner[0].filename;
    }

    // Coerce is_paid to boolean
    if ('is_paid' in updateData) {
      updateData.is_paid = updateData.is_paid === 'true' || updateData.is_paid === true;
    }

    await event.update(updateData);
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/events/:id
 * Soft delete: marks event as Inactive.
 * Pass ?hard=true for permanent deletion (also removes uploads).
 */
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (req.query.hard === 'true') {
      // Hard delete: remove files and DB row
      if (event.qr_code_path) {
        const fullPath = path.join(__dirname, '../../', event.qr_code_path);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      }
      await event.destroy();
      return res.status(200).json({ success: true, message: 'Event permanently deleted' });
    }

    // Soft delete
    await event.update({ status: 'Inactive' });
    res.status(200).json({ success: true, message: 'Event deactivated' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events/:id/duplicate
 * Duplicate an event with a new name suffix. Admin only.
 */
exports.duplicateEvent = async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const duplicate = await Event.create({
      ...event.dataValues,
      id: undefined,
      name: `${event.name} (Copy)`,
      status: 'Inactive',  // start as draft
      createdAt: undefined,
      updatedAt: undefined
    });

    res.status(201).json({ success: true, data: duplicate });
  } catch (error) {
    next(error);
  }
};
