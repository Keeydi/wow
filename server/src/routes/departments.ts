import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { logActivity, getClientIp } from '../utils/activityLogger';

const router = Router();

interface DbDepartment {
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
    const { data: rows, error } = await supabase
      .from('departments')
      .select('id, name, created_at, updated_at')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return res.json({
      data: (rows || []).map(mapDepartmentRow),
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
    const { data: newDepartment, error: insertError } = await supabase
      .from('departments')
      .insert({ name })
      .select('id, name, created_at, updated_at')
      .single();

    if (insertError) {
      throw insertError;
    }

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
      data: mapDepartmentRow(newDepartment as DbDepartment),
    });
  } catch (error: any) {
    if (error.code === '23505' || error.message?.includes('duplicate')) {
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
    // Get old name for logging
    const { data: oldDepartment } = await supabase
      .from('departments')
      .select('name')
      .eq('id', id)
      .single();
    const oldName = oldDepartment?.name;

    const { error: updateError } = await supabase
      .from('departments')
      .update({ name })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    const { data: rows, error: fetchError } = await supabase
      .from('departments')
      .select('id, name, created_at, updated_at')
      .eq('id', id)
      .single();

    if (fetchError || !rows) {
      return res.status(404).json({ message: 'Department not found' });
    }

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
      data: mapDepartmentRow(rows as DbDepartment),
    });
  } catch (error: any) {
    if (error.code === '23505' || error.message?.includes('duplicate')) {
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
    const { data: deptData } = await supabase
      .from('departments')
      .select('name')
      .eq('id', id)
      .single();
    const deptName = deptData?.name;

    const { error: deleteError } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
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

