import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
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
    let query = supabase
      .from('attendance')
      .select('id, employee_id, employee_name, date, check_in, check_out, status, notes, check_in_image, check_out_image, created_at, updated_at')
      .order('date', { ascending: false })
      .order('check_in', { ascending: false });

    if (employeeId && typeof employeeId === 'string') {
      query = query.eq('employee_id', employeeId);
    }

    if (date && typeof date === 'string') {
      query = query.eq('date', date);
    }

    if (startDate && typeof startDate === 'string') {
      query = query.gte('date', startDate);
    }

    if (endDate && typeof endDate === 'string') {
      query = query.lte('date', endDate);
    }

    if (status && typeof status === 'string' && ['present', 'absent', 'late', 'half-day', 'leave'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: rows, error } = await query;

    if (error) {
      throw error;
    }

    return res.json({
      data: (rows || []).map(mapAttendanceRow),
    });
  } catch (error) {
    console.error('Error fetching attendance', error);
    return res.status(500).json({ message: 'Unexpected error while fetching attendance' });
  }
});

// GET /attendance/:id - Get single attendance record
router.get('/:id', async (req, res) => {
  try {
    const { data: attendanceData, error } = await supabase
      .from('attendance')
      .select('id, employee_id, employee_name, date, check_in, check_out, status, notes, check_in_image, check_out_image, created_at, updated_at')
      .eq('id', req.params.id)
      .single();

    if (error || !attendanceData) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    return res.json({
      data: mapAttendanceRow(attendanceData as DbAttendance),
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
    // Check if attendance record already exists for this employee and date
    const { data: existingRecord } = await supabase
      .from('attendance')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .single();

    let attendanceId: number;
    let attendanceData: DbAttendance;

    if (existingRecord) {
      // Update existing record
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (checkIn !== undefined) updateData.check_in = checkIn || null;
      if (checkOut !== undefined) updateData.check_out = checkOut || null;
      if (notes !== undefined) updateData.notes = notes || null;
      if (checkInImage !== undefined) updateData.check_in_image = checkInImage || null;
      if (checkOutImage !== undefined) updateData.check_out_image = checkOutImage || null;

      const { data: updatedData, error: updateError } = await supabase
        .from('attendance')
        .update(updateData)
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      attendanceId = existingRecord.id;
      attendanceData = updatedData as DbAttendance;
    } else {
      // Insert new record
      const { data: newRecord, error: insertError } = await supabase
        .from('attendance')
        .insert({
          employee_id: employeeId,
          employee_name: employeeName,
          date,
          check_in: checkIn || null,
          check_out: checkOut || null,
          status,
          notes: notes || null,
          check_in_image: checkInImage || null,
          check_out_image: checkOutImage || null,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      attendanceId = newRecord.id;
      attendanceData = newRecord as DbAttendance;
    }

    // Log activity
    await logActivity({
      userName: req.body.createdBy || 'System',
      actionType: 'CREATE',
      resourceType: 'Attendance',
      resourceId: String(attendanceId),
      resourceName: `${employeeName} - ${date}`,
      description: `Attendance record created for ${employeeName} (${employeeId}) on ${date}`,
      ipAddress: getClientIp(req),
      status: 'success',
      metadata: { employeeId, date, status },
    });

    return res.status(201).json({
      message: 'Attendance record created successfully',
      data: mapAttendanceRow(attendanceData),
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
    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (employeeName !== undefined) updateData.employee_name = employeeName;
    if (checkIn !== undefined) updateData.check_in = checkIn || null;
    if (checkOut !== undefined) updateData.check_out = checkOut || null;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes || null;
    if (checkInImage !== undefined) updateData.check_in_image = checkInImage || null;
    if (checkOutImage !== undefined) updateData.check_out_image = checkOutImage || null;

    if (Object.keys(updateData).length === 1) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const { error: updateError } = await supabase
      .from('attendance')
      .update(updateData)
      .eq('id', req.params.id);

    if (updateError) {
      throw updateError;
    }

    // Get updated record
    const { data: updatedRows, error: fetchError } = await supabase
      .from('attendance')
      .select('id, employee_id, employee_name, date, check_in, check_out, status, notes, check_in_image, check_out_image, created_at, updated_at')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !updatedRows) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Log activity
    await logActivity({
      userName: req.body.updatedBy || 'System',
      actionType: 'UPDATE',
      resourceType: 'Attendance',
      resourceId: req.params.id,
      resourceName: `${updatedRows.employee_name} - ${updatedRows.date}`,
      description: `Attendance record updated for ${updatedRows.employee_name} (${updatedRows.employee_id}) on ${updatedRows.date}`,
      ipAddress: getClientIp(req),
      status: 'success',
      metadata: { employeeId: updatedRows.employee_id, date: updatedRows.date },
    });

    return res.json({
      message: 'Attendance record updated successfully',
      data: mapAttendanceRow(updatedRows as DbAttendance),
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
    const { data: attendanceData, error: fetchError } = await supabase
      .from('attendance')
      .select('employee_id, employee_name, date')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !attendanceData) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    const attendance = attendanceData as DbAttendance;

    const { error: deleteError } = await supabase
      .from('attendance')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) {
      throw deleteError;
    }

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

