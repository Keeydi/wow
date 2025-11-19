import { useState, useEffect } from 'react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { employeeStorage } from '@/lib/employeeStorage';
import { Employee } from '@/types/employee';
import { Department, Designation } from '@/lib/organizationStorage';
import { Search, RotateCcw, Users, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const roleOptions = ['Employee', 'Manager', 'Admin', 'Contractor'];

const addInactiveDefault = {
  firstName: '',
  lastName: '',
  employeeId: '',
  department: '',
  designation: '',
  role: '',
  dateOfJoining: '',
  dateOfLeaving: '',
  reason: '',
  retire: '',
  deactivationDate: '',
  reactivationDate: '',
  uploadImage: '',
  serviceRecord: '',
  personalDataSheet: '',
  employmentRecord: '',
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const InactiveEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState(addInactiveDefault);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/departments`);
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      const data = await response.json();
      setDepartments(data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDesignations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/designations`);
      if (!response.ok) {
        throw new Error('Failed to fetch designations');
      }
      const data = await response.json();
      setDesignations(data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const mapEmployee = (employee: any): Employee => ({
    id: employee.id,
    employeeId: employee.employeeId,
    firstName: employee.firstName || '',
    lastName: employee.lastName || '',
    fullName: employee.fullName,
    department: employee.department,
    position: employee.position,
    email: employee.email,
    phone: employee.phone,
    dateOfBirth: employee.dateOfBirth || '',
    address: employee.address || '',
    gender: employee.gender || '',
    civilStatus: employee.civilStatus || '',
    dateHired: employee.dateHired,
    dateOfLeaving: employee.dateOfLeaving || '',
    employmentType: employee.employmentType || 'Regular',
    role: employee.role || '',
    sssNumber: employee.sssNumber || '',
    pagibigNumber: employee.pagibigNumber || '',
    tinNumber: employee.tinNumber || '',
    emergencyContact: employee.emergencyContact || '',
    educationalBackground: employee.educationalBackground || '',
    signatureFile: employee.signatureFile || '',
    pdsFile: employee.pdsFile || '',
    serviceRecordFile: employee.serviceRecordFile || '',
    registeredFaceFile: employee.registeredFaceFile || '',
    status: employee.status,
    archivedReason: employee.archivedReason || undefined,
    archivedDate: employee.archivedAt || undefined,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  });

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      // Only fetch inactive employees
      const response = await fetch(`${API_BASE_URL}/employees?status=inactive`);
      if (!response.ok) {
        throw new Error('Failed to fetch inactive employees');
      }
      const data = await response.json();
      setEmployees(data.data.map(mapEmployee));
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Unable to load inactive employees. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchDesignations();
  }, []);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleRestore = async () => {
    if (!selectedEmployee) return;

    try {
      setIsSubmitting(true);
      // Update employee status to 'active' via API
      const response = await fetch(`${API_BASE_URL}/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'active',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to restore employee');
      }

      // Refresh the inactive employees list
      await fetchEmployees();
      setShowRestoreDialog(false);
      setSelectedEmployee(null);
      
      toast({
        title: 'Success',
        description: 'Employee restored successfully. They will now appear in the active employees list.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unable to restore employee. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleAddInactive = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!addForm.firstName.trim()) errors.firstName = 'Required';
    if (!addForm.lastName.trim()) errors.lastName = 'Required';
    if (!addForm.employeeId.trim()) errors.employeeId = 'Required';
    if (!addForm.department) errors.department = 'Required';
    if (!addForm.designation) errors.designation = 'Required';

    setAddErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: addForm.employeeId.trim(),
          firstName: addForm.firstName.trim(),
          lastName: addForm.lastName.trim(),
          fullName: `${addForm.firstName.trim()} ${addForm.lastName.trim()}`.trim(),
          department: addForm.department,
          position: addForm.designation,
          email: `${addForm.employeeId.toLowerCase()}@inactive.local`,
          phone: '',
          dateOfBirth: '1990-01-01',
          address: addForm.reason || 'No address provided',
          dateHired: addForm.dateOfJoining || new Date().toISOString().slice(0, 10),
          status: 'inactive',
          archivedReason: addForm.reason || (addForm.retire === 'yes' ? 'Retired' : 'Inactive'),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add inactive employee');
      }

      // Refresh the inactive employees list
      await fetchEmployees();
      setAddForm(addInactiveDefault);
      setAddErrors({});
      setShowAddDialog(false);

      toast({
        title: 'Inactive employee added',
        description: 'Record stored in inactive employees list.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unable to add inactive employee. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (field: keyof typeof addForm, files: FileList | null) => {
    if (!files || !files[0]) {
      setAddForm(prev => ({ ...prev, [field]: '' }));
      return;
    }
    setAddForm(prev => ({ ...prev, [field]: files[0].name }));
  };

  const Field = ({
    label,
    className = '',
    error,
    children,
  }: {
    label: string;
    className?: string;
    error?: string;
    children: React.ReactNode;
  }) => (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );

  return (
    <DashboardLayoutNew>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Inactive Employees</h1>
            <p className="text-muted-foreground">View and manage inactive employee records</p>
          </div>
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4" />
            Add Inactive Employee
          </Button>
        </div>

        {/* Inactive Employee List Card */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">Inactive Employees List</CardTitle>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Employee Name ↕</TableHead>
                    <TableHead className="font-semibold">Employee ID</TableHead>
                    <TableHead className="font-semibold">Deactivation Date ↕</TableHead>
                    <TableHead className="font-semibold">Designation ↕</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        No inactive employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">{employee.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{employee.employeeId}</TableCell>
                        <TableCell>
                          {employee.archivedDate ? formatDate(employee.archivedDate) : 'N/A'}
                        </TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Inactive</Badge>
                        </TableCell>
                        <TableCell>FORMER EMPLOYEE</TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90 gap-2"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setShowRestoreDialog(true);
                              }}
                            >
                              Reactivate
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Inactive Employee Dialog */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            setAddForm(addInactiveDefault);
            setAddErrors({});
          }
        }}
      >
        <DialogContent className="max-w-5xl w-full max-h-[95vh] overflow-y-auto p-0 border-none bg-transparent shadow-none">
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-[#071a6c] text-white px-6 py-4 flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Add Inactive Employee</h2>
                <p className="text-sm text-white/80">Fill out the details to log a former employee.</p>
              </div>
            </div>

            <div className="bg-[#e6f0ff] p-6">
              <div className="bg-white rounded-2xl p-6">
                <form className="space-y-6" onSubmit={handleAddInactive}>
                  <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Field label="First Name" error={addErrors.firstName}>
                      <Input
                        placeholder="Employee's First Name"
                        value={addForm.firstName}
                        onChange={(e) => setAddForm((prev) => ({ ...prev, firstName: e.target.value }))}
                      />
                    </Field>
                    <Field label="Last Name" error={addErrors.lastName}>
                      <Input
                        placeholder="Employee's Last Name"
                        value={addForm.lastName}
                        onChange={(e) => setAddForm((prev) => ({ ...prev, lastName: e.target.value }))}
                      />
                    </Field>
                    <Field label="Employee ID" error={addErrors.employeeId}>
                      <Input
                        placeholder="Example: 25-GPC-0357"
                        value={addForm.employeeId}
                        onChange={(e) => setAddForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                      />
                    </Field>
                    <Field label="Upload Image">
                      <Input type="file" onChange={(e) => handleFileChange('uploadImage', e.target.files)} />
                      {addForm.uploadImage && (
                        <p className="text-xs text-muted-foreground">{addForm.uploadImage}</p>
                      )}
                    </Field>
                    <Field label="Department" error={addErrors.department}>
                      <Select
                        value={addForm.department}
                        onValueChange={(value) => setAddForm((prev) => ({ ...prev, department: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.name}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Designation" error={addErrors.designation}>
                      <Select
                        value={addForm.designation}
                        onValueChange={(value) => setAddForm((prev) => ({ ...prev, designation: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Designation" />
                        </SelectTrigger>
                        <SelectContent>
                          {designations.map((desig) => (
                            <SelectItem key={desig.id} value={desig.name}>
                              {desig.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Role">
                      <Select
                        value={addForm.role}
                        onValueChange={(value) => setAddForm((prev) => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Service Record">
                      <Input type="file" onChange={(e) => handleFileChange('serviceRecord', e.target.files)} />
                      {addForm.serviceRecord && (
                        <p className="text-xs text-muted-foreground">{addForm.serviceRecord}</p>
                      )}
                    </Field>
                    <Field label="Date of Joining">
                      <Input
                        type="date"
                        value={addForm.dateOfJoining}
                        onChange={(e) => setAddForm((prev) => ({ ...prev, dateOfJoining: e.target.value }))}
                      />
                    </Field>
                    <Field label="Date of Leaving">
                      <Input
                        type="date"
                        value={addForm.dateOfLeaving}
                        onChange={(e) => setAddForm((prev) => ({ ...prev, dateOfLeaving: e.target.value }))}
                      />
                    </Field>
                    <Field label="Reason">
                      <Input
                        placeholder="Reason of employee"
                        value={addForm.reason}
                        onChange={(e) => setAddForm((prev) => ({ ...prev, reason: e.target.value }))}
                      />
                    </Field>
                    <Field label="Personal Data Sheet">
                      <Input type="file" onChange={(e) => handleFileChange('personalDataSheet', e.target.files)} />
                      {addForm.personalDataSheet && (
                        <p className="text-xs text-muted-foreground">{addForm.personalDataSheet}</p>
                      )}
                    </Field>
                    <Field label="Retire?">
                      <Select
                        value={addForm.retire}
                        onValueChange={(value) => setAddForm((prev) => ({ ...prev, retire: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Yes / No" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Deactivation Date">
                      <Input
                        type="date"
                        value={addForm.deactivationDate}
                        onChange={(e) => setAddForm((prev) => ({ ...prev, deactivationDate: e.target.value }))}
                      />
                    </Field>
                    <Field label="Reactivation Date">
                      <Input
                        type="date"
                        value={addForm.reactivationDate}
                        onChange={(e) => setAddForm((prev) => ({ ...prev, reactivationDate: e.target.value }))}
                      />
                    </Field>
                    <Field label="Employment Record">
                      <Input type="file" onChange={(e) => handleFileChange('employmentRecord', e.target.files)} />
                      {addForm.employmentRecord && (
                        <p className="text-xs text-muted-foreground">{addForm.employmentRecord}</p>
                      )}
                    </Field>
                  </section>

                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-6"
                      onClick={() => {
                        setShowAddDialog(false);
                        setAddForm(addInactiveDefault);
                        setAddErrors({});
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="rounded-full px-6 bg-[#0b5ed7] hover:bg-[#0a4fb3]" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Save Record'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore {selectedEmployee?.fullName}? They will be moved back to the active employees list.
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Employee ID:</span>
                <span className="font-medium">{selectedEmployee.employeeId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Department:</span>
                <span className="font-medium">{selectedEmployee.department}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Archived Reason:</span>
                <span className="font-medium">{selectedEmployee.archivedReason || 'N/A'}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRestoreDialog(false);
              setSelectedEmployee(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleRestore} disabled={isSubmitting}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Restoring...' : 'Restore Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayoutNew>
  );
};

export default InactiveEmployees;
