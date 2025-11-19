import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { RowDataPacket } from 'mysql2';
import { logActivity, getClientIp } from '../utils/activityLogger';

const router = Router();

interface DbDepartment extends RowDataPacket {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(120),
});

const mapDepartmentRow = (row: DbDepartment) => ({
  id: String(row.id),
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// GET all departments
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute<DbDepartment[]>(
      'SELECT id, name, created_at, updated_at FROM departments ORDER BY name ASC'
    );

    return res.json({
      data: rows.map(mapDepartmentRow),
    });
  } catch (error) {
    console.error('Error fetching departments', error);
    return res.status(500).json({ message: 'Unexpected error while fetching departments' });
  }
});

// POST create department
router.post('/', async (req, res) => {
  const parseResult = departmentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const { name } = parseResult.data;

  try {
    const [result] = await pool.execute(
      'INSERT INTO departments (name) VALUES (?)',
      [name]
    );

    const insertId = (result as any).insertId;
    const [rows] = await pool.execute<DbDepartment[]>(
      'SELECT id, name, created_at, updated_at FROM departments WHERE id = ?',
      [insertId]
    );

    // Log activity
    await logActivity({
      userName: req.body.createdBy || 'System',
      actionType: 'CREATE',
      resourceType: 'Department',
      resourceId: String(insertId),
      resourceName: name,
      description: `Department "${name}" was created`,
      ipAddress: getClientIp(req),
      status: 'success',
    });

    return res.status(201).json({
      message: 'Department created successfully',
      data: mapDepartmentRow(rows[0]),
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      await logActivity({
        userName: req.body.createdBy || 'System',
        actionType: 'CREATE',
        resourceType: 'Department',
        resourceName: name,
        description: `Failed to create department: Department with this name already exists`,
        ipAddress: getClientIp(req),
        status: 'failed',
      });
      return res.status(409).json({ message: 'Department with this name already exists' });
    }
    console.error('Error creating department', error);
    await logActivity({
      userName: req.body.createdBy || 'System',
      actionType: 'CREATE',
      resourceType: 'Department',
      resourceName: name,
      description: `Failed to create department: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });
    return res.status(500).json({ message: 'Unexpected error while creating department' });
  }
});

// PUT update department
router.put('/:id', async (req, res) => {
  const parseResult = departmentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const { name } = parseResult.data;
  const { id } = req.params;

  try {
    await pool.execute(
      'UPDATE departments SET name = ? WHERE id = ?',
      [name, id]
    );

    const [rows] = await pool.execute<DbDepartment[]>(
      'SELECT id, name, created_at, updated_at FROM departments WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Get old name for logging
    const [oldRows] = await pool.execute<DbDepartment[]>(
      'SELECT name FROM departments WHERE id = ?',
      [id]
    );
    const oldName = oldRows[0]?.name;

    // Log activity
    await logActivity({
      userName: req.body.updatedBy || 'System',
      actionType: 'UPDATE',
      resourceType: 'Department',
      resourceId: id,
      resourceName: name,
      description: `Department "${oldName || 'Unknown'}" was updated to "${name}"`,
      ipAddress: getClientIp(req),
      status: 'success',
    });

    return res.json({
      message: 'Department updated successfully',
      data: mapDepartmentRow(rows[0]),
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      await logActivity({
        userName: req.body.updatedBy || 'System',
        actionType: 'UPDATE',
        resourceType: 'Department',
        resourceId: id,
        description: `Failed to update department: Department with this name already exists`,
        ipAddress: getClientIp(req),
        status: 'failed',
      });
      return res.status(409).json({ message: 'Department with this name already exists' });
    }
    console.error('Error updating department', error);
    await logActivity({
      userName: req.body.updatedBy || 'System',
      actionType: 'UPDATE',
      resourceType: 'Department',
      resourceId: id,
      description: `Failed to update department: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });
    return res.status(500).json({ message: 'Unexpected error while updating department' });
  }
});

// DELETE department
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Get department name before deletion
    const [deptRows] = await pool.execute<DbDepartment[]>(
      'SELECT name FROM departments WHERE id = ?',
      [id]
    );
    const deptName = deptRows[0]?.name;

    const [result] = await pool.execute(
      'DELETE FROM departments WHERE id = ?',
      [id]
    );

    const affectedRows = (result as any).affectedRows;
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Log activity
    await logActivity({
      userName: req.body.deletedBy || 'System',
      actionType: 'DELETE',
      resourceType: 'Department',
      resourceId: id,
      resourceName: deptName || 'Unknown',
      description: `Department "${deptName || 'Unknown'}" was deleted`,
      ipAddress: getClientIp(req),
      status: 'success',
    });

    return res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department', error);
    await logActivity({
      userName: req.body.deletedBy || 'System',
      actionType: 'DELETE',
      resourceType: 'Department',
      resourceId: id,
      description: `Failed to delete department: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });
    return res.status(500).json({ message: 'Unexpected error while deleting department' });
  }
});

export default router;

