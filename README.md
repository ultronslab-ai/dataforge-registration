# DataForge Club — Event Registration Platform

A full-stack, production-ready event registration system designed for college clubs. Features a public portal for student registration and a secure admin panel for event management and payment verification.

## Features

*   **Public Portal:** Event listing, dynamic team registration (1-4 members), conditional payment flows (free vs. paid), and file uploads for payment proofs.
*   **Admin Panel:** Secure login, dashboard analytics, event management (create/edit/delete), registration verification workflow, and CSV exports.
*   **Automated Emails:** Automatic email dispatch upon registration verification or rejection.
*   **Responsive Design:** Dark cyberpunk aesthetic built with HTML5, CSS3 (variables, grid/flexbox), and vanilla JavaScript.
*   **Security:** JWT authentication, bcrypt password hashing, rate limiting, and secure file upload handling.

## Tech Stack

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript, Chart.js
*   **Backend:** Node.js, Express.js
*   **Database:** SQLite (via Sequelize ORM)
*   **Utilities:** Multer (file uploads), Nodemailer (emails), JSON2CSV (exports)

## Prerequisites

*   Node.js (v18+)
*   SQLite (automatically initialized, no accounts or services needed)
*   An SMTP service (e.g., Gmail App Password, SendGrid)

## Installation & Setup

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Variables**
    Copy `.env.example` to `.env` and fill in your details:
    ```bash
    cp .env.example .env
    ```
    *   `DB_PATH`: Path to SQLite database file (defaults to `./database.sqlite`).
    *   `JWT_SECRET`: A strong secret key.
    *   `SMTP_*`: Your email credentials.

3.  **Seed the Database (Optional but recommended for testing)**
    This creates an admin user and sample events.
    ```bash
    npm run seed
    ```
    *Default Admin Credentials:*
    *   Username: `admin` (or as set in `.env`)
    *   Password: `cyberadmin2042` (or as set in `.env`)

4.  **Run the Server**
    ```bash
    # Development mode (with nodemon)
    npm run dev
    
    # Production mode
    npm start
    ```

5.  **Access the App**
    *   Public Portal: `http://localhost:4000`
    *   Admin Panel: `http://localhost:4000/admin/login.html`

## Customization

*   **Colors/Theme:** Edit CSS variables in `client/css/main.css`.
*   **Club Info:** Update default UPI, names, and emails in your `.env` file or within the admin panel settings (if configured).
*   **Email Templates:** Located in `server/emails/`. Modify the HTML to suit your brand.

## Deployment

The app is ready to be deployed to platforms like Vercel, Heroku, or Render. Ensure all environment variables are securely set in your hosting provider's dashboard.

*Note for production:* Configure a robust storage solution (like AWS S3) for file uploads instead of local storage if your hosting environment is ephemeral (e.g., Heroku).
