import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Employee } from '@/types/employee';
import { Department, Designation } from '@/lib/organizationStorage';
import { Plus, Search, Edit, Archive, Eye, EyeOff, Users, Paperclip, Camera, Trash2, X, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const editFormDefault = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffixName: '',
  address: '',
  contactNumber: '',
  gender: '',
  civilStatus: '',
  dateOfBirth: '',
  email: '',
  employeeId: '',
  department: '',
  designation: '',
  role: 'Employee',
  employmentType: 'Regular',
  sssNumber: '',
  pagibigNumber: '',
  tinNumber: '',
  dateOfJoining: '',
  dateOfLeaving: '',
  emergencyContact: '',
  educationalBackground: '',
  signatureFile: '',
  signatureFileSize: '',
  pdsFile: '',
  pdsFileSize: '',
  serviceRecordFile: '',
  serviceRecordFileSize: '',
  registeredFaceFile: '',
  registeredFaceFileSize: '',
  status: 'Active',
  password: '',
  posNumber: '',
  deactivationDate: '',
  reactivationDate: '',
};

const EditField = ({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) => (
  <div className={`space-y-2 ${className}`}>
    <Label className="text-sm font-semibold text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const AttachmentDisplay = ({
  fileName,
  fileSize,
  placeholder,
}: {
  fileName: string;
  fileSize?: string;
  placeholder: string;
}) => {
  const hasFile = fileName && fileName.trim() !== '';
  
  if (!hasFile) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-3">
        <div className="rounded-full bg-muted p-2">
          <Paperclip className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="text-sm text-muted-foreground">
          <p>No file uploaded</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-3">
      <div className="rounded-full bg-primary/10 p-2">
        <Paperclip className="w-4 h-4 text-primary" />
      </div>
      <div className="text-sm">
        <p className="font-semibold text-primary underline cursor-pointer hover:text-primary/80">
          {fileName}
        </p>
        <p className="text-xs text-muted-foreground">{fileSize || 'Uploaded'}</p>
      </div>
    </div>
  );
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const EMPLOYMENT_TYPES = ['Regular', 'Contractual', 'Probationary', 'Project-Based'];

const employeeIdRegex = /^\d{2}-[A-Z]{2,4}-\d{1,5}$/;

const validateEmployeeId = (id: string): boolean => {
  if (!id) return false;
  const parts = id.split('-');
  if (parts.length !== 3) return false;
  const [year, school, uniqueId] = parts;
  // Year: 2 digits
  if (!/^\d{2}$/.test(year)) return false;
  // School: 2-4 uppercase letters
  if (!/^[A-Z]{2,4}$/.test(school)) return false;
  // Unique ID: 1-5 digits
  if (!/^\d{1,5}$/.test(uniqueId)) return false;
  return true;
};

