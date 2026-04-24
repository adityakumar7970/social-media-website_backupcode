# Password Reset Feature Implementation

## Overview
This implementation adds a secure "Forgot Password" feature to your Socialix social media app using email verification with Gmail SMTP.

## Features Implemented

### Frontend
- **Forgot Password Link**: Added to the login form (`index.html`)
- **Forgot Password Page** (`forgot-password.html`): Email input form
- **Reset Password Page** (`reset-password.html`): New password form with token validation
- **JavaScript Handlers**: API calls for forgot/reset password with proper error handling

### Backend
- **API Endpoints**:
  - `POST /auth/forgot-password`: Generates reset token and sends email
  - `POST /auth/reset-password`: Validates token and updates password
- **Security Features**:
  - Random 32-byte hex tokens (unguessable)
  - 30-minute token expiry
  - One-time use tokens
  - Bcrypt password hashing
  - Email enumeration protection

### Database Changes
- Added `resetToken` and `resetTokenExpiry` fields to User model

## Setup Instructions

### 1. Gmail App Password Setup

**Important**: You cannot use your regular Gmail password. You need to generate an "App Password" for security.

#### Steps:
1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to **Security** → **Signing in to Google**
3. Enable **2-Step Verification** (required for App Passwords)
4. Go to **App passwords** (under "Signing in to Google")
5. Select **Mail** and **Other (custom name)**
6. Enter "Socialix Password Reset" as the name
7. Click **Generate**
8. Copy the 16-character password (ignore spaces)

### 2. Environment Variables

Update your `.env` file with your Gmail credentials:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

**Example**:
```env
GMAIL_USER=john.doe@gmail.com
GMAIL_APP_PASSWORD=abcd-efgh-ijkl-mnop
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Test the Feature

1. Start your server:
   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000/index.html`

3. Click "Forgot Password?" link

4. Enter a registered email address

5. Check your email for the reset link

6. Click the link and set a new password

## Security Notes

- **Token Security**: Uses `crypto.randomBytes(32)` for 64-character hex tokens
- **Expiry**: Tokens expire after 30 minutes
- **One-time Use**: Tokens are cleared after successful password reset
- **Email Protection**: Always returns success message to prevent email enumeration
- **Password Hashing**: Uses bcrypt with salt rounds (default 10)

## API Endpoints

### POST /auth/forgot-password
**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** (always success for security):
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

### POST /auth/reset-password
**Request Body**:
```json
{
  "token": "reset-token-here",
  "newPassword": "newpassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password has been reset successfully."
}
```

## Email Template

The reset email includes:
- Subject: "Password Reset - Socialix"
- Reset link: `http://localhost:5000/reset-password.html?token=XYZ`
- Expiry notice: 30 minutes
- Security warning for unrecognized requests

## Troubleshooting

### Common Issues:

1. **"Authentication failed" error**:
   - Check your Gmail App Password is correct
   - Ensure 2FA is enabled on your Google account
   - Verify `.env` variables are loaded

2. **Emails not received**:
   - Check spam/junk folder
   - Verify Gmail App Password setup
   - Check server logs for Nodemailer errors

3. **Token expired**:
   - Request a new password reset
   - Tokens are valid for 30 minutes only

4. **Invalid token**:
   - Ensure the full URL from email is used
   - Tokens are case-sensitive

## Production Deployment

For production:
- Change reset URL to your domain: `https://yourdomain.com/reset-password.html?token=XYZ`
- Consider using a dedicated email service (SendGrid, Mailgun) instead of Gmail
- Add rate limiting to prevent abuse
- Use HTTPS for all password reset communications
- Consider adding CAPTCHA to prevent automated requests

## File Changes Summary

- `package.json`: Added `nodemailer` dependency
- `.env`: Added Gmail credentials
- `models/User.js`: Added reset token fields
- `routes/authRoutes.js`: Added forgot/reset password routes
- `index.html`: Added "Forgot Password?" link
- `forgot-password.html`: New page
- `reset-password.html`: New page
- `script.js`: Added form handlers
- `Style.css`: Added message styles