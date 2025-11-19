import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { pool } from '../db';
import { DbEmployee } from '../types';
import { logActivity, getClientIp } from '../utils/activityLogger';

const router = Router();

const validateEmployeeId = (id: string): boolean => {
  if (!id) return false;
  const parts = id.split('-');
  if (parts.length !== 3) return false;
  const [year, school, uniqueId] = parts;
  // Year: 2 digits
  if (!/^\d{2}$/.test(year)) return false;
  // School: 2-4 uppercase letters
  if (!/^[A-Z]{2,4}$/.test(school)) return false;
  // Unique ID: 1-5 digits
  if (!/^\d{1,5}$/.test(uniqueId)) return false;
  return true;
};

const normalizeRole = (role?: string | null): 'admin' | 'employee' =>
  role?.toLowerCase() === 'admin' ? 'admin' : 'employee';

const employeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required')
    .refine((id) => validateEmployeeId(id), {
      message: 'Employee ID must be in format: YY-SCHOOL-XXXXX (e.g., 25-GPC-12345). Year: 2 digits, School: 2-4 letters, Unique ID: 1-5 digits',
    }),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().min(1, 'Middle name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  suffixName: z.string().min(1, 'Suffix is required'),
  fullName: z.string().min(1, 'Full name is required'),
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Phone is required'),
  dateOfBirth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  civilStatus: z.string().optional().nullable(),
  dateHired: z.string().min(1, 'Date hired is required'),
  dateOfLeaving: z.string().optional().nullable(),
  employmentType: z.string().min(1).default('Regular'),
  role: z.string().optional().nullable(),
  sssNumber: z.string().optional().nullable(),
  pagibigNumber: z.string().optional().nullable(),
  tinNumber: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  educationalBackground: z.string().optional().nullable(),
  signatureFile: z.string().optional().nullable(),
  pdsFile: z.string().optional().nullable(),
  serviceRecordFile: z.string().optional().nullable(),
  registeredFaceFile: z.string().optional().nullable(),
  password: z.string().trim().min(6, 'Password must be at least 6 characters'),
  status: z.enum(['active', 'inactive']).optional(),
});

const archiveSchema = z.object({
  reason: z.string().min(1, 'Archive reason is required'),
});

