import { supabase } from '../db';

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
    await supabase
      .from('activity_logs')
      .insert({
        user_id: data.userId || null,
        user_name: data.userName,
        action_type: data.actionType,
        resource_type: data.resourceType,
        resource_id: data.resourceId || null,
        resource_name: data.resourceName || null,
        description: data.description || null,
        ip_address: data.ipAddress || null,
        status: data.status || 'success',
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      });
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







