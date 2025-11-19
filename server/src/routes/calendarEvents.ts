import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { RowDataPacket } from 'mysql2';
import { logActivity, getClientIp } from '../utils/activityLogger';

const router = Router();

interface DbCalendarEvent extends RowDataPacket {
  id: number;
  title: string;
  type: 'reminder' | 'event';
  description: string | null;
  event_date: string;
  event_time: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const calendarEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  type: z.enum(['reminder', 'event']).default('reminder'),
  description: z.string().optional().nullable(),
  eventDate: z.string().min(1, 'Event date is required'),
  eventTime: z.string().optional().nullable(),
  createdBy: z.string().optional().nullable(),
});

const mapCalendarEventRow = (row: DbCalendarEvent) => ({
  id: String(row.id),
  title: row.title,
  type: row.type,
  description: row.description || '',
  eventDate: row.event_date,
  eventTime: row.event_time || null,
  createdBy: row.created_by || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// GET all calendar events (optionally filtered by date range)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, month, year } = req.query;
    
    let query = 'SELECT id, title, type, description, event_date, event_time, created_by, created_at, updated_at FROM calendar_events';
    const params: any[] = [];
    const conditions: string[] = [];

    if (startDate && endDate) {
      conditions.push('event_date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    } else if (month && year) {
      // Get events for a specific month
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0).toISOString().split('T')[0];
      conditions.push('event_date BETWEEN ? AND ?');
      params.push(start, endDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY event_date ASC, created_at ASC';

    const [rows] = await pool.execute<DbCalendarEvent[]>(query, params);

    return res.json({
      data: rows.map(mapCalendarEventRow),
    });
  } catch (error) {
    console.error('Error fetching calendar events', error);
    return res.status(500).json({ message: 'Unexpected error while fetching calendar events' });
  }
});

// GET calendar event by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute<DbCalendarEvent[]>(
      'SELECT id, title, type, description, event_date, event_time, created_by, created_at, updated_at FROM calendar_events WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Calendar event not found' });
    }

    return res.json({
      data: mapCalendarEventRow(rows[0]),
    });
  } catch (error) {
    console.error('Error fetching calendar event', error);
    return res.status(500).json({ message: 'Unexpected error while fetching calendar event' });
  }
});

// POST create calendar event
router.post('/', async (req, res) => {
  const parseResult = calendarEventSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const { title, type, description, eventDate, eventTime, createdBy } = parseResult.data;

  try {
    const [result] = await pool.execute(
      'INSERT INTO calendar_events (title, type, description, event_date, event_time, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title, type, description || null, eventDate, eventTime || null, createdBy || null]
    );

    const insertId = (result as any).insertId;
    const [rows] = await pool.execute<DbCalendarEvent[]>(
      'SELECT id, title, type, description, event_date, event_time, created_by, created_at, updated_at FROM calendar_events WHERE id = ?',
      [insertId]
    );

    // Log activity
    await logActivity({
      userName: createdBy || 'System',
      actionType: 'CREATE',
      resourceType: 'CalendarEvent',
      resourceId: String(insertId),
      resourceName: title,
      description: `${type === 'event' ? 'Event' : 'Reminder'} "${title}" was created for ${eventDate}${eventTime ? ` at ${eventTime}` : ''}`,
      ipAddress: getClientIp(req),
      status: 'success',
      metadata: { type, eventDate, eventTime },
    });

    // Create notification if it's an event (not a reminder)
    if (type === 'event') {
      try {
        const notificationDescription = description 
          ? `${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`
          : `Event scheduled for ${new Date(eventDate).toLocaleDateString()}${eventTime ? ` at ${eventTime}` : ''}`;
        
        await pool.execute(
          'INSERT INTO notifications (title, description, type, related_id) VALUES (?, ?, ?, ?)',
          [title, notificationDescription, 'event', String(insertId)]
        );
      } catch (notifError) {
        console.error('Error creating notification for event', notifError);
        // Don't fail the request if notification creation fails
      }
    }

    return res.status(201).json({
      message: 'Calendar event created successfully',
      data: mapCalendarEventRow(rows[0]),
    });
  } catch (error) {
    console.error('Error creating calendar event', error);
    await logActivity({
      userName: createdBy || 'System',
      actionType: 'CREATE',
      resourceType: 'CalendarEvent',
      resourceName: title,
      description: `Failed to create ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });
    return res.status(500).json({ message: 'Unexpected error while creating calendar event' });
  }
});

// PUT update calendar event
router.put('/:id', async (req, res) => {
  const parseResult = calendarEventSchema.partial().safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    });
  }

  const { title, type, description, eventDate, eventTime, createdBy } = parseResult.data;
  const { id } = req.params;

  try {
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(type);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (eventDate !== undefined) {
      updateFields.push('event_date = ?');
      updateValues.push(eventDate);
    }
    if (eventTime !== undefined) {
      updateFields.push('event_time = ?');
      updateValues.push(eventTime);
    }
    if (createdBy !== undefined) {
      updateFields.push('created_by = ?');
      updateValues.push(createdBy);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateValues.push(id);

    await pool.execute(
      `UPDATE calendar_events SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const [rows] = await pool.execute<DbCalendarEvent[]>(
      'SELECT id, title, type, description, event_date, event_time, created_by, created_at, updated_at FROM calendar_events WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Calendar event not found' });
    }

    // Log activity
    await logActivity({
      userName: createdBy || rows[0].created_by || 'System',
      actionType: 'UPDATE',
      resourceType: 'CalendarEvent',
      resourceId: id,
      resourceName: title || rows[0].title,
      description: `Calendar ${rows[0].type} "${rows[0].title}" was updated`,
      ipAddress: getClientIp(req),
      status: 'success',
    });

    return res.json({
      message: 'Calendar event updated successfully',
      data: mapCalendarEventRow(rows[0]),
    });
  } catch (error) {
    console.error('Error updating calendar event', error);
    await logActivity({
      userName: createdBy || 'System',
      actionType: 'UPDATE',
      resourceType: 'CalendarEvent',
      resourceId: id,
      description: `Failed to update calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });
    return res.status(500).json({ message: 'Unexpected error while updating calendar event' });
  }
});

// DELETE calendar event
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Get event info before deletion
    const [eventRows] = await pool.execute<DbCalendarEvent[]>(
      'SELECT title, type, created_by FROM calendar_events WHERE id = ?',
      [id]
    );
    const event = eventRows[0];

    const [result] = await pool.execute(
      'DELETE FROM calendar_events WHERE id = ?',
      [id]
    );

    const affectedRows = (result as any).affectedRows;
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Calendar event not found' });
    }

    // Log activity
    await logActivity({
      userName: req.body.deletedBy || event?.created_by || 'System',
      actionType: 'DELETE',
      resourceType: 'CalendarEvent',
      resourceId: id,
      resourceName: event?.title || 'Unknown',
      description: `${event?.type === 'event' ? 'Event' : 'Reminder'} "${event?.title || 'Unknown'}" was deleted`,
      ipAddress: getClientIp(req),
      status: 'success',
    });

    return res.json({ message: 'Calendar event deleted successfully' });
  } catch (error) {
    console.error('Error deleting calendar event', error);
    await logActivity({
      userName: req.body.deletedBy || 'System',
      actionType: 'DELETE',
      resourceType: 'CalendarEvent',
      resourceId: id,
      description: `Failed to delete calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });
    return res.status(500).json({ message: 'Unexpected error while deleting calendar event' });
  }
});

export default router;