const mapEmployeeRow = (row: DbEmployee) => ({
  id: String(row.id),
  employeeId: row.employee_id,
  firstName: row.first_name,
  middleName: row.middle_name,
  lastName: row.last_name,
  suffixName: row.suffix_name,
  fullName: row.full_name,
  department: row.department,
  position: row.position,
  email: row.email,
  phone: row.phone,
  dateOfBirth: row.date_of_birth,
  address: row.address,
  gender: row.gender,
  civilStatus: row.civil_status,
  dateHired: row.date_hired,
  dateOfLeaving: row.date_of_leaving,
  employmentType: row.employment_type,
  role: row.role,
  sssNumber: row.sss_number,
  pagibigNumber: row.pagibig_number,
  tinNumber: row.tin_number,
  emergencyContact: row.emergency_contact,
  educationalBackground: row.educational_background,
  signatureFile: row.signature_file,
  pdsFile: row.pds_file,
  serviceRecordFile: row.service_record_file,
  registeredFaceFile: row.registered_face_file,
  status: row.status,
  archivedReason: row.archived_reason,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

router.get('/', async (req, res) => {
  const { status, employeeId } = req.query;

  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (status === 'active' || status === 'inactive') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (employeeId && typeof employeeId === 'string') {
      conditions.push('employee_id = ?');
      params.push(employeeId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute<DbEmployee[]>(
      `SELECT id, employee_id, first_name, middle_name, last_name, suffix_name, full_name, department, position, email, phone,
              date_of_birth, address, gender, civil_status, date_hired, date_of_leaving,
              employment_type, role, sss_number, pagibig_number, tin_number,
              emergency_contact, educational_background, signature_file, pds_file,
              service_record_file, registered_face_file, status,
              archived_reason, archived_at, created_at, updated_at
         FROM employees
         ${whereClause}
         ORDER BY created_at DESC`,
      params,
    );

    return res.json({
      data: rows.map(mapEmployeeRow),
    });
  } catch (error) {
    console.error('Error fetching employees', error);
    return res.status(500).json({ message: 'Unexpected error while fetching employees' });
  }
});

router.post('/', async (req, res) => {
  const parseResult = employeeSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const {
    employeeId,
    firstName,
    middleName,
    lastName,
    suffixName,
    fullName,
    department,
    position,
    email,
    phone,
    dateOfBirth,
    address,
    gender,
    civilStatus,
    dateHired,
    dateOfLeaving,
    employmentType,
    role,
    sssNumber,
    pagibigNumber,
    tinNumber,
    emergencyContact,
    educationalBackground,
    signatureFile,
    pdsFile,
    serviceRecordFile,
    registeredFaceFile,
    password,
  } = parseResult.data;

  const normalizedFullName =
    fullName?.trim() ||
    [firstName, middleName, lastName, suffixName]
      .filter((part) => Boolean(part && part.trim().length))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

  try {
    const connection = await pool.getConnection();
    let insertId: number | null = null;
    try {
      await connection.beginTransaction();

      const hashedPassword = await bcrypt.hash(password, 10);

      const [result] = await connection.execute(
        `INSERT INTO employees
          (employee_id, first_name, middle_name, last_name, suffix_name, full_name, department, position, email, phone,
           date_of_birth, address, gender, civil_status, date_hired, date_of_leaving,
           employment_type, role, sss_number, pagibig_number, tin_number,
           emergency_contact, educational_background, signature_file, pds_file,
           service_record_file, registered_face_file, password_hash, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          employeeId,
          firstName,
          middleName,
          lastName,
          suffixName,
          normalizedFullName,
          department,
          position,
          email,
          phone,
          dateOfBirth || null,
          address || null,
          gender || null,
          civilStatus || null,
          dateHired,
          dateOfLeaving || null,
          employmentType,
          role || null,
          sssNumber || null,
          pagibigNumber || null,
          tinNumber || null,
          emergencyContact || null,
          educationalBackground || null,
          signatureFile || null,
          pdsFile || null,
          serviceRecordFile || null,
          registeredFaceFile || null,
          hashedPassword,
        ],
      );

      insertId = (result as any).insertId;

      await connection.execute(
        `INSERT INTO users (username, email, employee_id, full_name, role, password_hash)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           email = VALUES(email),
           employee_id = VALUES(employee_id),
           full_name = VALUES(full_name),
           role = VALUES(role),
           password_hash = VALUES(password_hash)`,
        [
          employeeId,
          email,
          employeeId,
          normalizedFullName,
          normalizeRole(role),
          hashedPassword,
        ],
      );

      await connection.commit();
    } catch (transactionError) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Rollback failed while creating employee', rollbackError);
      }
      throw transactionError;
    } finally {
      connection.release();
    }

    // Log activity
    await logActivity({
      userName: req.body.createdBy || 'System',
      actionType: 'CREATE',
      resourceType: 'Employee',
      resourceId: insertId ? String(insertId) : undefined,
      resourceName: normalizedFullName,
      description: `Employee ${normalizedFullName} (${employeeId}) was created`,
      ipAddress: getClientIp(req),
      status: 'success',
      metadata: { employeeId, department, position },
    });

    return res.status(201).json({ message: 'Employee added successfully' });
  } catch (error) {
    console.error('Error creating employee', error);
    
    // Log failed activity
    await logActivity({
      userName: req.body.createdBy || 'System',
      actionType: 'CREATE',
      resourceType: 'Employee',
      resourceName: normalizedFullName,
      description: `Failed to create employee: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });

    return res.status(500).json({ message: 'Unexpected error while creating employee' });
  }
});

router.put('/:id', async (req, res) => {
  // For updates, make all fields optional and only validate employeeId format if provided
  const updateSchema = z.object({
    employeeId: z.string().optional().refine((id) => {
      if (!id) return true; // Optional for updates
      return validateEmployeeId(id);
    }, {
      message: 'Employee ID must be in format: YY-SCHOOL-XXXXX (e.g., 25-GPC-12345). Year: 2 digits, School: 2-4 letters, Unique ID: 1-5 digits',
    }),
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    suffixName: z.string().optional(),
    fullName: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    email: z.union([
      z.string().email('Invalid email'),
      z.string().length(0),
      z.undefined(),
    ]).optional(),
    phone: z.string().optional(),
    dateOfBirth: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    civilStatus: z.string().optional().nullable(),
    dateHired: z.string().optional(),
    dateOfLeaving: z.string().optional().nullable(),
    employmentType: z.string().optional(),
    role: z.string().optional().nullable(),
    sssNumber: z.string().optional().nullable(),
    pagibigNumber: z.string().optional().nullable(),
    tinNumber: z.string().optional().nullable(),
    emergencyContact: z.string().optional().nullable(),
    educationalBackground: z.string().optional().nullable(),
    signatureFile: z.string().optional().nullable(),
    pdsFile: z.string().optional().nullable(),
    serviceRecordFile: z.string().optional().nullable(),
    registeredFaceFile: z.string().optional().nullable(),
    password: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive']).optional(),
  });
  
  const parseResult = updateSchema.safeParse(req.body);
  if (!parseResult.success) {
    console.error('Validation errors:', parseResult.error.flatten().fieldErrors);
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const {
    employeeId,
    firstName,
    middleName,
    lastName,
    suffixName,
    fullName,
    department,
    position,
    email,
    phone,
    dateOfBirth,
    address,
    gender,
    civilStatus,
    dateHired,
    dateOfLeaving,
    employmentType,
    role,
    sssNumber,
    pagibigNumber,
    tinNumber,
    emergencyContact,
    educationalBackground,
    signatureFile,
    pdsFile,
    serviceRecordFile,
    registeredFaceFile,
    password,
    status,
  } = parseResult.data;

  const derivedFullName =
    fullName?.trim() ||
    [firstName, middleName, lastName, suffixName]
      .filter((part) => typeof part === 'string' && part.trim().length)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

  try {
    const connection = await pool.getConnection();
    let updatedEmployee: DbEmployee | null = null;
    try {
      await connection.beginTransaction();

      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

      await connection.execute(
        `UPDATE employees
           SET employee_id = COALESCE(?, employee_id),
               first_name = COALESCE(?, first_name),
               middle_name = COALESCE(?, middle_name),
               last_name = COALESCE(?, last_name),
               suffix_name = COALESCE(?, suffix_name),
               full_name = COALESCE(?, full_name),
               department = COALESCE(?, department),
               position = COALESCE(?, position),
               email = COALESCE(?, email),
               phone = COALESCE(?, phone),
               date_of_birth = COALESCE(?, date_of_birth),
               address = COALESCE(?, address),
               gender = COALESCE(?, gender),
               civil_status = COALESCE(?, civil_status),
               date_hired = COALESCE(?, date_hired),
               date_of_leaving = COALESCE(?, date_of_leaving),
               employment_type = COALESCE(?, employment_type),
               role = COALESCE(?, role),
               sss_number = COALESCE(?, sss_number),
               pagibig_number = COALESCE(?, pagibig_number),
               tin_number = COALESCE(?, tin_number),
               emergency_contact = COALESCE(?, emergency_contact),
               educational_background = COALESCE(?, educational_background),
               signature_file = COALESCE(?, signature_file),
               pds_file = COALESCE(?, pds_file),
               service_record_file = COALESCE(?, service_record_file),
               registered_face_file = COALESCE(?, registered_face_file),
               password_hash = COALESCE(?, password_hash),
               status = COALESCE(?, status)
         WHERE id = ?`,
        [
          employeeId ?? null,
          firstName ?? null,
          middleName ?? null,
          lastName ?? null,
          suffixName ?? null,
          derivedFullName || null,
          department ?? null,
          position ?? null,
          email ?? null,
          phone ?? null,
          dateOfBirth ?? null,
          address ?? null,
          gender ?? null,
          civilStatus ?? null,
          dateHired ?? null,
          dateOfLeaving ?? null,
          employmentType ?? null,
          role ?? null,
          sssNumber ?? null,
          pagibigNumber ?? null,
          tinNumber ?? null,
          emergencyContact ?? null,
          educationalBackground ?? null,
          signatureFile ?? null,
          pdsFile ?? null,
          serviceRecordFile ?? null,
          registeredFaceFile ?? null,
          hashedPassword ?? null,
          status ?? null,
          req.params.id,
        ],
      );

      const [employeeRows] = await connection.execute<DbEmployee[]>(
        `SELECT id, full_name, employee_id, email, role, password_hash 
         FROM employees 
         WHERE id = ?`,
        [req.params.id],
      );
      updatedEmployee = employeeRows[0] || null;

      if (!updatedEmployee) {
        await connection.rollback();
        return res.status(404).json({ message: 'Employee not found' });
      }

      if (updatedEmployee.password_hash) {
        await connection.execute(
          `INSERT INTO users (username, email, employee_id, full_name, role, password_hash)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             email = VALUES(email),
             employee_id = VALUES(employee_id),
             full_name = VALUES(full_name),
             role = VALUES(role),
             password_hash = VALUES(password_hash)`,
          [
            updatedEmployee.employee_id,
            updatedEmployee.email,
            updatedEmployee.employee_id,
            updatedEmployee.full_name,
            normalizeRole(updatedEmployee.role),
            updatedEmployee.password_hash,
          ],
        );
      }

      await connection.commit();
    } catch (transactionError) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Rollback failed while updating employee', rollbackError);
      }
      throw transactionError;
    } finally {
      connection.release();
    }

    // Log activity
    await logActivity({
      userName: req.body.updatedBy || 'System',
      actionType: 'UPDATE',
      resourceType: 'Employee',
      resourceId: req.params.id,
      resourceName: updatedEmployee?.full_name || derivedFullName || 'Unknown',
      description: `Employee ${updatedEmployee?.full_name || derivedFullName || 'Unknown'} (${updatedEmployee?.employee_id || employeeId || 'N/A'}) was updated`,
      ipAddress: getClientIp(req),
      status: 'success',
      metadata: { employeeId: updatedEmployee?.employee_id || employeeId },
    });

    return res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    console.error('Error updating employee', error);
    
    // Log failed activity
    await logActivity({
      userName: req.body.updatedBy || 'System',
      actionType: 'UPDATE',
      resourceType: 'Employee',
      resourceId: req.params.id,
      description: `Failed to update employee: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });

    return res.status(500).json({ message: 'Unexpected error while updating employee' });
  }
});

router.patch('/:id/archive', async (req, res) => {
  const parseResult = archiveSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  try {
    await pool.execute(
      `UPDATE employees
         SET status = 'inactive',
             archived_reason = ?,
             archived_at = NOW()
       WHERE id = ?`,
      [parseResult.data.reason, req.params.id],
    );

    // Get employee info for logging
    const [employeeRows] = await pool.execute<DbEmployee[]>(
      'SELECT full_name, employee_id FROM employees WHERE id = ?',
      [req.params.id]
    );
    const employee = employeeRows[0];

    // Log activity
    await logActivity({
      userName: req.body.archivedBy || 'System',
      actionType: 'ARCHIVE',
      resourceType: 'Employee',
      resourceId: req.params.id,
      resourceName: employee?.full_name || 'Unknown',
      description: `Employee ${employee?.full_name || 'Unknown'} (${employee?.employee_id || 'N/A'}) was archived. Reason: ${parseResult.data.reason}`,
      ipAddress: getClientIp(req),
      status: 'success',
      metadata: { reason: parseResult.data.reason, employeeId: employee?.employee_id },
    });

    return res.json({ message: 'Employee archived successfully' });
  } catch (error) {
    console.error('Error archiving employee', error);
    
    // Log failed activity
    await logActivity({
      userName: req.body.archivedBy || 'System',
      actionType: 'ARCHIVE',
      resourceType: 'Employee',
      resourceId: req.params.id,
      description: `Failed to archive employee: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });

    return res.status(500).json({ message: 'Unexpected error while archiving employee' });
  }
});

// DELETE employee
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Get employee info before deletion
    const [employeeRows] = await pool.execute<DbEmployee[]>(
      'SELECT full_name, employee_id FROM employees WHERE id = ?',
      [id]
    );
    const employee = employeeRows[0];

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const [result] = await pool.execute(
      'DELETE FROM employees WHERE id = ?',
      [id]
    );

    const affectedRows = (result as any).affectedRows;
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Log activity
    await logActivity({
      userName: req.body.deletedBy || 'System',
      actionType: 'DELETE',
      resourceType: 'Employee',
      resourceId: id,
      resourceName: employee.full_name,
      description: `Employee ${employee.full_name} (${employee.employee_id}) was deleted`,
      ipAddress: getClientIp(req),
      status: 'success',
      metadata: { employeeId: employee.employee_id },
    });

    return res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee', error);
    
    // Log failed activity
    await logActivity({
      userName: req.body.deletedBy || 'System',
      actionType: 'DELETE',
      resourceType: 'Employee',
      resourceId: id,
      description: `Failed to delete employee: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });

    return res.status(500).json({ message: 'Unexpected error while deleting employee' });
  }
});

// Admin Password Reset - Reset employee password and require them to change it
router.patch('/:id/reset-password', async (req, res) => {
  try {
    const employeeId = req.params.id;

    // Get employee info
    const [employeeRows] = await pool.execute<DbEmployee[]>(
      `SELECT id, employee_id, email, full_name FROM employees WHERE id = ? LIMIT 1`,
      [employeeId],
    );

    const employee = employeeRows[0];
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Generate a temporary password (in production, use a secure random generator)
    const tempPassword = `Temp${employee.employee_id}${Date.now().toString().slice(-4)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update password in employees table
    await pool.execute(
      `UPDATE employees SET password_hash = ? WHERE id = ?`,
      [hashedPassword, employeeId],
    );

    // Update password in users table and set password_reset_required flag
    await pool.execute(
      `UPDATE users 
       SET password_hash = ?, password_reset_required = TRUE 
       WHERE employee_id = ? OR email = ?`,
      [hashedPassword, employee.employee_id, employee.email],
    );

    // Log activity
    await logActivity({
      userName: req.body.resetBy || 'Admin',
      actionType: 'UPDATE',
      resourceType: 'Employee',
      resourceId: employeeId,
      resourceName: employee.full_name,
      description: `Password reset for employee ${employee.full_name} (${employee.employee_id})`,
      ipAddress: getClientIp(req),
      status: 'success',
      metadata: { employeeId: employee.employee_id, action: 'password_reset' },
    });

    return res.json({
      message: 'Password reset successfully. Employee must change password on next login.',
      temporaryPassword: tempPassword, // In production, send this via secure channel
    });
  } catch (error) {
    console.error('Error resetting password', error);
    return res.status(500).json({ message: 'Unexpected error while resetting password' });
  }
});

export default router;

