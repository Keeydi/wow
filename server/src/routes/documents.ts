import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { logActivity, getClientIp } from '../utils/activityLogger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../uploads/'), // Directory to store uploaded files
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document file types
    const allowedTypes = /\.(pdf|doc|docx|xls|xlsx|txt|jpg|jpeg|png)$/i;
    const extname = allowedTypes.test(path.extname(file.originalname));
    const mimetype = allowedTypes.test(file.mimetype) || 
                     file.mimetype === 'application/pdf' ||
                     file.mimetype === 'application/msword' ||
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     file.mimetype === 'application/vnd.ms-excel' ||
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.mimetype === 'text/plain' ||
                     file.mimetype.startsWith('image/');

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, TXT, and image files are allowed.'));
    }
  },
});

interface DbDocument {
  id: number;
  name: string;
  type: 'policy' | 'template' | 'employee-doc' | 'other';
  category: string | null;
  file_path: string;
  file_url: string | null;
  file_size: number | null;
  employee_id: string | null;
  document_type: string | null;
  uploaded_by: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const documentSchema = z.object({
  name: z.string().min(1, 'Document name is required'),
  type: z.enum(['policy', 'template', 'employee-doc', 'other']).default('other'),
  category: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  documentType: z.string().optional().nullable(),
  uploadedBy: z.string().min(1, 'Uploaded by is required'),
  description: z.string().optional().nullable(),
});

const mapDocumentRow = (row: DbDocument) => ({
  id: String(row.id),
  name: row.name,
  type: row.type,
  category: row.category || '',
  fileUrl: row.file_url || row.file_path,
  filePath: row.file_path,
  fileSize: row.file_size ? `${(row.file_size / 1024 / 1024).toFixed(2)} MB` : '0 MB',
  employeeId: row.employee_id || null,
  documentType: row.document_type || null,
  uploadedBy: row.uploaded_by,
  uploadedAt: row.created_at,
  description: row.description || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// GET all documents (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { type, category, employeeId, documentType } = req.query;
    
    let query = supabase
      .from('documents')
      .select('id, name, type, category, file_path, file_url, file_size, employee_id, document_type, uploaded_by, description, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type as string);
    }
    if (category) {
      query = query.eq('category', category as string);
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId as string);
    }
    if (documentType) {
      query = query.eq('document_type', documentType as string);
    }

    const { data: rows, error } = await query;

    if (error) {
      throw error;
    }

    return res.json({
      data: (rows || []).map(mapDocumentRow),
    });
  } catch (error) {
    console.error('Error fetching documents', error);
    return res.status(500).json({ message: 'Unexpected error while fetching documents' });
  }
});

// GET document by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: documentData, error } = await supabase
      .from('documents')
      .select('id, name, type, category, file_path, file_url, file_size, employee_id, document_type, uploaded_by, description, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !documentData) {
      return res.status(404).json({ message: 'Document not found' });
    }

    return res.json({
      data: mapDocumentRow(documentData as DbDocument),
    });
  } catch (error) {
    console.error('Error fetching document by ID', error);
    return res.status(500).json({ message: 'Unexpected error while fetching document' });
  }
});

