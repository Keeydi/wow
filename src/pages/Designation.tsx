import { useState, useEffect } from 'react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Designation } from '@/lib/organizationStorage';
import { useToast } from '@/hooks/use-toast';
import { Search, Pencil, Trash2, Briefcase, ListChecks } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const DesignationPage = () => {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [designationName, setDesignationName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchDesignations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/designations`);
      if (!response.ok) {
        throw new Error('Failed to fetch designations');
      }
      const data = await response.json();
      setDesignations(data.data);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Unable to load designations. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  const handleSave = async () => {
    if (!designationName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Designation name is required" });
      return;
    }

    try {
      setIsSubmitting(true);
      const url = editingId 
        ? `${API_BASE_URL}/designations/${editingId}`
        : `${API_BASE_URL}/designations`;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: designationName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save designation');
      }

      toast({ 
        title: "Success", 
        description: editingId 
          ? "Designation updated successfully" 
          : "Designation added successfully" 
      });
      setDesignationName('');
      setEditingId(null);
      await fetchDesignations();
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Unable to save designation. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (desig: Designation) => {
    setDesignationName(desig.name);
    setEditingId(desig.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this designation?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/designations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete designation');
      }

      toast({ title: "Success", description: "Designation deleted successfully" });
      await fetchDesignations();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Unable to delete designation. Please try again.',
      });
    }
  };

  const handleCancel = () => {
    setDesignationName('');
    setEditingId(null);
  };

  const filteredDesignations = designations.filter(desig =>
    desig.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayoutNew>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Designation Management</h1>
          <p className="text-muted-foreground">Manage job titles and positions</p>
        </div>

        {/* Add/Edit Designation Section */}
        <Card className="border-2 shadow-lg">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Briefcase className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {editingId ? 'Edit Designation' : 'Add New Designation'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {editingId ? 'Update designation information' : 'Create a new job designation'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="max-w-2xl space-y-4">
              <div className="space-y-2">
                <Label htmlFor="designationName" className="text-base font-semibold">
                  Designation Name *
                </Label>
                <Input
                  id="designationName"
                  placeholder="e.g., Software Engineer, Manager, Team Lead"
                  value={designationName}
                  onChange={(e) => setDesignationName(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={handleSave} 
                  disabled={isSubmitting}
                  className="px-8 h-11 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Saving...' : editingId ? 'Update Designation' : 'Add Designation'}
                </Button>
                {editingId && (
                  <Button 
                    variant="outline" 
                    onClick={handleCancel} 
                    className="px-8 h-11"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Designation List Section */}
        <Card className="border-2 shadow-lg">
          <div className="bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-950/30 p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <ListChecks className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Designation List</h3>
                  <p className="text-sm text-muted-foreground">
                    Total: {filteredDesignations.length} designations
                  </p>
                </div>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search designations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-4 px-6 font-semibold text-sm">S.No</th>
                    <th className="text-left py-4 px-6 font-semibold text-sm">Designation Name</th>
                    <th className="text-left py-4 px-6 font-semibold text-sm">Created Date</th>
                    <th className="text-center py-4 px-6 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-muted-foreground">
                        Loading designations...
                      </td>
                    </tr>
                  ) : filteredDesignations.length > 0 ? (
                    filteredDesignations.map((desig, index) => (
                      <tr 
                        key={desig.id} 
                        className="border-t hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-4 px-6 font-medium text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="py-4 px-6 font-medium">
                          {desig.name}
                        </td>
                        <td className="py-4 px-6 text-sm text-muted-foreground">
                          {new Date(desig.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(desig)}
                              className="h-9 gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(desig.id)}
                              className="h-9 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-muted-foreground">
                        No designations found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayoutNew>
  );
};

export default DesignationPage;
