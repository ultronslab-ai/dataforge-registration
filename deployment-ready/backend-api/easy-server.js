const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const net = require('net');
const tls = require('tls');

const PORT = Number(process.env.PORT || 4000);
const ROOT = __dirname;
const CLIENT_DIR = path.join(ROOT, 'client');
const DATA_FILE = path.join(ROOT, 'easy-data.json');
const MAIL_LOG_FILE = path.join(ROOT, 'easy-mail-log.json');
const TOKEN = 'easy-admin-token';

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf'
};

function addDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return {};
  return fs.readFileSync(envPath, 'utf8').split(/\r?\n/).reduce((env, line) => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    return env;
  }, {});
}

const ENV = { ...loadEnv(), ...process.env };

function seedData() {
  return {
    nextEventId: 3,
    nextRegistrationId: 3,
    admin: {
      username: 'admin',
      password: 'cyberadmin2042',
      email: 'admin@dataforge.edu'
    },
    events: [
      {
        id: 1,
        name: 'HackForge 2026',
        description: '<p>Join us for the ultimate 24-hour hackathon. Build, learn, and compete with your team.</p>',
        date_time: addDays(7),
        venue: 'Main Campus Auditorium',
        max_teams: 50,
        team_size: 4,
        fees: 0,
        is_paid: false,
        registration_deadline: addDays(5),
        category: 'Technical',
        status: 'Active',
        upi_id: '',
        payment_note: ''
      },
      {
        id: 2,
        name: 'Data Science Bootcamp',
        description: '<p>A practical 2-day bootcamp covering Python, Pandas, ML basics, and visualization.</p>',
        date_time: addDays(14),
        venue: 'Lab Complex 3',
        max_teams: 30,
        team_size: 4,
        fees: 200,
        is_paid: true,
        registration_deadline: addDays(12),
        category: 'Workshop',
        status: 'Active',
        upi_id: 'dataforge@ybl',
        payment_note: 'Please mention your TEAM NAME in the payment notes.'
      }
    ],
    registrations: [
      {
        id: 1,
        event_id: 1,
        team_name: 'Code Ninjas',
        team_members: [
          { full_name: 'Alice Smith', email: 'alice@test.com', phone: '1234567890', department: 'CS', year: '3', is_leader: true }
        ],
        payment_status: 'n/a',
        verification_status: 'verified',
        registration_id: 'REG-123456',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        event_id: 2,
        team_name: 'Data Miners',
        team_members: [
          { full_name: 'Charlie Brown', email: 'charlie@test.com', phone: '1112223333', department: 'DS', year: '4', is_leader: true }
        ],
        payment_status: 'pending',
        verification_status: 'pending',
        transaction_id: 'TXN987654321',
        registration_id: 'REG-789012',
        created_at: new Date().toISOString()
      }
    ]
  };
}

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const data = seedData();
    saveData(data);
    return data;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(body));
}

function sendText(res, status, text, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(text);
}

