import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { logActivity, getClientIp } from '../utils/activityLogger';

const router = Router();

interface DbDesignation {
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
    const { data: rows, error } = await supabase
      .from('designations')
      .select('id, name, created_at, updated_at')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return res.json({
      data: (rows || []).map(mapDesignationRow),
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
    const { data: newDesignation, error: insertError } = await supabase
      .from('designations')
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
      resourceType: 'Designation',
      resourceId: String(insertId),
      resourceName: name,
      description: `Designation "${name}" was created`,
      ipAddress: getClientIp(req),
      status: 'success',
    });

    return res.status(201).json({
      message: 'Designation created successfully',
      data: mapDesignationRow(newDesignation as DbDesignation),
    });
  } catch (error: any) {
    if (error.code === '23505' || error.message?.includes('duplicate')) {
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
    // Get old name for logging
    const { data: oldDesignation } = await supabase
      .from('designations')
      .select('name')
      .eq('id', id)
      .single();
    const oldName = oldDesignation?.name;

    const { error: updateError } = await supabase
      .from('designations')
      .update({ name })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    const { data: rows, error: fetchError } = await supabase
      .from('designations')
      .select('id, name, created_at, updated_at')
      .eq('id', id)
      .single();

    if (fetchError || !rows) {
      return res.status(404).json({ message: 'Designation not found' });
    }

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
      data: mapDesignationRow(rows as DbDesignation),
    });
  } catch (error: any) {
    if (error.code === '23505' || error.message?.includes('duplicate')) {
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
    const { data: desigData } = await supabase
      .from('designations')
      .select('name')
      .eq('id', id)
      .single();
    const desigName = desigData?.name;

    const { error: deleteError } = await supabase
      .from('designations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
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

