import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure uploads/logos directory exists
const logosDir = path.join(__dirname, '../uploads/logos/');
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

// Configure multer for logo upload
const upload = multer({
  dest: logosDir,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(jpg|jpeg|png|gif|svg)$/i;
    const extname = allowedTypes.test(path.extname(file.originalname));
    const mimetype = file.mimetype.startsWith('image/');

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  },
});

interface DbSetting {
  id: number;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

const settingsSchema = z.object({
  siteTitle: z.string().optional(),
  description: z.string().optional(),
  copyright: z.string().optional(),
  contactNumber: z.string().optional(),
  systemEmail: z.string().email().optional(),
  address: z.string().optional(),
});

// GET all settings
router.get('/', async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('settings')
      .select('key, value');

    if (error) {
      throw error;
    }

    const settings: Record<string, string> = {};
    (rows || []).forEach((row) => {
      settings[row.key] = row.value;
    });

    return res.json({ data: settings });
  } catch (error) {
    console.error('Error fetching settings', error);
    return res.status(500).json({ message: 'Unexpected error while fetching settings' });
  }
});

// PUT update settings
router.put('/', upload.single('logo'), async (req, res) => {
  try {
    const parseResult = settingsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Invalid request body',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const settings = parseResult.data;

    // Handle logo upload
    if (req.file) {
      const logoUrl = `/uploads/logos/${req.file.filename}`;
      // Check if setting exists
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'logoUrl')
        .single();

      if (existing) {
        await supabase
          .from('settings')
          .update({ value: logoUrl })
          .eq('key', 'logoUrl');
      } else {
        await supabase
          .from('settings')
          .insert({ key: 'logoUrl', value: logoUrl });
      }
    }

    // Update other settings
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        // Check if setting exists
        const { data: existing } = await supabase
          .from('settings')
          .select('id')
          .eq('key', key)
          .single();

        if (existing) {
          await supabase
            .from('settings')
            .update({ value })
            .eq('key', key);
        } else {
          await supabase
            .from('settings')
            .insert({ key, value });
        }
      }
    }

    return res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings', error);
    return res.status(500).json({ message: 'Unexpected error while updating settings' });
  }
});

export default router;