function isAuthed(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  return req.headers.authorization === `Bearer ${TOKEN}` || url.searchParams.get('token') === TOKEN;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) return {};
  const boundary = `--${boundaryMatch[1]}`;
  const body = buffer.toString('latin1');
  const fields = {};

  for (const part of body.split(boundary)) {
    const valueStart = part.indexOf('\r\n\r\n');
    if (valueStart === -1) continue;

    const headers = part.slice(0, valueStart);
    const nameMatch = headers.match(/name="([^"]+)"/);
    if (!nameMatch) continue;

    const name = nameMatch[1];
    const filenameMatch = headers.match(/filename="([^"]*)"/);
    const rawValue = part.slice(valueStart + 4).replace(/\r\n--$/, '').replace(/\r\n$/, '');

    if (!filenameMatch) {
      fields[name] = rawValue;
      continue;
    }

    const originalName = filenameMatch[1];
    if (!originalName || !rawValue.length) continue;

    const ext = path.extname(originalName).toLowerCase();
    const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf']);
    if (!allowedExts.has(ext)) continue;

    const subfolder = name === 'payment_proof' ? 'payment-proofs' : name === 'captainFile' ? 'resumes' : 'others';
    const uploadDir = path.join(ROOT, 'uploads', subfolder);
    fs.mkdirSync(uploadDir, { recursive: true });

    const savedName = `${name}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(uploadDir, savedName), Buffer.from(rawValue, 'latin1'));
    fields[name] = `/uploads/${subfolder}/${savedName}`;
  }
  return fields;
}

async function readFields(req) {
  const buffer = await readBody(req);
  const type = req.headers['content-type'] || '';
  if (type.includes('application/json')) {
    return buffer.length ? JSON.parse(buffer.toString('utf8')) : {};
  }
  if (type.includes('multipart/form-data')) {
    return parseMultipart(buffer, type);
  }
  return Object.fromEntries(new URLSearchParams(buffer.toString('utf8')));
}

function publicEvents(data) {
  return data.events.filter(event => event.status === 'Active');
}

function eventWithCounts(data, event) {
  const count = data.registrations.filter(reg => Number(reg.event_id) === Number(event.id)).length;
  return { ...event, registrations_count: count };
}

function dashboardData(data) {
  const pending = data.registrations.filter(reg => reg.verification_status === 'pending').length;
  const verifiedPaid = data.registrations.filter(reg => {
    const event = data.events.find(item => Number(item.id) === Number(reg.event_id));
    return reg.verification_status === 'verified' && event && event.is_paid;
  });
  const totalRevenue = verifiedPaid.reduce((sum, reg) => {
    const event = data.events.find(item => Number(item.id) === Number(reg.event_id));
    return sum + Number(event ? event.fees : 0);
  }, 0);

  return {
    stats: {
      totalEvents: data.events.length,
      totalRegistrations: data.registrations.length,
      pendingVerifications: pending,
      totalRevenue
    },
    recentRegistrations: data.registrations.slice(-5).reverse(),
    upcomingEvents: data.events.slice().sort((a, b) => new Date(a.date_time) - new Date(b.date_time)).slice(0, 5),
    eventStats: data.events.map(event => {
      const regs = data.registrations.filter(reg => Number(reg.event_id) === Number(event.id));
      return {
        event: event.name,
        verified: regs.filter(reg => reg.verification_status === 'verified').length,
        pending: regs.filter(reg => reg.verification_status === 'pending').length
      };
    })
  };
}

function csvForRegistrations(rows, event) {
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
    'Registered At'
  ];

  const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.flatMap(reg => {
    const members = reg.team_members.length ? reg.team_members : [{}];
    return members.map((member, index) => [
      event?.id || reg.event_id,
      event?.name || '',
      reg.registration_id,
      reg.team_name,
      member.is_leader ? 'Captain' : `Member ${index}`,
      member.full_name,
      member.email,
      member.phone,
      member.student_id,
      member.department,
      member.year,
      reg.team_members.length,
      reg.payment_status,
      reg.verification_status,
      reg.transaction_id,
      reg.upi_reference,
      reg.payment_proof_path,
      reg.captain_file_path,
      reg.created_at
    ].map(escapeCsv).join(','));
  });

  return [headers.map(escapeCsv).join(','), ...lines].join('\n');
}

function formatEventDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  }).format(new Date(value));
}

function mailConfigReady() {
  return ENV.SMTP_HOST &&
    ENV.SMTP_USER &&
    ENV.SMTP_PASS &&
    ENV.SMTP_USER !== 'your_email@gmail.com' &&
    ENV.SMTP_PASS !== 'your_gmail_app_password';
}

function appendMailLog(entry) {
  const log = fs.existsSync(MAIL_LOG_FILE) ? JSON.parse(fs.readFileSync(MAIL_LOG_FILE, 'utf8')) : [];
  log.push({ ...entry, created_at: new Date().toISOString() });
  fs.writeFileSync(MAIL_LOG_FILE, JSON.stringify(log, null, 2));
}

function smtpRead(socket) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const onData = chunk => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1] || '';
      if (/^\d{3} /.test(last)) {
        socket.off('data', onData);
        resolve(buffer);
      }
    };
    socket.on('data', onData);
    socket.once('error', reject);
  });
}

async function smtpCommand(socket, command, expected) {
  if (command) socket.write(`${command}\r\n`);
  const response = await smtpRead(socket);
  if (expected && !expected.some(code => response.startsWith(code))) {
    throw new Error(`SMTP command failed: ${response.trim()}`);
  }
  return response;
}

function connectSmtp(host, port, secure) {
  return new Promise((resolve, reject) => {
    const socket = secure ? tls.connect(port, host, { servername: host }) : net.connect(port, host);
    socket.once('connect', () => resolve(socket));
    socket.once('secureConnect', () => resolve(socket));
    socket.once('error', reject);
  });
}

function upgradeToTls(socket, host) {
  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect({ socket, servername: host }, () => resolve(secureSocket));
    secureSocket.once('error', reject);
  });
}

async function sendSmtpMail({ to, subject, text }) {
  const host = ENV.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(ENV.SMTP_PORT || 587);
  const secure = ENV.SMTP_SECURE === 'true' || port === 465;
  const from = ENV.SMTP_USER;
  let socket = await connectSmtp(host, port, secure);

  try {
    await smtpCommand(socket, null, ['220']);
    await smtpCommand(socket, `EHLO ${host}`, ['250']);
    if (!secure) {
      await smtpCommand(socket, 'STARTTLS', ['220']);
      socket = await upgradeToTls(socket, host);
      await smtpCommand(socket, `EHLO ${host}`, ['250']);
    }
    await smtpCommand(socket, 'AUTH LOGIN', ['334']);
    await smtpCommand(socket, Buffer.from(from).toString('base64'), ['334']);
    await smtpCommand(socket, Buffer.from(ENV.SMTP_PASS).toString('base64'), ['235']);
    await smtpCommand(socket, `MAIL FROM:<${from}>`, ['250']);
    await smtpCommand(socket, `RCPT TO:<${to}>`, ['250', '251']);
    await smtpCommand(socket, 'DATA', ['354']);
    socket.write([
      `From: ${ENV.CLUB_NAME || 'DataForge'} <${from}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      text,
      '.'
    ].join('\r\n') + '\r\n');
    await smtpRead(socket);
    await smtpCommand(socket, 'QUIT', ['221']);
  } finally {
    socket.end();
  }
}