const employeeSchema = z.object({
  employeeId: z.string().trim().min(1, 'Employee ID is required')
    .refine((id) => validateEmployeeId(id), {
      message: 'Employee ID must be in format: YY-SCHOOL-XXXXX (e.g., 25-GPC-12345). Year: 2 digits, School: 2-4 letters, Unique ID: 1-5 digits',
    }),
  firstName: z.string().trim().min(1, 'First name is required'),
  middleName: z.string().trim().min(1, 'Middle name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  suffixName: z.string().trim().optional(),
  department: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required'),
  email: z.string().trim().email('Invalid email').max(255),
  contactNumber: z.string().trim().min(1, 'Contact number is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  address: z.string().trim().min(1, 'Address is required'),
  dateOfJoining: z.string().min(1, 'Date of joining is required'),
  employmentType: z.string().min(1, 'Employment type is required'),
  password: z.string().trim().min(6, 'Password must be at least 6 characters'),
  registeredFaceFile: z.string().min(1, 'Face registration is required. Please capture face before adding employee.'),
});

const initialFormState = {
  employeeId: '',
  firstName: '',
  middleName: '',
  lastName: '',
  suffixName: '',
  address: '',
  contactNumber: '',
  gender: '',
  civilStatus: '',
  dateOfBirth: '',
  email: '',
  department: '',
  designation: '',
  role: 'Employee',
  employmentType: 'Regular',
  sssNumber: '',
  pagibigNumber: '',
  tinNumber: '',
  dateOfJoining: '',
  dateOfLeaving: '',
  emergencyContact: '',
  educationalBackground: '',
  signatureFile: null as File | null,
  pdsFile: null as File | null,
  serviceRecordFile: null as File | null,
  registeredFaceFile: '',
  status: 'Active',
  password: '',
};

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState(editFormDefault);
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraContext, setCameraContext] = useState<'add' | 'edit'>('add');
  const [cameraError, setCameraError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const mapEmployee = (employee: any): Employee => ({
    id: String(employee.id),
    employeeId: employee.employeeId,
    firstName: employee.firstName || '',
    middleName: employee.middleName || '',
    lastName: employee.lastName || '',
    suffixName: employee.suffixName || '',
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
      // Only fetch active employees for the Employees page
      const response = await fetch(`${API_BASE_URL}/employees?status=active`);
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      const data = await response.json();
      setEmployees(data.data.map(mapEmployee));
    } catch (error) {
      console.error(error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        toast({
          variant: 'destructive',
          title: 'Server Connection Error',
          description: 'Unable to connect to the server. Please make sure the backend server is running on port 4000.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Unable to load employees. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/departments`);
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      const data = await response.json();
      setDepartments(data.data);
    } catch (error) {
      // Silently fail for departments - already shown in fetchEmployees
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return;
      }
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
      // Silently fail for designations - already shown in fetchEmployees
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return;
      }
      console.error(error);
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
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const closeCamera = () => {
    stopCamera();
    setIsCameraOpen(false);
    setCameraError('');
  };

  const openFaceCamera = async (context: 'add' | 'edit') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        variant: 'destructive',
        title: 'Camera not supported',
        description: 'Your browser does not allow camera access.',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      mediaStreamRef.current = stream;
      setCameraContext(context);
      setIsCameraOpen(true);
      setCameraError('');
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch (error) {
      console.error('Unable to open camera', error);
      setCameraError('Unable to access camera. Please check permissions.');
    }
  };

  const handleCaptureFace = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');

    if (cameraContext === 'add') {
      setFormData((prev) => ({ ...prev, registeredFaceFile: dataUrl }));
    } else {
      setEditForm((prev) => ({ ...prev, registeredFaceFile: dataUrl }));
    }

    toast({
      title: 'Face captured',
      description: 'Photo saved for this employee.',
    });
    closeCamera();
  };

  const handleAddEmployee = async () => {
    try {
      setFormErrors({});
      const validated = employeeSchema.parse(formData);
      setIsSubmitting(true);

      const fullName = [validated.firstName, validated.middleName, validated.lastName, validated.suffixName || '']
        .filter((part) => part && part.trim().length)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      const response = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: validated.employeeId,
          firstName: validated.firstName,
          middleName: validated.middleName,
          lastName: validated.lastName,
          suffixName: validated.suffixName,
          fullName,
          department: validated.department,
          position: validated.designation,
          email: validated.email,
          phone: validated.contactNumber,
          dateOfBirth: validated.dateOfBirth,
          address: validated.address,
          gender: formData.gender || null,
          civilStatus: formData.civilStatus || null,
          dateHired: validated.dateOfJoining,
          dateOfLeaving: formData.dateOfLeaving || null,
          employmentType: validated.employmentType || 'Regular',
          role: formData.role || null,
          sssNumber: formData.sssNumber || null,
          pagibigNumber: formData.pagibigNumber || null,
          tinNumber: formData.tinNumber || null,
          emergencyContact: formData.emergencyContact || null,
          educationalBackground: formData.educationalBackground || null,
          signatureFile: formData.signatureFile?.name || null,
          pdsFile: formData.pdsFile?.name || null,
          serviceRecordFile: formData.serviceRecordFile?.name || null,
          registeredFaceFile: formData.registeredFaceFile || null,
          password: validated.password,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add employee');
      }

      await fetchEmployees();
        setShowAddDialog(false);
        setFormData(initialFormState);
        setFormErrors({});
        setShowPassword(false);

      toast({
        title: 'Success',
        description: 'Employee added successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setFormErrors(errors);
      } else {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Unable to add employee. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditDialog = async (employee: Employee) => {
    setSelectedEmployee(employee);
    
    // Fetch full employee data including password status
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${employee.id}`);
      if (response.ok) {
        const data = await response.json();
        const fullEmployee = data.data;
        
        setEditForm({
          ...editFormDefault,
          firstName: employee.firstName || '',
          middleName: employee.middleName || '',
          lastName: employee.lastName || '',
          suffixName: employee.suffixName || '',
          address: employee.address,
          contactNumber: employee.phone,
          dateOfBirth: employee.dateOfBirth,
          email: employee.email,
          employeeId: employee.employeeId,
          department: employee.department,
          designation: employee.position,
          dateOfJoining: employee.dateHired,
          status: employee.status === 'active' ? 'Active' : 'Inactive',
          employmentType: employee.employmentType || 'Regular',
          emergencyContact: employee.emergencyContact || '',
          educationalBackground: employee.educationalBackground || '',
          signatureFile: employee.signatureFile || '',
          signatureFileSize: employee.signatureFile ? 'Uploaded' : '',
          pdsFile: employee.pdsFile || '',
          pdsFileSize: employee.pdsFile ? 'Uploaded' : '',
          serviceRecordFile: employee.serviceRecordFile || '',
          serviceRecordFileSize: employee.serviceRecordFile ? 'Uploaded' : '',
          registeredFaceFile: employee.registeredFaceFile || '',
          registeredFaceFileSize: employee.registeredFaceFile ? 'Captured' : '',
          password: fullEmployee.password_hash ? '••••••••' : '', // Show placeholder if password exists
          deactivationDate: fullEmployee.deactivation_date || '',
          reactivationDate: fullEmployee.reactivation_date || '',
        });
      } else {
        // Fallback to basic employee data
        setEditForm({
          ...editFormDefault,
          firstName: employee.firstName || '',
          middleName: employee.middleName || '',
          lastName: employee.lastName || '',
          suffixName: employee.suffixName || '',
          address: employee.address,
          contactNumber: employee.phone,
          dateOfBirth: employee.dateOfBirth,
          email: employee.email,
          employeeId: employee.employeeId,
          department: employee.department,
          designation: employee.position,
          dateOfJoining: employee.dateHired,
          status: employee.status === 'active' ? 'Active' : 'Inactive',
          employmentType: employee.employmentType || 'Regular',
          emergencyContact: employee.emergencyContact || '',
          educationalBackground: employee.educationalBackground || '',
          signatureFile: employee.signatureFile || '',
          signatureFileSize: employee.signatureFile ? 'Uploaded' : '',
          pdsFile: employee.pdsFile || '',
          pdsFileSize: employee.pdsFile ? 'Uploaded' : '',
          serviceRecordFile: employee.serviceRecordFile || '',
          serviceRecordFileSize: employee.serviceRecordFile ? 'Uploaded' : '',
          registeredFaceFile: employee.registeredFaceFile || '',
          registeredFaceFileSize: employee.registeredFaceFile ? 'Captured' : '',
          password: '••••••••', // Assume password exists
        });
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
      // Use basic employee data
      setEditForm({
        ...editFormDefault,
        firstName: employee.firstName || '',
        middleName: employee.middleName || '',
        lastName: employee.lastName || '',
        suffixName: employee.suffixName || '',
        address: employee.address,
        contactNumber: employee.phone,
        dateOfBirth: employee.dateOfBirth,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department,
        designation: employee.position,
        dateOfJoining: employee.dateHired,
        status: employee.status === 'active' ? 'Active' : 'Inactive',
        employmentType: employee.employmentType || 'Regular',
        emergencyContact: employee.emergencyContact || '',
        educationalBackground: employee.educationalBackground || '',
        signatureFile: employee.signatureFile || '',
        signatureFileSize: employee.signatureFile ? 'Uploaded' : '',
        pdsFile: employee.pdsFile || '',
        pdsFileSize: employee.pdsFile ? 'Uploaded' : '',
        serviceRecordFile: employee.serviceRecordFile || '',
        serviceRecordFileSize: employee.serviceRecordFile ? 'Uploaded' : '',
        registeredFaceFile: employee.registeredFaceFile || '',
        registeredFaceFileSize: employee.registeredFaceFile ? 'Captured' : '',
        password: '••••••••',
      });
    }
    
    setShowEditDialog(true);
  };

  const handleEditFieldChange = (field: keyof typeof editFormDefault, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setEditForm(editFormDefault);
    setSelectedEmployee(null);
    setShowEditPassword(false);
  };

  const handleUpdateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    (async () => {
      try {
        setIsSubmitting(true);
        
        // Build update payload - include all fields
        const updatePayload: Record<string, any> = {
          status: editForm.status.toLowerCase(),
          firstName: editForm.firstName || undefined,
          middleName: editForm.middleName || undefined,
          lastName: editForm.lastName || undefined,
          suffixName: editForm.suffixName || undefined,
          address: editForm.address || undefined,
          phone: editForm.contactNumber || undefined,
          dateOfBirth: editForm.dateOfBirth || undefined,
          email: editForm.email || undefined,
          department: editForm.department || undefined,
          position: editForm.designation || undefined,
          dateHired: editForm.dateOfJoining || undefined,
          dateOfLeaving: editForm.dateOfLeaving || undefined,
          employmentType: editForm.employmentType || undefined,
          role: editForm.role || undefined,
          gender: editForm.gender || undefined,
          civilStatus: editForm.civilStatus || undefined,
          sssNumber: editForm.sssNumber || undefined,
          pagibigNumber: editForm.pagibigNumber || undefined,
          tinNumber: editForm.tinNumber || undefined,
          emergencyContact: editForm.emergencyContact || undefined,
          educationalBackground: editForm.educationalBackground || undefined,
          registeredFaceFile: editForm.registeredFaceFile || undefined,
          password: editForm.password && editForm.password !== '••••••••' && editForm.password.trim() !== '' ? editForm.password : undefined,
          deactivationDate: editForm.deactivationDate || undefined,
          reactivationDate: editForm.reactivationDate || undefined,
        };

        const response = await fetch(`${API_BASE_URL}/employees/${selectedEmployee.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          throw new Error('Failed to update employee');
        }

        await fetchEmployees();
        
        // If status was changed to inactive, show a message
        if (updatePayload.status === 'inactive') {
          toast({
            title: 'Employee Archived',
            description: 'Employee has been moved to the inactive employees list.',
          });
        } else {
          toast({
            title: 'Updated',
            description: 'Employee information updated successfully.',
          });
        }
        
        handleCloseEditDialog();
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Unable to update employee. Please try again.',
        });
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/employees/${selectedEmployee.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete employee');
      }

      await fetchEmployees();
      setShowDeleteDialog(false);
      setSelectedEmployee(null);
      toast({
        title: 'Deleted',
        description: 'Employee deleted successfully.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unable to delete employee. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = () => {
    if (!selectedEmployee || !archiveReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please provide a reason for archiving',
      });
      return;
    }

    (async () => {
      try {
        setIsSubmitting(true);
        const response = await fetch(`${API_BASE_URL}/employees/${selectedEmployee.id}/archive`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: archiveReason }),
        });

        if (!response.ok) {
          throw new Error('Failed to archive employee');
        }

        await fetchEmployees();
        setShowArchiveDialog(false);
        setArchiveReason('');
        setSelectedEmployee(null);

        toast({
          title: 'Success',
          description: 'Employee archived successfully',
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Unable to archive employee. Please try again.',
        });
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const handleResetPassword = async () => {
    if (!selectedEmployee) return;

    (async () => {
      try {
        setIsSubmitting(true);
        const response = await fetch(`${API_BASE_URL}/employees/${selectedEmployee.id}/reset-password`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ resetBy: user?.fullName || 'Admin' }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to reset password');
        }

        const data = await response.json();
        
        await fetchEmployees();
        setShowResetPasswordDialog(false);
        setSelectedEmployee(null);

        toast({
          title: 'Password Reset',
          description: `Password has been reset. Temporary password: ${data.temporaryPassword || 'N/A'}. Employee must change password on next login.`,
          duration: 10000,
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error instanceof Error ? error.message : 'Unable to reset password. Please try again.',
        });
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  return (
    <DashboardLayoutNew>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Employee Management</h1>
            <p className="text-muted-foreground">View and manage employee records</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => navigate('/employees/inactive')}
              variant="outline"
              className="gap-2"
            >
              <Archive className="w-4 h-4" />
              Inactive Employees List
            </Button>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Employee List Card */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-xl">Employee List</CardTitle>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mt-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full md:w-[220px] h-11">
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Employee Name ↕</TableHead>
                    <TableHead className="font-semibold">Employee ID ↕</TableHead>
                    <TableHead className="font-semibold">Department ↕</TableHead>
                    <TableHead className="font-semibold">Designation ↕</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Employment Type ↕</TableHead>
                    <TableHead className="font-semibold text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        Loading employees...
                      </TableCell>
                    </TableRow>
                  ) : filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">{employee.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{employee.employeeId}</TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>
                          <Badge
                            variant="default"
                            className={employee.status === 'active' ? 'bg-success hover:bg-success' : 'bg-muted text-foreground'}
                          >
                            {employee.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{employee.employmentType || 'Regular'}</TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => handleOpenEditDialog(employee)}
                              title="Edit Employee"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {employee.status === 'active' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => {
                                    setSelectedEmployee(employee);
                                    setShowResetPasswordDialog(true);
                                  }}
                                  title="Reset Password"
                                >
                                  <KeyRound className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  onClick={() => {
                                    setSelectedEmployee(employee);
                                    setShowArchiveDialog(true);
                                  }}
                                  title="Move to Inactive"
                                >
                                  <Archive className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setShowDeleteDialog(true);
                              }}
                              title="Delete Employee"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setFormData(initialFormState);
          setShowPassword(false);
          setFormErrors({});
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">Add New Employee</DialogTitle>
            <DialogDescription>Fill in all employee details below</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAddEmployee(); }} className="space-y-6">
            {/* Personal Information */}
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <EditField label="First Name *">
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  placeholder="Employee's First Name"
                />
                {formErrors.firstName && <p className="text-sm text-destructive">{formErrors.firstName}</p>}
              </EditField>
              <EditField label="Middle Name *">
                <Input
                  value={formData.middleName}
                  onChange={(e) => setFormData({...formData, middleName: e.target.value})}
                  placeholder="Employee's Middle Name"
                />
                {formErrors.middleName && <p className="text-sm text-destructive">{formErrors.middleName}</p>}
              </EditField>
              <EditField label="Last Name *">
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Employee's Last Name"
                />
                {formErrors.lastName && <p className="text-sm text-destructive">{formErrors.lastName}</p>}
              </EditField>
              <EditField label="Suffix Name">
                <Input
                  value={formData.suffixName}
                  onChange={(e) => setFormData({...formData, suffixName: e.target.value})}
                  placeholder="Jr., Sr., III, etc. (Optional)"
                />
                {formErrors.suffixName && <p className="text-sm text-destructive">{formErrors.suffixName}</p>}
              </EditField>
              <EditField label="Address *">
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Employee's Address"
                />
                {formErrors.address && <p className="text-sm text-destructive">{formErrors.address}</p>}
              </EditField>
              <EditField label="Contact Number *">
                <Input
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                  placeholder="+63 9873462438"
                />
                {formErrors.contactNumber && <p className="text-sm text-destructive">{formErrors.contactNumber}</p>}
              </EditField>
              <EditField label="Gender">
                <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </EditField>
              <EditField label="Civil Status">
                <Select value={formData.civilStatus} onValueChange={(value) => setFormData({...formData, civilStatus: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </EditField>
              <EditField label="Date of Birth *">
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                  min="1900-01-01"
                  max={new Date().toISOString().split('T')[0]}
                />
                {formErrors.dateOfBirth && <p className="text-sm text-destructive">{formErrors.dateOfBirth}</p>}
              </EditField>
              <EditField label="Email *">
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@gmail.com"
                />
                {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
              </EditField>
            </section>

            {/* Employment Details */}
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <EditField label="Employee ID *">
                <Input
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  placeholder="Example: 25-GPC-012345"
                />
                {formErrors.employeeId && <p className="text-sm text-destructive">{formErrors.employeeId}</p>}
              </EditField>
              <EditField label="Department *">
                <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.department && <p className="text-sm text-destructive">{formErrors.department}</p>}
              </EditField>
              <EditField label="Designation *">
                <Select value={formData.designation} onValueChange={(value) => setFormData({...formData, designation: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.map(desig => (
                      <SelectItem key={desig.id} value={desig.name}>{desig.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.designation && <p className="text-sm text-destructive">{formErrors.designation}</p>}
              </EditField>
              <EditField label="Role">
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Employee">Employee</SelectItem>
                    <SelectItem value="Former Employee">Former Employee</SelectItem>
                  </SelectContent>
                </Select>
              </EditField>
              <EditField label="Employment Type *">
                <Select value={formData.employmentType} onValueChange={(value) => setFormData({...formData, employmentType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.employmentType && <p className="text-sm text-destructive">{formErrors.employmentType}</p>}
              </EditField>
            </section>

            {/* Identification Numbers */}
            <section className="grid gap-4 md:grid-cols-3">
              <EditField label="SSS Number">
                <Input
                  value={formData.sssNumber}
                  onChange={(e) => setFormData({...formData, sssNumber: e.target.value})}
                  placeholder="Example: 00-0000000-0"
                />
              </EditField>
              <EditField label="Pag-IBIG Number">
                <Input
                  value={formData.pagibigNumber}
                  onChange={(e) => setFormData({...formData, pagibigNumber: e.target.value})}
                  placeholder="Example: 0000-0000-0000"
                />
              </EditField>
              <EditField label="TIN Number">
                <Input
                  value={formData.tinNumber}
                  onChange={(e) => setFormData({...formData, tinNumber: e.target.value})}
                  placeholder="Example: 000-000-000-000"
                />
              </EditField>
            </section>

            {/* Dates and Contacts */}
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <EditField label="Date of Joining *">
                <Input
                  type="date"
                  value={formData.dateOfJoining}
                  onChange={(e) => setFormData({...formData, dateOfJoining: e.target.value})}
                />
                {formErrors.dateOfJoining && <p className="text-sm text-destructive">{formErrors.dateOfJoining}</p>}
              </EditField>
              <EditField label="Date of Leaving">
                <Input
                  type="date"
                  value={formData.dateOfLeaving}
                  onChange={(e) => setFormData({...formData, dateOfLeaving: e.target.value})}
                />
              </EditField>
              <EditField label="Emergency Contact Person" className="lg:col-span-2">
                <Input
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                  placeholder="Employee's Contact Person"
                />
              </EditField>
              <EditField label="Educational Background" className="lg:col-span-2">
                <Input
                  value={formData.educationalBackground}
                  onChange={(e) => setFormData({...formData, educationalBackground: e.target.value})}
                  placeholder="Employee's Background"
                />
              </EditField>
            </section>

            {/* Document Uploads */}
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <EditField label="Signature">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({...formData, signatureFile: e.target.files?.[0] || null})}
                    className="hidden"
                    id="signatureFile"
                  />
                  <Label htmlFor="signatureFile" className="cursor-pointer">
                    <Button type="button" variant="outline" onClick={() => document.getElementById('signatureFile')?.click()}>
                      Choose File
                    </Button>
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.signatureFile?.name || 'No file chosen'}
                  </span>
                </div>
              </EditField>
              <EditField label="PDS">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFormData({...formData, pdsFile: e.target.files?.[0] || null})}
                    className="hidden"
                    id="pdsFile"
                  />
                  <Label htmlFor="pdsFile" className="cursor-pointer">
                    <Button type="button" variant="outline" onClick={() => document.getElementById('pdsFile')?.click()}>
                      Choose File
                    </Button>
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.pdsFile?.name || 'No file chosen'}
                  </span>
                </div>
              </EditField>
              <EditField label="Service Record">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFormData({...formData, serviceRecordFile: e.target.files?.[0] || null})}
                    className="hidden"
                    id="serviceRecordFile"
                  />
                  <Label htmlFor="serviceRecordFile" className="cursor-pointer">
                    <Button type="button" variant="outline" onClick={() => document.getElementById('serviceRecordFile')?.click()}>
                      Choose File
                    </Button>
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.serviceRecordFile?.name || 'No file chosen'}
                  </span>
                </div>
              </EditField>
              <EditField label="Register Face *">
                <div className="space-y-2">
                  {formData.registeredFaceFile ? (
                    <div className="space-y-2">
                      <img
                        src={formData.registeredFaceFile}
                        alt="Captured face"
                        className="w-full h-40 object-cover rounded-xl border border-border/70"
                      />
                      <p className="text-xs text-green-600 font-medium">✓ Face registered successfully</p>
                    </div>
                  ) : (
                    <div className="w-full h-40 border-2 border-dashed border-destructive/50 rounded-xl flex flex-col items-center justify-center text-sm text-muted-foreground bg-destructive/5">
                      <Camera className="w-8 h-8 mb-2 text-destructive/50" />
                      <p>No face captured yet</p>
                      <p className="text-xs text-destructive mt-1">Face registration required</p>
                    </div>
                  )}
                  <Button type="button" variant="outline" className="w-full" onClick={() => openFaceCamera('add')}>
                    <Camera className="w-4 h-4 mr-2" />
                    {formData.registeredFaceFile ? 'Retake Photo' : 'Open Camera'}
                  </Button>
                  {formErrors.registeredFaceFile && <p className="text-sm text-destructive">{formErrors.registeredFaceFile}</p>}
                </div>
              </EditField>
            </section>

            {/* Account Details */}
            <section className="grid gap-4 md:grid-cols-2">
              <EditField label="Status">
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </EditField>
              <EditField label="Password">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Employee's password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </EditField>
            </section>

            <DialogFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
        setShowAddDialog(false);
        setFormData(initialFormState);
        setFormErrors({});
        setShowPassword(false);
                }}
                className="sm:w-auto rounded-full px-8"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="sm:w-auto rounded-full px-8 bg-green-600 hover:bg-green-700">
                {isSubmitting ? 'Adding...' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => (open ? setShowEditDialog(true) : handleCloseEditDialog())}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <>
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-semibold">Edit Employee Information</DialogTitle>
              <DialogDescription className="text-base">
                Update the fields below then click update to save your changes.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <Avatar className="h-14 w-14 bg-primary/10 text-primary">
                <AvatarFallback className="text-lg font-semibold">
                  {editForm.firstName.charAt(0) || selectedEmployee?.fullName.charAt(0) || 'E'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {[editForm.firstName, editForm.middleName, editForm.lastName, editForm.suffixName]
                    .filter((part) => part && part.trim().length)
                    .join(' ') || selectedEmployee?.fullName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {editForm.employeeId || selectedEmployee?.employeeId} • {editForm.department || selectedEmployee?.department}
                </p>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleUpdateEmployee}>
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <EditField label="First Name">
                <Input value={editForm.firstName} onChange={(e) => handleEditFieldChange('firstName', e.target.value)} />
              </EditField>
              <EditField label="Middle Name">
                <Input value={editForm.middleName} onChange={(e) => handleEditFieldChange('middleName', e.target.value)} />
              </EditField>
              <EditField label="Last Name">
                <Input value={editForm.lastName} onChange={(e) => handleEditFieldChange('lastName', e.target.value)} />
              </EditField>
              <EditField label="Suffix Name">
                <Input value={editForm.suffixName} onChange={(e) => handleEditFieldChange('suffixName', e.target.value)} />
              </EditField>
              <EditField label="Address" className="lg:col-span-2">
                <Input value={editForm.address} onChange={(e) => handleEditFieldChange('address', e.target.value)} />
              </EditField>
              <EditField label="Contact Number">
                <Input value={editForm.contactNumber} onChange={(e) => handleEditFieldChange('contactNumber', e.target.value)} />
              </EditField>
              <EditField label="Gender">
                <Select value={editForm.gender} onValueChange={(value) => handleEditFieldChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </EditField>
              <EditField label="Civil Status">
                <Select value={editForm.civilStatus} onValueChange={(value) => handleEditFieldChange('civilStatus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </EditField>
              <EditField label="Date of Birth">
                <Input 
                  type="date" 
                  value={editForm.dateOfBirth} 
                  onChange={(e) => handleEditFieldChange('dateOfBirth', e.target.value)}
                  min="1900-01-01"
                  max={new Date().toISOString().split('T')[0]}
                />
              </EditField>
              <EditField label="Email">
                <Input type="email" value={editForm.email} onChange={(e) => handleEditFieldChange('email', e.target.value)} />
              </EditField>
              <EditField label="Employee ID">
                <Input value={editForm.employeeId} onChange={(e) => handleEditFieldChange('employeeId', e.target.value)} />
              </EditField>
              <EditField label="Department">
                <Select value={editForm.department} onValueChange={(value) => handleEditFieldChange('department', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </EditField>
              <EditField label="Designation">
                <Select value={editForm.designation} onValueChange={(value) => handleEditFieldChange('designation', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.map(desig => (
                      <SelectItem key={desig.id} value={desig.name}>{desig.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </EditField>
              <EditField label="Role">
                <Select value={editForm.role} onValueChange={(value) => handleEditFieldChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Employee">Employee</SelectItem>
                    <SelectItem value="Former Employee">Former Employee</SelectItem>
                  </SelectContent>
                </Select>
              </EditField>
              <EditField label="Employment Type">
                <Select value={editForm.employmentType} onValueChange={(value) => handleEditFieldChange('employmentType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </EditField>
              <EditField label="SSS Number">
                <Input value={editForm.sssNumber} onChange={(e) => handleEditFieldChange('sssNumber', e.target.value)} />
              </EditField>
              <EditField label="Pag-IBIG Number">
                <Input value={editForm.pagibigNumber} onChange={(e) => handleEditFieldChange('pagibigNumber', e.target.value)} />
              </EditField>
              <EditField label="TIN Number">
                <Input value={editForm.tinNumber} onChange={(e) => handleEditFieldChange('tinNumber', e.target.value)} />
              </EditField>
              <EditField label="Date of Joining">
                <Input type="date" value={editForm.dateOfJoining} onChange={(e) => handleEditFieldChange('dateOfJoining', e.target.value)} />
              </EditField>
              <EditField label="Date of Leaving">
                <Input type="date" value={editForm.dateOfLeaving} onChange={(e) => handleEditFieldChange('dateOfLeaving', e.target.value)} />
              </EditField>
              <EditField label="Emergency Contact Person" className="lg:col-span-2">
                <Input value={editForm.emergencyContact} onChange={(e) => handleEditFieldChange('emergencyContact', e.target.value)} />
              </EditField>
              <EditField label="Educational Background" className="lg:col-span-2">
                <Input value={editForm.educationalBackground} onChange={(e) => handleEditFieldChange('educationalBackground', e.target.value)} />
              </EditField>
              <EditField label="Signature">
                <AttachmentDisplay fileName={editForm.signatureFile} fileSize={editForm.signatureFileSize} placeholder="12345.png" />
              </EditField>
              <EditField label="PDS">
                <div className="space-y-2">
                  <AttachmentDisplay fileName={editForm.pdsFile} fileSize={editForm.pdsFileSize} placeholder="pds_admin.pdf" />
                  {editForm.pdsFile && (
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const fileUrl = `${API_BASE_URL}/uploads/${editForm.pdsFile}`;
                          window.open(fileUrl, '_blank');
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const fileUrl = `${API_BASE_URL}/uploads/${editForm.pdsFile}`;
                          window.open(fileUrl, '_blank');
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const fileUrl = `${API_BASE_URL}/uploads/${editForm.pdsFile}`;
                          window.open(fileUrl, '_blank');
                          setTimeout(() => window.print(), 500);
                        }}
                      >
                        <Paperclip className="w-4 h-4 mr-2" />
                        Print
                      </Button>
                    </div>
                  )}
                </div>
              </EditField>
              <EditField label="Service Record">
                <div className="space-y-2">
                  <AttachmentDisplay fileName={editForm.serviceRecordFile} fileSize={editForm.serviceRecordFileSize} placeholder="sr_admin.pdf" />
                  {editForm.serviceRecordFile && (
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const fileUrl = `${API_BASE_URL}/uploads/${editForm.serviceRecordFile}`;
                          window.open(fileUrl, '_blank');
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const fileUrl = `${API_BASE_URL}/uploads/${editForm.serviceRecordFile}`;
                          window.open(fileUrl, '_blank');
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const fileUrl = `${API_BASE_URL}/uploads/${editForm.serviceRecordFile}`;
                          window.open(fileUrl, '_blank');
                          setTimeout(() => window.print(), 500);
                        }}
                      >
                        <Paperclip className="w-4 h-4 mr-2" />
                        Print
                      </Button>
                    </div>
                  )}
                </div>
              </EditField>
              <EditField label="Registered Face" className="lg:col-span-2">
                <div className="space-y-3">
                  {editForm.registeredFaceFile ? (
                    <div className="space-y-2">
                      <img
                        src={editForm.registeredFaceFile}
                        alt="Registered face"
                        className="w-full max-w-md h-48 object-cover rounded-xl border-2 border-primary/20 shadow-md"
                      />
                      <p className="text-xs text-green-600 font-medium">✓ Face registered</p>
                    </div>
                  ) : (
                    <div className="w-full max-w-md h-48 border-2 border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center text-sm text-muted-foreground bg-muted/30">
                      <Camera className="w-8 h-8 mb-2 text-muted-foreground/50" />
                      <p>No face capture on file</p>
                    </div>
                  )}
                  <Button type="button" variant="outline" className="w-full max-w-md" onClick={() => openFaceCamera('edit')}>
                    <Camera className="w-4 h-4 mr-2" />
                    {editForm.registeredFaceFile ? 'Retake Photo' : 'Open Camera'}
                  </Button>
                </div>
              </EditField>
              <EditField label="Status">
                <Select value={editForm.status} onValueChange={(value) => handleEditFieldChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </EditField>
              <EditField label="Password">
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type={showEditPassword ? "text" : "password"}
                      value={editForm.password === '••••••••' ? '' : editForm.password}
                      onChange={(e) => {
                        handleEditFieldChange('password', e.target.value);
                      }}
                      onFocus={() => {
                        // Clear placeholder when focused
                        if (editForm.password === '••••••••') {
                          handleEditFieldChange('password', '');
                        }
                      }}
                      placeholder={editForm.password === '••••••••' ? "Password is set (click to change)" : "Enter new password (optional)"}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {editForm.password === '••••••••' && (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ Password is set. Click the field above to change it.
                    </p>
                  )}
                </div>
              </EditField>
              <EditField label="POS">
                <Input value={editForm.posNumber} onChange={(e) => handleEditFieldChange('posNumber', e.target.value)} placeholder="Castro2k25" />
              </EditField>
              <EditField label="Deactivation Date">
                <Input 
                  type="date" 
                  value={editForm.deactivationDate} 
                  onChange={(e) => handleEditFieldChange('deactivationDate', e.target.value)}
                  placeholder="Select deactivation date"
                />
                {editForm.deactivationDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Deactivation: {new Date(editForm.deactivationDate).toLocaleDateString()}
                  </p>
                )}
              </EditField>
              <EditField label="Reactivation Date">
                <Input 
                  type="date" 
                  value={editForm.reactivationDate} 
                  onChange={(e) => handleEditFieldChange('reactivationDate', e.target.value)}
                  placeholder="Select reactivation date"
                />
                {editForm.reactivationDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Reactivation: {new Date(editForm.reactivationDate).toLocaleDateString()}
                  </p>
                )}
              </EditField>
            </section>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <Button type="button" variant="outline" className="sm:w-auto rounded-full px-6" onClick={handleCloseEditDialog}>
                Cancel
              </Button>
              <Button type="submit" className="sm:w-auto rounded-full px-6" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Update'}
              </Button>
            </div>
          </form>
          </>
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Employee</DialogTitle>
            <DialogDescription>
              Please provide a reason for archiving {selectedEmployee?.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for archiving *</Label>
              <Input
                id="reason"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="e.g., Resigned, Terminated, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowArchiveDialog(false);
              setArchiveReason('');
              setSelectedEmployee(null);
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleArchive} disabled={isSubmitting}>
              {isSubmitting ? 'Archiving...' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedEmployee?.fullName}? A temporary password will be generated and the employee will be required to change it on next login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowResetPasswordDialog(false);
              setSelectedEmployee(null);
            }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={isSubmitting}>
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedEmployee?.fullName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteDialog(false);
              setSelectedEmployee(null);
            }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEmployee} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isCameraOpen && (
        <Dialog open={isCameraOpen} onOpenChange={(open) => !open && closeCamera}>
          <DialogContent className="max-w-2xl w-full p-0 gap-0">
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <DialogTitle className="text-lg font-semibold">Capture Face</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {cameraContext === 'add' ? 'Add Employee' : 'Edit Employee'} • Align the camera and tap capture.
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={closeCamera} className="h-8 w-8">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="rounded-xl overflow-hidden bg-black aspect-video mb-4">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>

              {cameraError && <p className="text-sm text-destructive mb-4">{cameraError}</p>}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeCamera}>Cancel</Button>
                <Button onClick={handleCaptureFace}>Capture</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayoutNew>
  );
};

export default Employees;
