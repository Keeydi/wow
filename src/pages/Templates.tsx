import { useState, useEffect } from 'react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';

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
                      <p className="text-sm text-muted-foreground mt-2">{template.description}</p>
                    )}
                    <Button 
                      size="sm" 
                      className="mt-3 w-full" 
                      variant="outline"
                      onClick={() => {
                        window.open(`${API_BASE_URL}${template.fileUrl}`, '_blank');
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </DashboardLayoutNew>
  );
};

export default Templates;
