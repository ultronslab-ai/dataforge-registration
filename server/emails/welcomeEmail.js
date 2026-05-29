exports.getWelcomeTemplate = (eventTitle) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Registration Approved!</h2>
    <p>Great news! Your registration for <strong>${eventTitle}</strong> has been approved.</p>
    <p>We look forward to seeing you at the event. Stay tuned for further updates.</p>
    <br/>
    <p>Best regards,<br/>DataForge Team</p>
  </div>
`;
