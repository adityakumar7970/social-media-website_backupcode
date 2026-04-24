const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

function isValidEmail(value) {
  return typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value);
}

function normalizeMobile(value) {
  return value.replace(/[^0-9]/g, '');
}

function isValidMobile(value) {
  return typeof value === 'string' && /^\d{8,15}$/.test(value);
}

router.post('/login', async (req, res) => {
  try {
    const { loginId, email, mobile, password } = req.body;

    // Accept anything (loginId OR email OR mobile)
    const input = loginId || email || mobile;

    // Normalize and trim all inputs
    const normalizedInput = input?.trim();
    const normalizedPassword = password?.trim();

    // Debug logging
    console.log("Login Request:", {
      input: input?.substring(0, 20) + (input?.length > 20 ? '...' : ''),
      passwordLength: normalizedPassword?.length,
      timestamp: new Date().toISOString()
    });

    if (!normalizedInput || !normalizedPassword) {
      return res.status(400).json({
        success: false,
        message: 'Login ID / Email / Mobile and password are required.'
      });
    }

    const normalizedMobileInput = normalizeMobile(normalizedInput);

    // Decide whether login input is email, mobile, or username
    let user;
    if (isValidEmail(normalizedInput)) {
      console.log("Login: Email lookup for:", normalizedInput.toLowerCase());
      user = await User.findOne({ email: normalizedInput.toLowerCase() });
    } else if (isValidMobile(normalizedMobileInput)) {
      console.log("Login: Mobile lookup for:", normalizedMobileInput);
      user = await User.findOne({ mobile: normalizedMobileInput });
    } else {
      console.log("Login: Username lookup for:", normalizedInput.toLowerCase());
      user = await User.findOne({ username: normalizedInput.toLowerCase() });
    }

    // User not found
    if (!user) {
      console.log("Login: User not found");
      return res.status(401).json({
        success: false,
        message: 'Invalid login credentials.'
      });
    }

    // Password check (IMPORTANT - use trimmed password)
    console.log("Login: Comparing passwords, inputLength:", normalizedPassword.length, "storedHashLength:", user.password.length);
    const isPasswordValid = await bcrypt.compare(normalizedPassword, user.password);

    if (!isPasswordValid) {
      console.log("Login: Password mismatch");
      return res.status(401).json({
        success: false,
        message: 'Invalid login credentials.'
      });
    }

    console.log("Login: Authentication successful for user:", user.username);

    //JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    //success response
    return res.json({
      success: true,
      token,
      user: {
        userId: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobile: user.mobile,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while logging in.'
    });
  }
});

router.post('/register', async (req, res) => {
  try {
    const firstName = req.body.firstName?.trim();
    const lastName = req.body.lastName?.trim();
    const email = req.body.email?.trim();
    const mobile = req.body.mobile?.trim();
    const username = req.body.username?.trim();
    const password = req.body.password?.trim();
    const dateOfBirth = req.body.dateOfBirth;
    const gender = req.body.gender?.trim();

    console.log("Signup Request:", {
      email: email?.substring(0, 20) + (email?.length > 20 ? '...' : ''),
      mobile: mobile?.substring(0, 20) + (mobile?.length > 20 ? '...' : ''),
      username,
      passwordLength: password?.length,
      timestamp: new Date().toISOString()
    });

    if (
      !firstName ||
      !lastName ||
      !username ||
      !password ||
      !dateOfBirth ||
      !gender ||
      (!email && !mobile)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required signup fields.',
      });
    }

    const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
    const normalizedMobile = mobile ? normalizeMobile(mobile) : undefined;

    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    if (normalizedMobile && !isValidMobile(normalizedMobile)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid mobile number.',
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase().trim() },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ...(normalizedMobile ? [{ mobile: normalizedMobile }] : []),
      ],
    });

    if (existingUser) {
      let conflictField = 'username';
      if (normalizedEmail && existingUser.email === normalizedEmail) conflictField = 'email';
      if (normalizedMobile && existingUser.mobile === normalizedMobile) conflictField = 'mobile';
      return res.status(409).json({
        success: false,
        message: `This ${conflictField} is already in use. Please choose another.`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      username: username.toLowerCase().trim(),
      password: hashedPassword,
      dateOfBirth: new Date(dateOfBirth),
      gender: gender.trim().toLowerCase(),
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while registering.',
    });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Save token to user
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Validate Gmail config before sending
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error('Missing Gmail SMTP credentials. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.');
    }

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.verify();
    console.log('Nodemailer verified Gmail SMTP settings for', process.env.GMAIL_USER);

    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: 'Password Reset - Socialix',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your Socialix account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 30 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>Socialix Team</p>
      `,
    };

    console.log('Sending password reset email to', user.email, 'with token', resetToken);
    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Server error while processing request.'
      : error.message || 'Server error while processing request.';

    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear token
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    return res.json({
      success: true,
      message: 'Password has been reset successfully.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while resetting password.',
    });
  }
});

module.exports = router;
