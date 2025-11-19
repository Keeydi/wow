import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { RowDataPacket } from 'mysql2';

const router = Router();

interface DbActivityLog extends RowDataPacket {
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
    
    let query = `
      SELECT id, user_id, user_name, action_type, resource_type, resource_id, resource_name,
             description, ip_address, status, metadata, created_at
      FROM activity_logs
      WHERE 1=1
    `;
    const params: any[] = [];

    if (actionType) {
      query += ' AND action_type = ?';
      params.push(actionType);
    }
    if (resourceType) {
      query += ' AND resource_type = ?';
      params.push(resourceType);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

    const [rows] = await pool.execute<DbActivityLog[]>(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM activity_logs WHERE 1=1';
    const countParams: any[] = [];
    if (actionType) {
      countQuery += ' AND action_type = ?';
      countParams.push(actionType);
    }
    if (resourceType) {
      countQuery += ' AND resource_type = ?';
      countParams.push(resourceType);
    }
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (userId) {
      countQuery += ' AND user_id = ?';
      countParams.push(userId);
    }

    const [countRows] = await pool.execute<RowDataPacket[]>(countQuery, countParams);
    const total = countRows[0]?.total || 0;

    return res.json({
      data: rows.map(mapActivityLogRow),
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
    
    const [rows] = await pool.execute<DbActivityLog[]>(
      `SELECT id, user_id, user_name, action_type, resource_type, resource_id, resource_name,
              description, ip_address, status, metadata, created_at
       FROM activity_logs
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );

    return res.json({
      data: rows.map(mapActivityLogRow),
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
    const [result] = await pool.execute(
      `INSERT INTO activity_logs 
        (user_id, user_name, action_type, resource_type, resource_id, resource_name,
         description, ip_address, status, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        userName,
        actionType,
        resourceType,
        resourceId || null,
        resourceName || null,
        description || null,
        ipAddress || null,
        status,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    const insertId = (result as any).insertId;
    const [rows] = await pool.execute<DbActivityLog[]>(
      `SELECT id, user_id, user_name, action_type, resource_type, resource_id, resource_name,
              description, ip_address, status, metadata, created_at
       FROM activity_logs WHERE id = ?`,
      [insertId]
    );

    return res.status(201).json({
      message: 'Activity log created successfully',
      data: mapActivityLogRow(rows[0]),
    });
  } catch (error) {
    console.error('Error creating activity log', error);
    return res.status(500).json({ message: 'Unexpected error while creating activity log' });
  }
});

export default router;







