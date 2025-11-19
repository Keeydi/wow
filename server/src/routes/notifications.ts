import { Router } from 'express';
import { pool } from '../db';
import { RowDataPacket } from 'mysql2';

const router = Router();

interface DbNotification extends RowDataPacket {
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
  isRead: row.is_read === 1 || row.is_read === true,
  createdAt: row.created_at,
});

// GET all notifications (unread first, then by date)
router.get('/', async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    
    let query = 'SELECT id, title, description, type, related_id, is_read, created_at FROM notifications';
    const params: any[] = [];

    if (unreadOnly === 'true') {
      query += ' WHERE is_read = FALSE';
    }

    query += ' ORDER BY is_read ASC, created_at DESC LIMIT 50';

    const [rows] = await pool.execute<DbNotification[]>(query, params);

    return res.json({
      data: rows.map(mapNotificationRow),
    });
  } catch (error) {
    console.error('Error fetching notifications', error);
    return res.status(500).json({ message: 'Unexpected error while fetching notifications' });
  }
});

// GET unread count
router.get('/unread-count', async (req, res) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM notifications WHERE is_read = FALSE'
    );

    return res.json({
      count: rows[0]?.count || 0,
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
    await pool.execute('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);

    const [rows] = await pool.execute<DbNotification[]>(
      'SELECT id, title, description, type, related_id, is_read, created_at FROM notifications WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.json({
      message: 'Notification marked as read',
      data: mapNotificationRow(rows[0]),
    });
  } catch (error) {
    console.error('Error marking notification as read', error);
    return res.status(500).json({ message: 'Unexpected error while marking notification as read' });
  }
});

// PATCH mark all as read
router.patch('/mark-all-read', async (req, res) => {
  try {
    await pool.execute('UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE');

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
    const [result] = await pool.execute('DELETE FROM notifications WHERE id = ?', [id]);

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
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

