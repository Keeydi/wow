import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { supabase } from '../db';
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
    let query = supabase
      .from('employees')
      .select('id, employee_id, first_name, middle_name, last_name, suffix_name, full_name, department, position, email, phone, date_of_birth, address, gender, civil_status, date_hired, date_of_leaving, employment_type, role, sss_number, pagibig_number, tin_number, emergency_contact, educational_background, signature_file, pds_file, service_record_file, registered_face_file, password_hash, status, archived_reason, archived_at, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (status === 'active' || status === 'inactive') {
      query = query.eq('status', status);
    }

    if (employeeId && typeof employeeId === 'string') {
      query = query.eq('employee_id', employeeId);
    }

    const { data: rows, error } = await query;

    if (error) {
      throw error;
    }

    return res.json({
      data: (rows || []).map(mapEmployeeRow),
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
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert employee
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .insert({
        employee_id: employeeId,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        suffix_name: suffixName,
        full_name: normalizedFullName,
        department,
        position,
        email,
        phone,
        date_of_birth: dateOfBirth || null,
        address: address || null,
        gender: gender || null,
        civil_status: civilStatus || null,
        date_hired: dateHired,
        date_of_leaving: dateOfLeaving || null,
        employment_type: employmentType,
        role: role || null,
        sss_number: sssNumber || null,
        pagibig_number: pagibigNumber || null,
        tin_number: tinNumber || null,
        emergency_contact: emergencyContact || null,
        educational_background: educationalBackground || null,
        signature_file: signatureFile || null,
        pds_file: pdsFile || null,
        service_record_file: serviceRecordFile || null,
        registered_face_file: registeredFaceFile || null,
        password_hash: hashedPassword,
        status: 'active',
      })
      .select('id')
      .single();

    if (employeeError) {
      throw employeeError;
    }

    const insertId = employeeData?.id;

    // Check if user already exists
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${employeeId},email.eq.${email},employee_id.eq.${employeeId}`)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      // Update existing user
      await supabase
        .from('users')
        .update({
          email,
          employee_id: employeeId,
          full_name: normalizedFullName,
          role: normalizeRole(role),
          password_hash: hashedPassword,
        })
        .eq('id', existingUsers[0].id);
    } else {
      // Create new user
      await supabase
        .from('users')
        .insert({
          username: employeeId,
          email,
          employee_id: employeeId,
          full_name: normalizedFullName,
          role: normalizeRole(role),
          password_hash: hashedPassword,
        });
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
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // Build update object with only provided fields
    const updateData: any = {};
    if (employeeId !== undefined) updateData.employee_id = employeeId;
    if (firstName !== undefined) updateData.first_name = firstName;
    if (middleName !== undefined) updateData.middle_name = middleName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (suffixName !== undefined) updateData.suffix_name = suffixName;
    if (derivedFullName) updateData.full_name = derivedFullName;
    if (department !== undefined) updateData.department = department;
    if (position !== undefined) updateData.position = position;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (dateOfBirth !== undefined) updateData.date_of_birth = dateOfBirth;
    if (address !== undefined) updateData.address = address;
    if (gender !== undefined) updateData.gender = gender;
    if (civilStatus !== undefined) updateData.civil_status = civilStatus;
    if (dateHired !== undefined) updateData.date_hired = dateHired;
    if (dateOfLeaving !== undefined) updateData.date_of_leaving = dateOfLeaving;
    if (employmentType !== undefined) updateData.employment_type = employmentType;
    if (role !== undefined) updateData.role = role;
    if (sssNumber !== undefined) updateData.sss_number = sssNumber;
    if (pagibigNumber !== undefined) updateData.pagibig_number = pagibigNumber;
    if (tinNumber !== undefined) updateData.tin_number = tinNumber;
    if (emergencyContact !== undefined) updateData.emergency_contact = emergencyContact;
    if (educationalBackground !== undefined) updateData.educational_background = educationalBackground;
    if (signatureFile !== undefined) updateData.signature_file = signatureFile;
    if (pdsFile !== undefined) updateData.pds_file = pdsFile;
    if (serviceRecordFile !== undefined) updateData.service_record_file = serviceRecordFile;
    if (registeredFaceFile !== undefined) updateData.registered_face_file = registeredFaceFile;
    if (hashedPassword) updateData.password_hash = hashedPassword;
    if (status !== undefined) updateData.status = status;

    const { error: updateError } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', req.params.id);

    if (updateError) {
      throw updateError;
    }

    const { data: updatedEmployee, error: fetchError } = await supabase
      .from('employees')
      .select('id, full_name, employee_id, email, role, password_hash')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !updatedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (updatedEmployee.password_hash) {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', updatedEmployee.employee_id)
        .single();

      if (existingUser) {
        // Update existing user
        await supabase
          .from('users')
          .update({
            email: updatedEmployee.email,
            employee_id: updatedEmployee.employee_id,
            full_name: updatedEmployee.full_name,
            role: normalizeRole(updatedEmployee.role),
            password_hash: updatedEmployee.password_hash,
          })
          .eq('id', existingUser.id);
      } else {
        // Insert new user
        await supabase
          .from('users')
          .insert({
            username: updatedEmployee.employee_id,
            email: updatedEmployee.email,
            employee_id: updatedEmployee.employee_id,
            full_name: updatedEmployee.full_name,
            role: normalizeRole(updatedEmployee.role),
            password_hash: updatedEmployee.password_hash,
          });
      }
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
    await supabase
      .from('employees')
      .update({
        status: 'inactive',
        archived_reason: parseResult.data.reason,
        archived_at: new Date().toISOString(),
      })
      .eq('id', req.params.id);

    // Get employee info for logging
    const { data: employeeData } = await supabase
      .from('employees')
      .select('full_name, employee_id')
      .eq('id', req.params.id)
      .single();
    const employee = employeeData as { full_name: string; employee_id: string } | null;

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
    const { data: employeeData } = await supabase
      .from('employees')
      .select('full_name, employee_id')
      .eq('id', id)
      .single();

    if (!employeeData) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employee = employeeData as { full_name: string; employee_id: string };

    const { error: deleteError } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
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
    const { data: employeeData, error: fetchError } = await supabase
      .from('employees')
      .select('id, employee_id, email, full_name')
      .eq('id', employeeId)
      .single();

    if (fetchError || !employeeData) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employee = employeeData as DbEmployee;

    // Generate a temporary password (in production, use a secure random generator)
    const tempPassword = `Temp${employee.employee_id}${Date.now().toString().slice(-4)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update password in employees table
    await supabase
      .from('employees')
      .update({ password_hash: hashedPassword })
      .eq('id', employeeId);

    // Update password in users table and set password_reset_required flag
    await supabase
      .from('users')
      .update({ password_hash: hashedPassword, password_reset_required: true })
      .or(`employee_id.eq.${employee.employee_id},email.eq.${employee.email}`);

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

