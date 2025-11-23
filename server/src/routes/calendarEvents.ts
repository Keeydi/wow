import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { logActivity, getClientIp } from '../utils/activityLogger';

const router = Router();

interface DbCalendarEvent {
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
    
    let query = supabase
      .from('calendar_events')
      .select('id, title, type, description, event_date, event_time, created_by, created_at, updated_at')
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (startDate && endDate) {
      query = query.gte('event_date', startDate as string).lte('event_date', endDate as string);
    } else if (month && year) {
      // Get events for a specific month
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDateStr = new Date(parseInt(year as string), parseInt(month as string), 0).toISOString().split('T')[0];
      query = query.gte('event_date', start).lte('event_date', endDateStr);
    }

    const { data: rows, error } = await query;

    if (error) {
      throw error;
    }

    return res.json({
      data: (rows || []).map(mapCalendarEventRow),
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
    const { data: eventData, error } = await supabase
      .from('calendar_events')
      .select('id, title, type, description, event_date, event_time, created_by, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !eventData) {
      return res.status(404).json({ message: 'Calendar event not found' });
    }

    return res.json({
      data: mapCalendarEventRow(eventData as DbCalendarEvent),
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
    const { data: newEvent, error: insertError } = await supabase
      .from('calendar_events')
      .insert({
        title,
        type,
        description: description || null,
        event_date: eventDate,
        event_time: eventTime || null,
        created_by: createdBy || null,
      })
      .select('id, title, type, description, event_date, event_time, created_by, created_at, updated_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    // Log activity
    await logActivity({
      userName: createdBy || 'System',
      actionType: 'CREATE',
      resourceType: 'CalendarEvent',
      resourceId: String(newEvent.id),
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
        
        await supabase
          .from('notifications')
          .insert({
            title,
            description: notificationDescription,
            type: 'event',
            related_id: String(newEvent.id),
          });
      } catch (notifError) {
        console.error('Error creating notification for event', notifError);
        // Don't fail the request if notification creation fails
      }
    }

    return res.status(201).json({
      message: 'Calendar event created successfully',
      data: mapCalendarEventRow(newEvent as DbCalendarEvent),
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
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (eventDate !== undefined) updateData.event_date = eventDate;
    if (eventTime !== undefined) updateData.event_time = eventTime;
    if (createdBy !== undefined) updateData.created_by = createdBy;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const { error: updateError } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    const { data: rows, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id, title, type, description, event_date, event_time, created_by, created_at, updated_at')
      .eq('id', id)
      .single();

    if (fetchError || !rows) {
      return res.status(404).json({ message: 'Calendar event not found' });
    }

    // Log activity
    await logActivity({
      userName: createdBy || rows.created_by || 'System',
      actionType: 'UPDATE',
      resourceType: 'CalendarEvent',
      resourceId: id,
      resourceName: title || rows.title,
      description: `Calendar ${rows.type} "${rows.title}" was updated`,
      ipAddress: getClientIp(req),
      status: 'success',
    });

    return res.json({
      message: 'Calendar event updated successfully',
      data: mapCalendarEventRow(rows as DbCalendarEvent),
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
    const { data: eventData, error: fetchError } = await supabase
      .from('calendar_events')
      .select('title, type, created_by')
      .eq('id', id)
      .single();

    if (fetchError || !eventData) {
      return res.status(404).json({ message: 'Calendar event not found' });
    }

    const event = eventData as DbCalendarEvent;

    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
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