function buildVerificationEmail(event, registration, member) {
  const teamList = registration.team_members
    .map((item, index) => {
      const regNo = item.student_id ? ` | Registration No: ${item.student_id}` : '';
      return `${index + 1}. ${item.full_name}${item.is_leader ? ' (Team Leader)' : ''} - ${item.email}${regNo}`;
    })
    .join('\n');

  return {
    subject: `Registration approved: ${event.name}`,
    text: [
      `Hello ${member.full_name || 'Participant'},`,
      '',
      `Your team registration has been approved.`,
      '',
      `Team: ${registration.team_name}`,
      `Registration ID: ${registration.registration_id}`,
      `Status: APPROVED / VERIFIED`,
      '',
      `Event: ${event.name}`,
      `Date and Time: ${formatEventDate(event.date_time)}`,
      `Venue: ${event.venue || 'To be announced'}`,
      '',
      'Registered team members:',
      teamList,
      '',
      `Please keep your registration ID ready at the event venue.`,
      '',
      `Regards,`,
      `${ENV.CLUB_NAME || 'DataForge'} Team`
    ].join('\n')
  };
}

function buildCancellationEmail(event, registration, member) {
  const teamList = registration.team_members
    .map((item, index) => {
      const regNo = item.student_id ? ` | Registration No: ${item.student_id}` : '';
      return `${index + 1}. ${item.full_name}${item.is_leader ? ' (Team Leader)' : ''} - ${item.email}${regNo}`;
    })
    .join('\n');

  return {
    subject: `Registration cancelled: ${event.name}`,
    text: [
      `Hello ${member.full_name || 'Participant'},`,
      '',
      `Your team registration has been removed by the admin.`,
      '',
      `Team: ${registration.team_name}`,
      `Registration ID: ${registration.registration_id}`,
      `Status: CANCELLED / REMOVED`,
      '',
      `Event: ${event.name}`,
      `Date and Time: ${formatEventDate(event.date_time)}`,
      `Venue: ${event.venue || 'To be announced'}`,
      '',
      'Registered team members affected:',
      teamList,
      '',
      `If you think this was a mistake, please contact the event admin.`,
      '',
      `Regards,`,
      `${ENV.CLUB_NAME || 'DataForge'} Team`
    ].join('\n')
  };
}

