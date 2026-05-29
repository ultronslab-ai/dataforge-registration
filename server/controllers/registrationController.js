const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const emailService = require('../utils/emailService');

/**
 * POST /api/registrations
 * Public endpoint — students submit their team registration here.
 * Handles both free events (no payment) and paid events (with proof upload).
 */
exports.registerForEvent = async (req, res, next) => {
  try {
    const { event_id, team_name, team_members, transaction_id, upi_reference } = req.body;

    // --- Validate event exists and is active ---
    const event = await Event.findByPk(event_id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.status !== 'Active') return res.status(400).json({ success: false, message: 'This event is not accepting registrations' });

    // --- Validate registration deadline ---
    if (new Date() > new Date(event.registration_deadline)) {
      return res.status(400).json({ success: false, message: 'Registration deadline has passed' });
    }

    // --- Parse team members (sent as JSON string from form) ---
    let members = [];
    try {
      members = typeof team_members === 'string' ? JSON.parse(team_members) : team_members;
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid team_members format' });
    }

    // --- Validate team size (1 leader + up to 3 members = max 4) ---
    if (!members || members.length < 1) {
      return res.status(400).json({ success: false, message: 'At least 1 team member (leader) is required' });
    }
    if (members.length > event.team_size) {
      return res.status(400).json({ success: false, message: `Maximum ${event.team_size} members allowed per team` });
    }

    // --- Check for duplicate team name for this event ---
    const existing = await Registration.findOne({ where: { event_id, team_name } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A team with this name is already registered for this event' });
    }

    // --- Check max teams cap ---
    if (event.max_teams) {
      const count = await Registration.count({ where: { event_id } });
      if (count >= event.max_teams) {
        return res.status(400).json({ success: false, message: 'Event has reached maximum team capacity' });
      }
    }

    // --- File uploads (payment proof for paid events, resume/ID for all teams) ---
    let payment_proof_path = null;
    let captain_file_path = null;

    if (req.files) {
      if (req.files.payment_proof && req.files.payment_proof[0]) {
        payment_proof_path = '/uploads/payment-proofs/' + req.files.payment_proof[0].filename;
      }
      if (req.files.captainFile && req.files.captainFile[0]) {
        captain_file_path = '/uploads/resumes/' + req.files.captainFile[0].filename;
      }
    }

    // --- For paid events, payment proof and transaction ID are required ---
    if (event.is_paid) {
      if (!payment_proof_path) {
        return res.status(400).json({ success: false, message: 'Payment proof screenshot is required for paid events' });
      }
      if (!transaction_id) {
        return res.status(400).json({ success: false, message: 'Transaction ID is required for paid events' });
      }
    }

    // --- Determine payment and verification status ---
    const payment_status = event.is_paid ? 'pending' : 'n/a';
    const verification_status = event.is_paid ? 'pending' : 'verified';

    // --- Generate unique registration ID ---
    const registration_id = 'REG-' + uuidv4().substring(0, 6).toUpperCase();

    // --- Create registration ---
    const registration = await Registration.create({
      registration_id,
      event_id,
      team_name,
      team_members: members,
      payment_status,
      verification_status,
      transaction_id: transaction_id || null,
      upi_reference: upi_reference || null,
      payment_proof_path,
      captain_file_path
    });

    // --- Send welcome email to team leader (non-blocking) ---
    const leader = members.find(m => m.is_leader) || members[0];
    if (leader && leader.email) {
      emailService.sendWelcomeEmail(leader.email, team_name, event.name, registration_id)
        .catch(err => console.error('Welcome email failed:', err.message));
    }

    res.status(201).json({
      success: true,
      message: event.is_paid ? 'Registration submitted. Pending payment verification.' : 'Registration confirmed!',
      data: {
        registration_id: registration.registration_id,
        team_name: registration.team_name,
        event_id: event.id,
        event_name: event.name,
        event_date: event.date_time,
        event_venue: event.venue,
        event_description: event.description,
        is_paid: event.is_paid,
        verification_status: registration.verification_status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/registrations/event/:eventId
 * Admin — get all registrations for a specific event with optional filters.
 */
exports.getEventRegistrations = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { payment_status, search, page = 1, limit = 50 } = req.query;

    const where = { event_id: eventId };
    if (payment_status && payment_status !== 'all') {
      where.payment_status = payment_status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Registration.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Filter by search term in JS (SQLite LIKE on JSON is unreliable)
    let results = rows;
    if (search) {
      const q = search.toLowerCase();
      results = rows.filter(r =>
        r.team_name.toLowerCase().includes(q) ||
        r.team_members.some(m => m.full_name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q))
      );
    }

    res.status(200).json({ success: true, total: count, page: parseInt(page), data: results });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/registrations/:id
 * Admin — get full details of a single registration.
 */
exports.getRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findByPk(req.params.id);
    if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

    const event = await Event.findByPk(registration.event_id);
    res.status(200).json({ success: true, data: { ...registration.toJSON(), event } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/registrations/:id/verify
 * Admin — verify a pending registration.
 * Automatically sends confirmation email to all team members.
 */
exports.verifyRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findByPk(req.params.id);
    if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

    const event = await Event.findByPk(registration.event_id);

    await registration.update({
      verification_status: 'verified',
      payment_status: event.is_paid ? 'verified' : 'n/a',
      rejection_reason: null
    });

    // Send verification email to team leader (CC others)
    const members = registration.team_members;
    const leader = members.find(m => m.is_leader) || members[0];
    const ccEmails = members.filter(m => !m.is_leader && m.email).map(m => m.email);

    if (leader?.email) {
      emailService.sendVerificationEmail(
        leader.email,
        ccEmails,
        registration.team_name,
        event
      ).catch(err => console.error('Verification email failed:', err.message));
    }

    res.status(200).json({ success: true, message: 'Registration verified. Confirmation email sent.', data: registration });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/registrations/:id/reject
 * Admin — reject a registration with a mandatory reason.
 */
exports.rejectRegistration = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required' });
    }

    const registration = await Registration.findByPk(req.params.id);
    if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

    const event = await Event.findByPk(registration.event_id);

    await registration.update({
      verification_status: 'rejected',
      payment_status: event.is_paid ? 'rejected' : 'n/a',
      rejection_reason: reason.trim()
    });

    // Optionally send rejection email
    const leader = registration.team_members.find(m => m.is_leader) || registration.team_members[0];
    if (leader?.email) {
      emailService.sendRejectionEmail(leader.email, registration.team_name, event.name, reason)
        .catch(err => console.error('Rejection email failed:', err.message));
    }

    res.status(200).json({ success: true, message: 'Registration rejected.', data: registration });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/registrations/bulk-verify
 * Admin — verify multiple registrations at once.
 * Body: { ids: [1, 2, 3] }
 */
exports.bulkVerify = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of registration IDs' });
    }

    await Registration.update(
      { verification_status: 'verified', payment_status: 'verified' },
      { where: { id: ids, verification_status: 'pending' } }
    );

    res.status(200).json({ success: true, message: `${ids.length} registrations verified.` });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/registrations/event/:eventId/export
 * Admin — export all registrations for an event as CSV.
 */
exports.exportCSV = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const registrations = await Registration.findAll({ where: { event_id: eventId }, order: [['createdAt', 'DESC']] });
    const event = await Event.findByPk(eventId);

    const rows = [];
    registrations.forEach(reg => {
      const members = reg.team_members;
      const exportMembers = members.length ? members : [{}];
      exportMembers.forEach((member, index) => {
        rows.push({
          'Event ID': event?.id || reg.event_id,
          'Event Name': event?.name || '',
          'Registration ID': reg.registration_id,
          'Team Name': reg.team_name,
          'Member Role': member?.is_leader ? 'Captain' : `Member ${index}`,
          'Member Name': member?.full_name || '',
          'Member Email': member?.email || '',
          'Member Phone': member?.phone || '',
          'Member Registration Number': member?.student_id || '',
          'Member College Name and Dept': member?.department || '',
          'Member Year': member?.year || '',
          'Total Members': members.length,
          'Payment Status': reg.payment_status,
          'Verification Status': reg.verification_status,
          'Transaction ID': reg.transaction_id || '',
          'UPI Reference': reg.upi_reference || '',
          'Payment Proof File': reg.payment_proof_path || '',
          'Student ID / Resume File': reg.captain_file_path || '',
          'Rejection Reason': reg.rejection_reason || '',
          'Registered At': reg.createdAt
        });
      });
    });

    const headers = [
      'Event ID',
      'Event Name',
      'Registration ID',
      'Team Name',
      'Member Role',
      'Member Name',
      'Member Email',
      'Member Phone',
      'Member Registration Number',
      'Member College Name and Dept',
      'Member Year',
      'Total Members',
      'Payment Status',
      'Verification Status',
      'Transaction ID',
      'UPI Reference',
      'Payment Proof File',
      'Student ID / Resume File',
      'Rejection Reason',
      'Registered At'
    ];
    const filename = `${event?.name || 'event'}-registered-users-data.csv`
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    const csv = [
      headers.map(header => `"${header}"`).join(','),
      ...rows.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'event-registrations.csv'}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
