import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { RowDataPacket } from 'mysql2';
import { logActivity, getClientIp } from '../utils/activityLogger';

const router = Router();

interface DbDesignation extends RowDataPacket {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

const designationSchema = z.object({
  name: z.string().min(1, 'Designation name is required').max(120),
});

const mapDesignationRow = (row: DbDesignation) => ({
  id: String(row.id),
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// GET all designations
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute<DbDesignation[]>(
      'SELECT id, name, created_at, updated_at FROM designations ORDER BY name ASC'
    );

    return res.json({
      data: rows.map(mapDesignationRow),
    });
  } catch (error) {
    console.error('Error fetching designations', error);
    return res.status(500).json({ message: 'Unexpected error while fetching designations' });
  }
});

// POST create designation
router.post('/', async (req, res) => {
  const parseResult = designationSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const { name } = parseResult.data;

  try {
    const [result] = await pool.execute(
      'INSERT INTO designations (name) VALUES (?)',
      [name]
    );

    const insertId = (result as any).insertId;
    const [rows] = await pool.execute<DbDesignation[]>(
      'SELECT id, name, created_at, updated_at FROM designations WHERE id = ?',
      [insertId]
    );

    // Log activity
    await logActivity({
      userName: req.body.createdBy || 'System',
      actionType: 'CREATE',
      resourceType: 'Designation',
      resourceId: String(insertId),
      resourceName: name,
      description: `Designation "${name}" was created`,
      ipAddress: getClientIp(req),
      status: 'success',
    });

    return res.status(201).json({
      message: 'Designation created successfully',
      data: mapDesignationRow(rows[0]),
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      await logActivity({
        userName: req.body.createdBy || 'System',
        actionType: 'CREATE',
        resourceType: 'Designation',
        resourceName: name,
        description: `Failed to create designation: Designation with this name already exists`,
        ipAddress: getClientIp(req),
        status: 'failed',
      });
      return res.status(409).json({ message: 'Designation with this name already exists' });
    }
    console.error('Error creating designation', error);
    await logActivity({
      userName: req.body.createdBy || 'System',
      actionType: 'CREATE',
      resourceType: 'Designation',
      resourceName: name,
      description: `Failed to create designation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });
    return res.status(500).json({ message: 'Unexpected error while creating designation' });
  }
});

// PUT update designation
router.put('/:id', async (req, res) => {
  const parseResult = designationSchema.safeParse(req.body);
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
      'UPDATE designations SET name = ? WHERE id = ?',
      [name, id]
    );

    const [rows] = await pool.execute<DbDesignation[]>(
      'SELECT id, name, created_at, updated_at FROM designations WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Designation not found' });
    }

    // Get old name for logging
    const [oldRows] = await pool.execute<DbDesignation[]>(
      'SELECT name FROM designations WHERE id = ?',
      [id]
    );
    const oldName = oldRows[0]?.name;

    // Log activity
    await logActivity({
      userName: req.body.updatedBy || 'System',
      actionType: 'UPDATE',
      resourceType: 'Designation',
      resourceId: id,
      resourceName: name,
      description: `Designation "${oldName || 'Unknown'}" was updated to "${name}"`,
      ipAddress: getClientIp(req),
      status: 'success',
    });

    return res.json({
      message: 'Designation updated successfully',
      data: mapDesignationRow(rows[0]),
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      await logActivity({
        userName: req.body.updatedBy || 'System',
        actionType: 'UPDATE',
        resourceType: 'Designation',
        resourceId: id,
        description: `Failed to update designation: Designation with this name already exists`,
        ipAddress: getClientIp(req),
        status: 'failed',
      });
      return res.status(409).json({ message: 'Designation with this name already exists' });
    }
    console.error('Error updating designation', error);
    await logActivity({
      userName: req.body.updatedBy || 'System',
      actionType: 'UPDATE',
      resourceType: 'Designation',
      resourceId: id,
      description: `Failed to update designation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });
    return res.status(500).json({ message: 'Unexpected error while updating designation' });
  }
});

// DELETE designation
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Get designation name before deletion
    const [desigRows] = await pool.execute<DbDesignation[]>(
      'SELECT name FROM designations WHERE id = ?',
      [id]
    );
    const desigName = desigRows[0]?.name;

    const [result] = await pool.execute(
      'DELETE FROM designations WHERE id = ?',
      [id]
    );

    const affectedRows = (result as any).affectedRows;
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Designation not found' });
    }

    // Log activity
    await logActivity({
      userName: req.body.deletedBy || 'System',
      actionType: 'DELETE',
      resourceType: 'Designation',
      resourceId: id,
      resourceName: desigName || 'Unknown',
      description: `Designation "${desigName || 'Unknown'}" was deleted`,
      ipAddress: getClientIp(req),
      status: 'success',
    });

    return res.json({ message: 'Designation deleted successfully' });
  } catch (error) {
    console.error('Error deleting designation', error);
    await logActivity({
      userName: req.body.deletedBy || 'System',
      actionType: 'DELETE',
      resourceType: 'Designation',
      resourceId: id,
      description: `Failed to delete designation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });
    return res.status(500).json({ message: 'Unexpected error while deleting designation' });
  }
});

export default router;