// POST create document (with file upload)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const parseResult = documentSchema.safeParse({
      name: req.body.name || req.file.originalname,
      type: req.body.type || 'other',
      category: req.body.category || null,
      employeeId: req.body.employeeId || null,
      documentType: req.body.documentType || null,
      uploadedBy: req.body.uploadedBy || 'System',
      description: req.body.description || null,
    });

    if (!parseResult.success) {
      // Delete uploaded file if validation fails
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        message: 'Invalid request body',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const {
      name,
      type,
      category,
      employeeId,
      documentType,
      uploadedBy,
      description,
    } = parseResult.data;

    // Generate file URL (in production, this would be a proper URL)
    const fileUrl = `/uploads/${req.file.filename}`;

    const { data: newDocument, error: insertError } = await supabase
      .from('documents')
      .insert({
        name,
        type,
        category: category || null,
        file_path: req.file.path,
        file_url: fileUrl,
        file_size: req.file.size,
        employee_id: employeeId || null,
        document_type: documentType || null,
        uploaded_by: uploadedBy,
        description: description || null,
      })
      .select('id, name, type, category, file_path, file_url, file_size, employee_id, document_type, uploaded_by, description, created_at, updated_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    // Log activity
    await logActivity({
      userName: uploadedBy,
      actionType: 'CREATE',
      resourceType: 'Document',
      resourceId: String(newDocument.id),
      resourceName: name,
      description: `Document "${name}" was uploaded${employeeId ? ` for employee ${employeeId}` : ''}`,
      ipAddress: getClientIp(req),
      status: 'success',
      metadata: { type, category, fileSize: req.file.size },
    });

    return res.status(201).json({
      message: 'Document uploaded successfully',
      data: mapDocumentRow(newDocument as DbDocument),
    });
  } catch (error) {
    console.error('Error creating document', error);
    
    // Delete uploaded file if database insert fails
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file', unlinkError);
      }
    }

    // Log failed activity
    await logActivity({
      userName: req.body.uploadedBy || 'System',
      actionType: 'CREATE',
      resourceType: 'Document',
      resourceName: req.body.name || req.file?.originalname || 'Unknown',
      description: `Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });

    return res.status(500).json({ message: 'Unexpected error while uploading document' });
  }
});

// PUT update document
router.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description } = req.body;

    // Get existing document
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingDoc) {
      return res.status(404).json({ message: 'Document not found' });
    }
    let fileUrl = existingDoc.file_url;
    let filePath = existingDoc.file_path;
    let fileSize = existingDoc.file_size;

    // If new file is uploaded, replace the old one
    if (req.file) {
      // Delete old file
      if (existingDoc.file_path && fs.existsSync(existingDoc.file_path)) {
        try {
          fs.unlinkSync(existingDoc.file_path);
        } catch (unlinkError) {
          console.error('Error deleting old file', unlinkError);
        }
      }

      fileUrl = `/uploads/${req.file.filename}`;
      filePath = req.file.path;
      fileSize = req.file.size;
    }

    // Update document
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        name: name || existingDoc.name,
        category: category !== undefined ? category : existingDoc.category,
        description: description !== undefined ? description : existingDoc.description,
        file_url: fileUrl,
        file_path: filePath,
        file_size: fileSize,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Get updated document
    const { data: updatedRows, error: fetchUpdatedError } = await supabase
      .from('documents')
      .select('id, name, type, category, file_path, file_url, file_size, employee_id, document_type, uploaded_by, description, created_at, updated_at')
      .eq('id', id)
      .single();

    if (fetchUpdatedError || !updatedRows) {
      throw fetchUpdatedError;
    }

    return res.json({
      message: 'Document updated successfully',
      data: mapDocumentRow(updatedRows as DbDocument),
    });
  } catch (error) {
    console.error('Error updating document', error);
    return res.status(500).json({ message: 'Unexpected error while updating document' });
  }
});

// DELETE document
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get document info before deletion
    const { data: docData, error: fetchError } = await supabase
      .from('documents')
      .select('name, file_path, uploaded_by')
      .eq('id', id)
      .single();

    if (fetchError || !docData) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const doc = docData as DbDocument;

    // Delete file from filesystem
    if (doc.file_path && fs.existsSync(doc.file_path)) {
      try {
        fs.unlinkSync(doc.file_path);
      } catch (unlinkError) {
        console.error('Error deleting file from filesystem', unlinkError);
        // Continue with database deletion even if file deletion fails
      }
    }

    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    // Log activity
    await logActivity({
      userName: req.body.deletedBy || doc.uploaded_by || 'System',
      actionType: 'DELETE',
      resourceType: 'Document',
      resourceId: id,
      resourceName: doc.name,
      description: `Document "${doc.name}" was deleted`,
      ipAddress: getClientIp(req),
      status: 'success',
    });

    return res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document', error);
    
    // Log failed activity
    await logActivity({
      userName: req.body.deletedBy || 'System',
      actionType: 'DELETE',
      resourceType: 'Document',
      resourceId: req.params.id,
      description: `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: getClientIp(req),
      status: 'failed',
    });

    return res.status(500).json({ message: 'Unexpected error while deleting document' });
  }
});

export default router;

