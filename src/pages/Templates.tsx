import { useState, useEffect } from 'react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FileText, Download, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface Template {
  id: string;
  name: string;
  category: string;
  fileUrl: string;
  description?: string;
  uploadedAt: string;
}

const Templates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/documents?type=template`);
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        const data = await response.json();
        
        const templatesList: Template[] = data.data.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          category: doc.category || 'Uncategorized',
          fileUrl: doc.fileUrl,
          description: doc.description || undefined,
          uploadedAt: doc.uploadedAt,
        }));
        
        setTemplates(templatesList);
      } catch (error) {
        console.error('Error fetching templates', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleDownload = async (template: Template) => {
    try {
      const response = await fetch(`${API_BASE_URL}${template.fileUrl}`);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = template.name || 'template';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: 'Success',
        description: 'Template downloaded successfully',
      });
    } catch (error) {
      console.error('Download error', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to download template. Please try again.',
      });
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setEditName(template.name);
    setEditCategory(template.category);
    setEditDescription(template.description || '');
    setEditFile(null);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate) return;

    try {
      const formData = new FormData();
      
      if (editFile) {
        formData.append('file', editFile);
      }
      
      formData.append('name', editName);
      formData.append('category', editCategory);
      formData.append('description', editDescription);

      const response = await fetch(`${API_BASE_URL}/documents/${editingTemplate.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update template');
      }

      toast({
        title: 'Success',
        description: 'Template updated successfully',
      });

      setShowEditDialog(false);
      setEditingTemplate(null);
      // Refresh templates
      const refreshResponse = await fetch(`${API_BASE_URL}/documents?type=template`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const templatesList: Template[] = data.data.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          category: doc.category || 'Uncategorized',
          fileUrl: doc.fileUrl,
          description: doc.description || undefined,
          uploadedAt: doc.uploadedAt,
        }));
        setTemplates(templatesList);
      }
    } catch (error) {
      console.error('Update error', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update template. Please try again.',
      });
    }
  };

  const handleDelete = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/documents/${template.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });

      // Refresh templates
      const refreshResponse = await fetch(`${API_BASE_URL}/documents?type=template`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const templatesList: Template[] = data.data.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          category: doc.category || 'Uncategorized',
          fileUrl: doc.fileUrl,
          description: doc.description || undefined,
          uploadedAt: doc.uploadedAt,
        }));
        setTemplates(templatesList);
      }
    } catch (error) {
      console.error('Delete error', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete template. Please try again.',
      });
    }
  };

  return (
    <DashboardLayoutNew>
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Document Templates</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <p className="text-muted-foreground col-span-full text-center py-8">
              Loading templates...
            </p>
          ) : templates.length === 0 ? (
            <p className="text-muted-foreground col-span-full text-center py-8">
              No templates available yet
            </p>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-3">
                  <FileText className="h-8 w-8 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{template.category}</p>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{template.description}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        className="flex-1" 
                        variant="outline"
                        onClick={() => handleDownload(template)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>Update template information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Template name"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                placeholder="Category"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description"
              />
            </div>
            <div>
              <Label>Replace File (Optional)</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setEditFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayoutNew>
  );
};

export default Templates;