async function notifyTeam(event, registration, buildMessage, action) {
  const recipients = registration.team_members
    .map(member => ({ ...member, email: String(member.email || '').trim() }))
    .filter(member => member.email);

  const results = [];
  for (const member of recipients) {
    const message = buildMessage(event, registration, member);
    const entry = {
      to: member.email,
      subject: message.subject,
      text: message.text,
      action,
      registration_id: registration.registration_id,
      event_id: event.id
    };

    if (!mailConfigReady()) {
      console.warn(`[mail:${action}] SMTP is not configured; saving email for ${member.email} to ${path.basename(MAIL_LOG_FILE)}.`);
      appendMailLog({ ...entry, status: 'logged', reason: 'SMTP credentials are not configured in .env' });
      results.push({ to: member.email, status: 'logged' });
      continue;
    }

    try {
      console.log(`[mail:${action}] Sending email to ${member.email}...`);
      await sendSmtpMail({ to: member.email, ...message });
      appendMailLog({ ...entry, status: 'sent' });
      console.log(`[mail:${action}] Email sent to ${member.email}.`);
      results.push({ to: member.email, status: 'sent' });
    } catch (error) {
      appendMailLog({ ...entry, status: 'failed', error: error.message });
      console.error(`[mail:${action}] Failed to send email to ${member.email}: ${error.message}`);
      results.push({ to: member.email, status: 'failed', error: error.message });
    }
  }
  return results;
}

async function notifyVerification(event, registration) {
  return notifyTeam(event, registration, buildVerificationEmail, 'verification');
}

async function notifyCancellation(event, registration) {
  return notifyTeam(event, registration, buildCancellationEmail, 'cancellation');
}

