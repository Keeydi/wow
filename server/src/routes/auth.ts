import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db';
import { DbUser } from '../types';
import { sendPasswordResetEmail } from '../utils/emailer';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Username, email or employee ID is required'),
  password: z.string().min(1, 'Password is required'),
});

const router = Router();

router.post('/login', async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const { identifier, password } = parseResult.data;

  try {
    // First, try to select with password_reset_required column
    // If it fails, we'll catch and retry without it
    let rows: DbUser[];
    try {
      [rows] = await pool.execute<DbUser[]>(
        `SELECT id, username, email, employee_id, full_name, role, password_hash, password_reset_required
         FROM users
         WHERE username = ? OR email = ? OR employee_id = ?
         LIMIT 1`,
        [identifier, identifier, identifier],
      );
    } catch (columnError: any) {
      // If column doesn't exist, select without it
      if (columnError?.code === 'ER_BAD_FIELD_ERROR') {
        console.warn('password_reset_required column not found, selecting without it');
        [rows] = await pool.execute<DbUser[]>(
          `SELECT id, username, email, employee_id, full_name, role, password_hash
           FROM users
           WHERE username = ? OR email = ? OR employee_id = ?
           LIMIT 1`,
          [identifier, identifier, identifier],
        );
      } else {
        throw columnError;
      }
    }

    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordValid =
      (user.password_hash && (await bcrypt.compare(password, user.password_hash))) ||
      password === user.password_hash;

    if (!passwordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET || 'hrhub-secret',
      { expiresIn: '2h' },
    );

    // Convert MySQL boolean (0/1) to JavaScript boolean, default to false if column doesn't exist
    const passwordResetRequired = (user as any).password_reset_required !== undefined 
      ? Boolean((user as any).password_reset_required) 
      : false;

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        employeeId: user.employee_id,
        email: user.email,
        passwordResetRequired,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    
    const errorMessage = error?.code === 'ECONNREFUSED' || error?.code === 'ER_ACCESS_DENIED_ERROR'
      ? 'Database connection failed. Please check your database configuration.'
      : error?.code === 'ER_BAD_DB_ERROR'
      ? 'Database not found. Please ensure the database exists.'
      : error?.code === 'ER_NO_SUCH_TABLE'
      ? 'Database table not found. Please run the seed script.'
      : 'Unexpected error while logging in';
    
    return res.status(500).json({
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production' 
        ? error?.message 
        : undefined,
      code: process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production'
        ? error?.code
        : undefined,
    });
  }
});

// Forgot Password - Send reset link via email
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
});

router.post('/forgot-password', async (req, res) => {
  const parseResult = forgotPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const { email } = parseResult.data;

  try {
    const [rows] = await pool.execute<DbUser[]>(
      `SELECT id, email, full_name FROM users WHERE email = ? LIMIT 1`,
      [email],
    );

    const user = rows[0];

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Store token in database
    try {
      await pool.execute(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE token_hash = ?, expires_at = ?`,
        [user.id, tokenHash, expiresAt, tokenHash, expiresAt]
      );

      // Send email with reset link
      const emailSent = await sendPasswordResetEmail(
        user.email,
        resetToken,
        user.full_name || 'User'
      );

      if (!emailSent) {
        console.error('Failed to send password reset email');
        // Still return success to prevent email enumeration
      }
    } catch (error) {
      console.error('Error storing reset token:', error);
      // Still return success to prevent email enumeration
    }

    return res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error', error);
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

// Reset Password with token (from email link)
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

router.post('/reset-password', async (req, res) => {
  const parseResult = resetPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const { token, newPassword } = parseResult.data;

  try {
    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find the token in database
    const [tokenRows] = await pool.execute<any[]>(
      `SELECT prt.user_id, prt.expires_at, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token_hash = ? AND prt.used = FALSE
       LIMIT 1`,
      [tokenHash]
    );

    if (tokenRows.length === 0) {
      return res.status(400).json({
        message: 'Invalid or expired reset token.',
      });
    }

    const tokenData = tokenRows[0];

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).json({
        message: 'Reset token has expired. Please request a new one.',
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, tokenData.user_id]
    );

    // Mark token as used
    await pool.execute(
      'UPDATE password_reset_tokens SET used = TRUE WHERE token_hash = ?',
      [tokenHash]
    );

    return res.json({
      message: 'Password has been reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error', error);
    return res.status(500).json({ message: 'Unexpected error while resetting password' });
  }
});

// Change Password (for logged-in users)
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

router.post('/change-password', async (req, res) => {
  const parseResult = changePasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const { currentPassword, newPassword } = parseResult.data;

  // Get user ID from JWT token (you'll need to add auth middleware)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hrhub-secret') as { sub: number };
    const userId = decoded.sub;

    const [rows] = await pool.execute<DbUser[]>(
      `SELECT id, password_hash FROM users WHERE id = ? LIMIT 1`,
      [userId],
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordValid =
      (user.password_hash && (await bcrypt.compare(currentPassword, user.password_hash))) ||
      currentPassword === user.password_hash;

    if (!passwordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.execute(
      `UPDATE users SET password_hash = ?, password_reset_required = FALSE WHERE id = ?`,
      [hashedPassword, userId],
    );

    // Also update password in employees table if user is an employee
    const [userRows] = await pool.execute<any[]>(
      `SELECT employee_id FROM users WHERE id = ? LIMIT 1`,
      [userId],
    );
    
    if (userRows.length > 0 && userRows[0].employee_id) {
      await pool.execute(
        `UPDATE employees SET password_hash = ? WHERE id = ?`,
        [hashedPassword, userRows[0].employee_id],
      );
    }

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Change password error', error);
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

export default router;

