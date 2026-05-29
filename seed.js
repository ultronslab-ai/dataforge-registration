const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const { sequelize } = require('./server/config/db');

// Load env vars
dotenv.config();

const User = require('./server/models/User');
const Event = require('./server/models/Event');
const Registration = require('./server/models/Registration');

async function seedData() {
  try {
    console.log('Connecting to SQLite database and recreating tables...');
    // Force sync drops existing tables and recreates them
    await sequelize.sync({ force: true });
    console.log('Cleared existing database schemas.');

    // 1. Seed Admin
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'DataForge@Admin2024', salt);

    const admin = await User.create({
      username: process.env.SEED_ADMIN_USERNAME || 'admin',
      email: process.env.SEED_ADMIN_EMAIL || 'admin@dataforge.edu',
      password_hash: hashedPassword
    });
    console.log('Admin user created.');

    // 2. Seed Free Event
    const freeEvent = await Event.create({
      name: 'HackForge 2026',
      description: '<p>Join us for the ultimate 24-hour hackathon! Build innovative solutions, learn new technologies, and compete for amazing prizes. Open to all skill levels.</p>',
      date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      venue: 'Main Campus Auditorium',
      max_teams: 50,
      team_size: 4,
      fees: 0,
      is_paid: false,
      registration_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      category: 'Technical',
      status: 'Active',
      created_by: admin.id
    });

    // 3. Seed Paid Event
    const paidEvent = await Event.create({
      name: 'Data Science Bootcamp',
      description: '<p>A comprehensive 2-day bootcamp covering Python, Pandas, Machine Learning basics, and data visualization. Certificate included upon completion.</p>',
      date_time: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      venue: 'Lab Complex 3',
      max_teams: 30,
      team_size: 4,
      fees: 200,
      is_paid: true,
      qr_code_path: '/uploads/qr-codes/default-qr.png',
      upi_id: process.env.DEFAULT_UPI_ID || 'dataforge@ybl',
      payment_note: process.env.DEFAULT_PAYMENT_NOTE || 'Please mention your TEAM NAME in the payment notes/remittance field.',
      registration_deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
      category: 'Workshop',
      status: 'Active',
      created_by: admin.id
    });
    console.log('Events created.');

    // 4. Seed Registrations
    await Registration.create({
      event_id: freeEvent.id,
      team_name: 'Code Ninjas',
      team_members: [
        { full_name: 'Alice Smith', student_id: 'CS001', email: 'alice@test.com', phone: '1234567890', department: 'CS', year: '3', is_leader: true },
        { full_name: 'Bob Jones', student_id: 'CS002', email: 'bob@test.com', phone: '0987654321', department: 'CS', year: '3', is_leader: false }
      ],
      payment_status: 'n/a',
      verification_status: 'verified',
      registration_id: 'REG-123456'
    });

    await Registration.create({
      event_id: paidEvent.id,
      team_name: 'Data Miners',
      team_members: [
        { full_name: 'Charlie Brown', student_id: 'DS001', email: 'charlie@test.com', phone: '1112223333', department: 'DS', year: '4', is_leader: true },
        { full_name: 'Diana Prince', student_id: 'DS002', email: 'diana@test.com', phone: '4445556666', department: 'DS', year: '4', is_leader: false }
      ],
      payment_status: 'pending',
      verification_status: 'pending',
      transaction_id: 'TXN987654321',
      upi_reference: 'UPI123',
      payment_proof_path: '/uploads/payment-proofs/dummy.png',
      registration_id: 'REG-789012'
    });
    console.log('Sample registrations created.');

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
