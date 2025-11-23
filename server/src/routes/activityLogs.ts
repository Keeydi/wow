import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../db';

const router = Router();

interface DbActivityLog {
  id: number;
  user_id: number | null;
  user_name: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  description: string | null;
  ip_address: string | null;
  status: 'success' | 'failed' | 'warning';
  metadata: string | null;
  created_at: string;
}

const activityLogSchema = z.object({
  userId: z.number().optional().nullable(),
  userName: z.string().min(1, 'User name is required'),
  actionType: z.string().min(1, 'Action type is required'),
  resourceType: z.string().min(1, 'Resource type is required'),
  resourceId: z.string().optional().nullable(),
  resourceName: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  status: z.enum(['success', 'failed', 'warning']).default('success'),
  metadata: z.record(z.any()).optional().nullable(),
});

const mapActivityLogRow = (row: DbActivityLog) => ({
  id: String(row.id),
  userId: row.user_id ? String(row.user_id) : null,
  userName: row.user_name,
  actionType: row.action_type,
  resourceType: row.resource_type,
  resourceId: row.resource_id || null,
  resourceName: row.resource_name || null,
  description: row.description || null,
  ipAddress: row.ip_address || null,
  status: row.status,
  metadata: row.metadata ? JSON.parse(row.metadata) : null,
  createdAt: row.created_at,
});

// GET all activity logs (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { limit = '50', offset = '0', actionType, resourceType, status, userId } = req.query;
    
    let query = supabase
      .from('activity_logs')
      .select('id, user_id, user_name, action_type, resource_type, resource_id, resource_name, description, ip_address, status, metadata, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string, 10), parseInt(offset as string, 10) + parseInt(limit as string, 10) - 1);

    if (actionType) {
      query = query.eq('action_type', actionType as string);
    }
    if (resourceType) {
      query = query.eq('resource_type', resourceType as string);
    }
    if (status) {
      query = query.eq('status', status as string);
    }
    if (userId) {
      query = query.eq('user_id', userId as string);
    }

    const { data: rows, count, error } = await query;

    if (error) {
      throw error;
    }

    const total = count || 0;

    return res.json({
      data: (rows || []).map(mapActivityLogRow),
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error('Error fetching activity logs', error);
    return res.status(500).json({ message: 'Unexpected error while fetching activity logs' });
  }
});

// GET recent activity logs (for dashboard)
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    
    const { data: rows, error } = await supabase
      .from('activity_logs')
      .select('id, user_id, user_name, action_type, resource_type, resource_id, resource_name, description, ip_address, status, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return res.json({
      data: (rows || []).map(mapActivityLogRow),
    });
  } catch (error) {
    console.error('Error fetching recent activity logs', error);
    return res.status(500).json({ message: 'Unexpected error while fetching recent activity logs' });
  }
});

// POST create activity log
router.post('/', async (req, res) => {
  const parseResult = activityLogSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const {
    userId,
    userName,
    actionType,
    resourceType,
    resourceId,
    resourceName,
    description,
    ipAddress,
    status,
    metadata,
  } = parseResult.data;

  try {
    const { data: newLog, error: insertError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId || null,
        user_name: userName,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: resourceId || null,
        resource_name: resourceName || null,
        description: description || null,
        ip_address: ipAddress || null,
        status,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .select('id, user_id, user_name, action_type, resource_type, resource_id, resource_name, description, ip_address, status, metadata, created_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    return res.status(201).json({
      message: 'Activity log created successfully',
      data: mapActivityLogRow(newLog as DbActivityLog),
    });
  } catch (error) {
    console.error('Error creating activity log', error);
    return res.status(500).json({ message: 'Unexpected error while creating activity log' });
  }
});

export default router;