async function handleApi(req, res, url, data) {
  if (req.method === 'OPTIONS') return sendJson(res, 200, {});

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    const fields = await readFields(req);
    if (fields.username === data.admin.username && fields.password === data.admin.password) {
      return sendJson(res, 200, {
        success: true,
        token: TOKEN,
        user: { id: 1, username: data.admin.username, email: data.admin.email }
      });
    }
    return sendJson(res, 401, { success: false, message: 'Invalid credentials' });
  }

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    if (!isAuthed(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
    return sendJson(res, 200, { success: true, data: { id: 1, username: data.admin.username, email: data.admin.email } });
  }

  if (url.pathname === '/api/events' && req.method === 'GET') {
    return sendJson(res, 200, { success: true, data: publicEvents(data).map(event => eventWithCounts(data, event)) });
  }

  if (url.pathname === '/api/events/all' && req.method === 'GET') {
    if (!isAuthed(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
    return sendJson(res, 200, { success: true, data: data.events.map(event => eventWithCounts(data, event)) });
  }

  if (url.pathname === '/api/events' && req.method === 'POST') {
    if (!isAuthed(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
    const fields = await readFields(req);
    const event = {
      id: data.nextEventId++,
      name: fields.name || 'Untitled Event',
      description: fields.description || '',
      date_time: fields.date_time || new Date().toISOString(),
      venue: fields.venue || '',
      max_teams: Number(fields.max_teams || 0),
      team_size: Number(fields.team_size || 1),
      fees: Number(fields.fees || 0),
      is_paid: fields.is_paid === 'true' || fields.is_paid === true,
      registration_deadline: fields.registration_deadline || new Date().toISOString(),
      category: fields.category || 'Other',
      status: 'Active',
      upi_id: fields.upi_id || '',
      payment_note: fields.payment_note || ''
    };
    data.events.push(event);
    saveData(data);
    return sendJson(res, 201, { success: true, data: event });
  }

  const eventIdMatch = url.pathname.match(/^\/api\/events\/(\d+)$/);
  if (eventIdMatch && req.method === 'GET') {
    const event = data.events.find(item => Number(item.id) === Number(eventIdMatch[1]));
    if (!event) return sendJson(res, 404, { success: false, message: 'Event not found' });
    return sendJson(res, 200, { success: true, data: eventWithCounts(data, event) });
  }

  if (eventIdMatch && req.method === 'DELETE') {
    if (!isAuthed(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
    const eventId = Number(eventIdMatch[1]);
    const event = data.events.find(item => Number(item.id) === eventId);
    if (!event) return sendJson(res, 404, { success: false, message: 'Event not found' });
    const registrationCount = data.registrations.filter(reg => Number(reg.event_id) === eventId).length;
    data.events = data.events.filter(item => Number(item.id) !== eventId);
    data.registrations = data.registrations.filter(reg => Number(reg.event_id) !== eventId);
    saveData(data);
    return sendJson(res, 200, {
      success: true,
      data: { deleted_event: event, deleted_registrations: registrationCount }
    });
  }

  if (url.pathname === '/api/registrations' && req.method === 'POST') {
    const fields = await readFields(req);
    const event = data.events.find(item => Number(item.id) === Number(fields.event_id));
    if (!event) return sendJson(res, 404, { success: false, message: 'Event not found' });
    const teamMembers = Array.isArray(fields.team_members)
      ? fields.team_members
      : JSON.parse(fields.team_members || '[]');

    const registration = {
      id: data.nextRegistrationId++,
      event_id: Number(fields.event_id),
      team_name: fields.team_name || 'Unnamed Team',
      team_members: teamMembers,
      payment_status: event.is_paid ? 'pending' : 'n/a',
      verification_status: 'pending',
      transaction_id: fields.transaction_id || '',
      upi_reference: fields.upi_reference || '',
      payment_proof_path: fields.payment_proof || '',
      captain_file_path: fields.captainFile || '',
      registration_id: `REG-${crypto.randomInt(100000, 999999)}`,
      created_at: new Date().toISOString()
    };
    data.registrations.push(registration);
    saveData(data);
    return sendJson(res, 201, {
      success: true,
      data: {
        ...registration,
        event_name: event.name,
        event_date: event.date_time,
        event_venue: event.venue,
        event_description: event.description
      }
    });
  }

  const regsForEventMatch = url.pathname.match(/^\/api\/registrations\/event\/(\d+)$/);
  if (regsForEventMatch && req.method === 'GET') {
    if (!isAuthed(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
    const rows = data.registrations.filter(reg => Number(reg.event_id) === Number(regsForEventMatch[1]));
    return sendJson(res, 200, { success: true, data: rows });
  }

  const exportMatch = url.pathname.match(/^\/api\/registrations\/event\/(\d+)\/export$/);
  if (exportMatch && req.method === 'GET') {
    if (!isAuthed(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
    const eventId = Number(exportMatch[1]);
    const rows = data.registrations.filter(reg => Number(reg.event_id) === eventId);
    const event = data.events.find(item => Number(item.id) === eventId);
    const filename = `${event ? event.name : `event-${eventId}`}-registered-users-data.csv`
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename || `event-${eventId}-registrations.csv`}"`,
      'Cache-Control': 'no-store'
    });
    return res.end(csvForRegistrations(rows, event));
  }

  const verifyMatch = url.pathname.match(/^\/api\/registrations\/(\d+)\/verify$/);
  if (verifyMatch && req.method === 'PUT') {
    if (!isAuthed(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
    const reg = data.registrations.find(item => Number(item.id) === Number(verifyMatch[1]));
    if (!reg) return sendJson(res, 404, { success: false, message: 'Registration not found' });
    const event = data.events.find(item => Number(item.id) === Number(reg.event_id));
    if (!event) return sendJson(res, 404, { success: false, message: 'Event not found' });
    reg.verification_status = 'verified';
    reg.payment_status = reg.payment_status === 'n/a' ? 'n/a' : 'verified';
    reg.verified_at = new Date().toISOString();
    const emailResults = await notifyVerification(event, reg);
    reg.email_status = emailResults;
    saveData(data);
    return sendJson(res, 200, { success: true, data: reg, email: emailResults });
  }

  const registrationMatch = url.pathname.match(/^\/api\/registrations\/(\d+)$/);
  if (registrationMatch && req.method === 'DELETE') {
    if (!isAuthed(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
    const regId = Number(registrationMatch[1]);
    const reg = data.registrations.find(item => Number(item.id) === regId);
    if (!reg) return sendJson(res, 404, { success: false, message: 'Registration not found' });
    const event = data.events.find(item => Number(item.id) === Number(reg.event_id));
    if (!event) return sendJson(res, 404, { success: false, message: 'Event not found' });
    const emailResults = await notifyCancellation(event, reg);
    data.registrations = data.registrations.filter(item => Number(item.id) !== regId);
    saveData(data);
    return sendJson(res, 200, { success: true, data: reg, email: emailResults });
  }

  const rejectMatch = url.pathname.match(/^\/api\/registrations\/(\d+)\/reject$/);
  if (rejectMatch && req.method === 'PUT') {
    if (!isAuthed(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
    const fields = await readFields(req);
    const reg = data.registrations.find(item => Number(item.id) === Number(rejectMatch[1]));
    if (!reg) return sendJson(res, 404, { success: false, message: 'Registration not found' });
    reg.verification_status = 'rejected';
    reg.rejection_reason = fields.reason || '';
    saveData(data);
    return sendJson(res, 200, { success: true, data: reg });
  }

  const statsMatch = url.pathname.match(/^\/api\/admin\/events\/(\d+)\/stats$/);
  if (statsMatch && req.method === 'GET') {
    if (!isAuthed(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
    const event = data.events.find(item => Number(item.id) === Number(statsMatch[1]));
    if (!event) return sendJson(res, 404, { success: false, message: 'Event not found' });
    const regs = data.registrations.filter(reg => Number(reg.event_id) === Number(event.id));
    return sendJson(res, 200, {
      success: true,
      data: {
        event,
        stats: {
          total: regs.length,
          pending: regs.filter(reg => reg.verification_status === 'pending').length,
          verified: regs.filter(reg => reg.verification_status === 'verified').length,
          rejected: regs.filter(reg => reg.verification_status === 'rejected').length
        }
      }
    });
  }

  if (url.pathname === '/api/admin/dashboard' && req.method === 'GET') {
    if (!isAuthed(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
    return sendJson(res, 200, { success: true, data: dashboardData(data) });
  }

  return sendJson(res, 404, { success: false, message: 'Route not found' });
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const baseDir = pathname.startsWith('/uploads/') ? ROOT : CLIENT_DIR;
  const filePath = path.normalize(path.join(baseDir, pathname));

  if (!filePath.startsWith(baseDir)) {
    return sendText(res, 403, 'Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) return sendText(res, 404, 'File not found');
    const type = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    sendText(res, 200, content, type);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const data = loadData();
    if (url.pathname.startsWith('/api/')) {
      return await handleApi(req, res, url, data);
    }
    return serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { success: false, message: error.message || 'Server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Easy DataForge API running on port ${PORT}`);
  console.log('Admin login: admin / cyberadmin2042');
});
