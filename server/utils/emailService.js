const transporter = require('../config/email');
const config = require('../config/config');
const EmailLog = require('../models/EmailLog');
const { getVerificationTemplate } = require('../emails/verificationEmail');
const { getWelcomeTemplate } = require('../emails/welcomeEmail');
const { getRejectionTemplate } = require('../emails/rejectionEmail');

const sendEmail = async (options) => {
  const mailOptions = {
    from: config.email.from,
    to: options.email,
    subject: options.subject,
    html: options.html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    // Log success
    await EmailLog.create({
      to: options.email,
      subject: options.subject,
      type: options.type,
      status: 'sent',
      registrationId: options.registrationId || null
    });
    return info;
  } catch (error) {
    console.error('Email sent error:', error);
    // Log failure
    await EmailLog.create({
      to: options.email,
      subject: options.subject,
      type: options.type,
      status: 'failed',
      error: error.message,
      registrationId: options.registrationId || null
    });
  }
};

exports.sendVerificationEmail = async (email, eventTitle, registrationId) => {
  const html = getVerificationTemplate(eventTitle);
  await sendEmail({
    email,
    subject: `Registration Received - ${eventTitle}`,
    html,
    type: 'verification',
    registrationId
  });
};

exports.sendWelcomeEmail = async (email, eventTitle) => {
  const html = getWelcomeTemplate(eventTitle);
  await sendEmail({
    email,
    subject: `Registration Confirmed - ${eventTitle}`,
    html,
    type: 'welcome'
  });
};

exports.sendRejectionEmail = async (email, eventTitle) => {
  const html = getRejectionTemplate(eventTitle);
  await sendEmail({
    email,
    subject: `Registration Update - ${eventTitle}`,
    html,
    type: 'rejection'
  });
};
