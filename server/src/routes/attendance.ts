import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { DbAttendance } from '../types';
import { logActivity, getClientIp } from '../utils/activityLogger';

const router = Router();

const attendanceSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  employeeName: z.string().min(1, 'Employee name is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  checkIn: z.string().regex(/^\d{2}:\d{2}$/, 'Check-in time must be in HH:MM format').optional().nullable(),
  checkOut: z.string().regex(/^\d{2}:\d{2}$/, 'Check-out time must be in HH:MM format').optional().nullable(),
  status: z.enum(['present', 'absent', 'late', 'half-day', 'leave']).default('present'),
  notes: z.string().optional().nullable(),
  checkInImage: z.string().optional().nullable(),
  checkOutImage: z.string().optional().nullable(),
});

const updateAttendanceSchema = attendanceSchema.partial().extend({
  employeeId: z.string().min(1, 'Employee ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

const mapAttendanceRow = (row: DbAttendance) => ({
  id: String(row.id),
  employeeId: row.employee_id,
  employeeName: row.employee_name,
  date: row.date,
  checkIn: row.check_in || undefined,
  checkOut: row.check_out || undefined,
  status: row.status,
  notes: row.notes || undefined,
  checkInImage: row.check_in_image || undefined,
  checkOutImage: row.check_out_image || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// GET /attendance - Get all attendance records with optional filters
router.get('/', async (req, res) => {
  const { employeeId, date, startDate, endDate, status } = req.query;

  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (employeeId && typeof employeeId === 'string') {
      conditions.push('employee_id = ?');
      params.push(employeeId);
    }

    if (date && typeof date === 'string') {
      conditions.push('date = ?');
      params.push(date);
    }

    if (startDate && typeof startDate === 'string') {
      conditions.push('date >= ?');
      params.push(startDate);
    }

    if (endDate && typeof endDate === 'string') {
      conditions.push('date <= ?');
      params.push(endDate);
    }

    if (status && typeof status === 'string' && ['present', 'absent', 'late', 'half-day', 'leave'].includes(status)) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute<DbAttendance[]>(
      `SELECT id, employee_id, employee_name, date, check_in, check_out, status, notes, 
              check_in_image, check_out_image, created_at, updated_at
       FROM attendance
       ${whereClause}
       ORDER BY date DESC, check_in DESC`,
      params,
    );

    return res.json({
      data: rows.map(mapAttendanceRow),
    });
  } catch (error) {
    console.error('Error fetching attendance', error);
    return res.status(500).json({ message: 'Unexpected error while fetching attendance' });
  }
});

// GET /attendance/:id - Get single attendance record
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute<DbAttendance[]>(
      `SELECT id, employee_id, employee_name, date, check_in, check_out, status, notes, 
              check_in_image, check_out_image, created_at, updated_at
       FROM attendance
       WHERE id = ?`,
      [req.params.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    return res.json({
      data: mapAttendanceRow(rows[0]),
    });
  } catch (error) {
    console.error('Error fetching attendance', error);
    return res.status(500).json({ message: 'Unexpected error while fetching attendance' });
  }
});

// POST /attendance - Create new attendance record
router.post('/', async (req, res) => {
  const parseResult = attendanceSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const {
    employeeId,
    employeeName,
    date,
    checkIn,
    checkOut,
    status,
    notes,
    checkInImage,
    checkOutImage,
  } = parseResult.data;

  try {
    const [result] = await pool.execute(
      `INSERT INTO attendance 
       (employee_id, employee_name, date, check_in, check_out, status, notes, check_in_image, check_out_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         check_in = COALESCE(VALUES(check_in), check_in),
         check_out = COALESCE(VALUES(check_out), check_out),
         status = VALUES(status),
         notes = COALESCE(VALUES(notes), notes),
         check_in_image = COALESCE(VALUES(check_in_image), check_in_image),
         check_out_image = COALESCE(VALUES(check_out_image), check_out_image),
         updated_at = CURRENT_TIMESTAMP`,
      [
        employeeId,
        employeeName,
        date,
        checkIn || null,
        checkOut || null,
        status,
        notes || null,
        checkInImage || null,
        checkOutImage || null,
      ],
    );

    const insertId = (result as any).insertId;

    // Log activity
    await logActivity({
      userName: req.body.createdBy || 'System',
      actionType: 'CREATE',
      resourceType: 'Attendance',
      resourceId: String(insertId),
      resourceName: `${employeeName} - ${date}`,
      description: `Attendance record created for ${employeeName} (${employeeId}) on ${date}`,
      ipAddress: getClientIp(req),
      status: 'success',
      metadata: { employeeId, date, status },
    });

    const [newRows] = await pool.execute<DbAttendance[]>(
      `SELECT id, employee_id, employee_name, date, check_in, check_out, status, notes, 
              check_in_image, check_out_image, created_at, updated_at
       FROM attendance
       WHERE id = ?`,
      [insertId],
    );

    return res.status(201).json({
      message: 'Attendance record created successfully',
      data: mapAttendanceRow(newRows[0]),
    });
  } catch (error) {
    console.error('Error creating attendance', error);
    return res.status(500).json({ message: 'Unexpected error while creating attendance' });
  }
});

// PUT /attendance/:id - Update attendance record
router.put('/:id', async (req, res) => {
  const parseResult = updateAttendanceSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const {
    employeeId,
    employeeName,
    date,
    checkIn,
    checkOut,
    status,
    notes,
    checkInImage,
    checkOutImage,
  } = parseResult.data;

  try {
    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (employeeName !== undefined) {
      updates.push('employee_name = ?');
      params.push(employeeName);
    }
    if (checkIn !== undefined) {
      updates.push('check_in = ?');
      params.push(checkIn || null);
    }
    if (checkOut !== undefined) {
      updates.push('check_out = ?');
      params.push(checkOut || null);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes || null);
    }
    if (checkInImage !== undefined) {
      updates.push('check_in_image = ?');
      params.push(checkInImage || null);
    }
    if (checkOutImage !== undefined) {
      updates.push('check_out_image = ?');
      params.push(checkOutImage || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(req.params.id);

    await pool.execute(
      `UPDATE attendance 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      params,
    );

    // Get updated record
    const [updatedRows] = await pool.execute<DbAttendance[]>(
      `SELECT id, employee_id, employee_name, date, check_in, check_out, status, notes, 
              check_in_image, check_out_image, created_at, updated_at
       FROM attendance
       WHERE id = ?`,
      [req.params.id],
    );

    if (updatedRows.length === 0) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Log activity
    await logActivity({
      userName: req.body.updatedBy || 'System',
      actionType: 'UPDATE',
      resourceType: 'Attendance',
      resourceId: req.params.id,
      resourceName: `${updatedRows[0].employee_name} - ${updatedRows[0].date}`,
      description: `Attendance record updated for ${updatedRows[0].employee_name} (${updatedRows[0].employee_id}) on ${updatedRows[0].date}`,
      ipAddress: getClientIp(req),
      status: 'success',
      metadata: { employeeId: updatedRows[0].employee_id, date: updatedRows[0].date },
    });

    return res.json({
      message: 'Attendance record updated successfully',
      data: mapAttendanceRow(updatedRows[0]),
    });
  } catch (error) {
    console.error('Error updating attendance', error);
    return res.status(500).json({ message: 'Unexpected error while updating attendance' });
  }
});

// DELETE /attendance/:id - Delete attendance record
router.delete('/:id', async (req, res) => {
  try {
    // Get attendance record before deleting
    const [rows] = await pool.execute<DbAttendance[]>(
      `SELECT employee_id, employee_name, date FROM attendance WHERE id = ?`,
      [req.params.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    const attendance = rows[0];

    await pool.execute('DELETE FROM attendance WHERE id = ?', [req.params.id]);

    // Log activity
    await logActivity({
      userName: req.body.deletedBy || 'System',
      actionType: 'DELETE',
      resourceType: 'Attendance',
      resourceId: req.params.id,
      resourceName: `${attendance.employee_name} - ${attendance.date}`,
      description: `Attendance record deleted for ${attendance.employee_name} (${attendance.employee_id}) on ${attendance.date}`,
      ipAddress: getClientIp(req),
      status: 'success',
      metadata: { employeeId: attendance.employee_id, date: attendance.date },
    });

    return res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendance', error);
    return res.status(500).json({ message: 'Unexpected error while deleting attendance' });
  }
});

export default router;

