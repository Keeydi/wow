import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../db';
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
    // Query user by username, email, or employee_id
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, employee_id, full_name, role, password_hash, password_reset_required')
      .or(`username.eq.${identifier},email.eq.${identifier},employee_id.eq.${identifier}`)
      .limit(1)
      .single();

    if (error || !users) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users as DbUser;

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

    // Convert boolean, default to false if column doesn't exist
    const passwordResetRequired = (user as any).password_reset_required ?? false;

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
    
    const errorMessage = error?.code === 'PGRST116' || error?.message?.includes('relation')
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
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', email)
      .limit(1)
      .single();

    const user = users as DbUser | null;

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
      // Check if token exists for this user
      const { data: existingToken } = await supabase
        .from('password_reset_tokens')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingToken) {
        // Update existing token
        await supabase
          .from('password_reset_tokens')
          .update({ token_hash: tokenHash, expires_at: expiresAt.toISOString() })
          .eq('user_id', user.id);
      } else {
        // Insert new token
        await supabase
          .from('password_reset_tokens')
          .insert({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt.toISOString() });
      }

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
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('user_id, expires_at')
      .eq('token_hash', tokenHash)
      .eq('used', false)
      .limit(1)
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).json({
        message: 'Invalid or expired reset token.',
      });
    }

    // Get user email
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', tokenData.user_id)
      .single();

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).json({
        message: 'Reset token has expired. Please request a new one.',
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', tokenData.user_id);

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token_hash', tokenHash);

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

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, password_hash, employee_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordValid =
      (user.password_hash && (await bcrypt.compare(currentPassword, user.password_hash))) ||
      currentPassword === user.password_hash;

    if (!passwordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await supabase
      .from('users')
      .update({ password_hash: hashedPassword, password_reset_required: false })
      .eq('id', userId);

    // Also update password in employees table if user is an employee
    if (user.employee_id) {
      await supabase
        .from('employees')
        .update({ password_hash: hashedPassword })
        .eq('id', user.employee_id);
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

