import { pool } from '../db';

export interface ActivityLogData {
  userId?: number | null;
  userName: string;
  actionType: string;
  resourceType: string;
  resourceId?: string | null;
  resourceName?: string | null;
  description?: string | null;
  ipAddress?: string | null;
  status?: 'success' | 'failed' | 'warning';
  metadata?: Record<string, any> | null;
}

export const logActivity = async (data: ActivityLogData): Promise<void> => {
  try {
    await pool.execute(
      `INSERT INTO activity_logs 
        (user_id, user_name, action_type, resource_type, resource_id, resource_name,
         description, ip_address, status, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId || null,
        data.userName,
        data.actionType,
        data.resourceType,
        data.resourceId || null,
        data.resourceName || null,
        data.description || null,
        data.ipAddress || null,
        data.status || 'success',
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
  } catch (error) {
    // Don't throw error - logging should not break the main operation
    console.error('Error logging activity:', error);
  }
};

export const getClientIp = (req: any): string | null => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    null
  );
};







