exports.getRejectionTemplate = (eventTitle) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Registration Update</h2>
    <p>We regret to inform you that we could not approve your registration for <strong>${eventTitle}</strong>.</p>
    <p>If you believe this was a mistake or if you need further clarification, please contact our support team.</p>
    <br/>
    <p>Sincerely,<br/>DataForge Team</p>
  </div>
`;
