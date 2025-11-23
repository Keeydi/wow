import { Router } from 'express';
import { supabase } from '../db';

const router = Router();

interface DbNotification {
  id: number;
  title: string;
  description: string | null;
  type: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

const mapNotificationRow = (row: DbNotification) => ({
  id: String(row.id),
  title: row.title,
  description: row.description || '',
  type: row.type,
  relatedId: row.related_id || null,
  isRead: row.is_read === true,
  createdAt: row.created_at,
});

// GET all notifications (unread first, then by date)
router.get('/', async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    
    let query = supabase
      .from('notifications')
      .select('id, title, description, type, related_id, is_read, created_at')
      .order('is_read', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly === 'true') {
      query = query.eq('is_read', false);
    }

    const { data: rows, error } = await query;

    if (error) {
      throw error;
    }

    return res.json({
      data: (rows || []).map(mapNotificationRow),
    });
  } catch (error) {
    console.error('Error fetching notifications', error);
    return res.status(500).json({ message: 'Unexpected error while fetching notifications' });
  }
});

// GET unread count
router.get('/unread-count', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    if (error) {
      throw error;
    }

    return res.json({
      count: count || 0,
    });
  } catch (error) {
    console.error('Error fetching unread count', error);
    return res.status(500).json({ message: 'Unexpected error while fetching unread count' });
  }
});

// PATCH mark notification as read
router.patch('/:id/read', async (req, res) => {
  const { id } = req.params;

  try {
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    const { data: notificationData, error: fetchError } = await supabase
      .from('notifications')
      .select('id, title, description, type, related_id, is_read, created_at')
      .eq('id', id)
      .single();

    if (fetchError || !notificationData) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.json({
      message: 'Notification marked as read',
      data: mapNotificationRow(notificationData as DbNotification),
    });
  } catch (error) {
    console.error('Error marking notification as read', error);
    return res.status(500).json({ message: 'Unexpected error while marking notification as read' });
  }
});

// PATCH mark all as read
router.patch('/mark-all-read', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) {
      throw error;
    }

    return res.json({
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking all notifications as read', error);
    return res.status(500).json({ message: 'Unexpected error while marking all notifications as read' });
  }
});

// DELETE notification
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return res.json({
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting notification', error);
    return res.status(500).json({ message: 'Unexpected error while deleting notification' });
  }
});

export default router;

