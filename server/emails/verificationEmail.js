exports.getVerificationTemplate = (eventTitle) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Registration Received</h2>
    <p>We have received your registration for <strong>${eventTitle}</strong>.</p>
    <p>Your registration is currently pending verification. We will notify you once it has been processed.</p>
    <br/>
    <p>Thank you,<br/>DataForge Team</p>
  </div>
`;
