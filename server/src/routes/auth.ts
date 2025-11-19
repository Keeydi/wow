import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { DbUser } from '../types';

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
    const [rows] = await pool.execute<DbUser[]>(
      `SELECT id, username, email, employee_id, full_name, role, password_hash, password_reset_required
       FROM users
       WHERE username = ? OR email = ? OR employee_id = ?
       LIMIT 1`,
      [identifier, identifier, identifier],
    );

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

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        employeeId: user.employee_id,
        email: user.email,
        passwordResetRequired: user.password_reset_required || false,
      },
    });
  } catch (error) {
    console.error('Login error', error);
    return res.status(500).json({ message: 'Unexpected error while logging in' });
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

    // In a real application, you would:
    // 1. Generate a secure reset token
    // 2. Store it in the database with an expiration
    // 3. Send an email with the reset link
    // For now, we'll just return success
    // TODO: Implement email sending functionality

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
    // In a real application, you would:
    // 1. Verify the token from the database
    // 2. Check if it's expired
    // 3. Update the password
    // For now, we'll use a simple approach with email
    // TODO: Implement proper token verification

    return res.status(501).json({
      message: 'Password reset via email is not fully implemented yet. Please contact admin.',
    });
  } catch (error) {
    console.error('Reset password error', error);
    return res.status(500).json({ message: 'Unexpected error' });
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

