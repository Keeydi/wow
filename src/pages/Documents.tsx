import { ChangeEvent, useState, useEffect } from 'react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Folder, Edit, FileText, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type NavCardKey = 'documents' | 'templates' | 'employeeReports' | 'attendanceReports';

const navCards: Array<{ key: NavCardKey; title: string; subtitle: string }> = [
  { key: 'documents', title: 'Documents', subtitle: 'Add' },
  { key: 'templates', title: 'Templates', subtitle: 'Add' },
  { key: 'employeeReports', title: 'Employee Reports', subtitle: 'Add' },
  { key: 'attendanceReports', title: 'Attendance Reports', subtitle: 'Add' },
];

const modalConfigs: Record<
  NavCardKey,
  {
    title: string;
    description: string;
    fields: Array<{ name: string; placeholder: string; type?: string }>;
    cta: string;
    successMessage: string;
  }
> = {
  documents: {
    title: 'Add Document',
    description: 'Upload employee documents with description and owner.',
    fields: [
      { name: 'documentTitle', placeholder: 'Document title' },
      { name: 'documentDescription', placeholder: 'Document description' },
      { name: 'documentFile', placeholder: 'Choose file', type: 'file' },
    ],
    cta: 'Upload Document',
    successMessage: 'Document uploaded successfully.',
  },
  templates: {
    title: 'Add Template',
    description: 'Create a reusable document template.',
    fields: [
      { name: 'templateName', placeholder: 'Template name' },
      { name: 'templateCategory', placeholder: 'Category' },
      { name: 'templateFile', placeholder: 'Upload template', type: 'file' },
    ],
    cta: 'Save Template',
    successMessage: 'Template saved and ready to use.',
  },
  employeeReports: {
    title: 'Generate Employee Report',
    description: 'Configure and download employee report files.',
    fields: [
      { name: 'reportName', placeholder: 'Report name' },
      { name: 'reportFilter', placeholder: 'Filter (e.g. Department, Status)' },
    ],
    cta: 'Generate Report',
    successMessage: 'Employee report is being generated.',
  },
  attendanceReports: {
    title: 'Generate Attendance Report',
    description: 'Set filters to export attendance reports.',
    fields: [
      { name: 'attendanceRange', placeholder: 'Date range (e.g. Jan 1 - 15)' },
      { name: 'attendanceFilter', placeholder: 'Department or shift' },
    ],
    cta: 'Generate Attendance Report',
    successMessage: 'Attendance report queued successfully.',
  },
};

const folderTypes = [
  { title: 'Personal Data Sheet', documentType: 'pds' },
  { title: 'Service Records', documentType: 'sr' },
  { title: 'Certificate of Employment', documentType: 'coe' },
  { title: 'Contract of Employment', documentType: 'contract' },
];


interface Document {
  id: string;
  name: string;
  employeeId: string | null;
  pds: string | null;
  sr: string | null;
  coe: string | null;
  date: string;
}

const Documents = () => {
  // Redirect to /documents/employee to match sidebar behavior
  return <Navigate to="/documents/employee" replace />;
  const [selectedFolder, setSelectedFolder] = useState<null | typeof folderCards[number]>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [activeModal, setActiveModal] = useState<NavCardKey | null>(null);
  const [modalForm, setModalForm] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({
    'Personal Data Sheet': 0,
    'Service Records': 0,
    'Certificate of Employment': 0,
    'Contract of Employment': 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showEditDocDialog, setShowEditDocDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState<{ employeeId: string; type: 'pds' | 'sr' | 'coe' | 'contract'; currentUrl: string | null } | null>(null);
  const [editDocFile, setEditDocFile] = useState<File | null>(null);
  const [folderDocuments, setFolderDocuments] = useState<any[]>([]);
  const [folderSearchTerm, setFolderSearchTerm] = useState('');

  // Helper function to fetch and process documents
  const fetchAndProcessDocuments = async () => {
    try {
      const [documentsRes, employeesRes, allDocsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/documents?type=employee-doc`),
        fetch(`${API_BASE_URL}/employees?status=active`),
        fetch(`${API_BASE_URL}/documents?type=employee-doc`),
      ]);

      if (!documentsRes.ok) {
        throw new Error('Failed to fetch documents');
      }

      const documentsData = await documentsRes.json();
      const allDocsData = await allDocsRes.json();
      let employeesData: any[] = [];

      if (employeesRes.ok) {
        const empData = await employeesRes.json();
        employeesData = empData.data || [];
        setEmployees(employeesData);
      }

      // Count files by document type
      const counts: Record<string, number> = {
        'Personal Data Sheet': 0,
        'Service Records': 0,
        'Certificate of Employment': 0,
        'Contract of Employment': 0,
      };

      // Track which employee files we've already counted from employees table
      const countedEmployeeFiles = new Set<string>();

      // Count from employees table first (pds_file, service_record_file)
      employeesData.forEach((emp: any) => {
        if (emp.pdsFile) {
          counts['Personal Data Sheet']++;
          countedEmployeeFiles.add(`${emp.employeeId}_pds`);
        }
        if (emp.serviceRecordFile) {
          counts['Service Records']++;
          countedEmployeeFiles.add(`${emp.employeeId}_sr`);
        }
      });

      // Count from documents table (avoid double-counting if same file exists in both)
      allDocsData.data.forEach((doc: any) => {
        if (!doc.employeeId) return; // Skip documents without employee ID
        
        const docType = doc.documentType?.toLowerCase() || '';
        const name = doc.name.toLowerCase();
        const fileKey = `${doc.employeeId}_${docType}`;
        
        // Only count if not already counted from employees table
        if (docType === 'pds' || name.includes('pds') || name.includes('personal data')) {
          if (!countedEmployeeFiles.has(`${doc.employeeId}_pds`)) {
            counts['Personal Data Sheet']++;
          }
        } else if (docType === 'sr' || name.includes('service')) {
          if (!countedEmployeeFiles.has(`${doc.employeeId}_sr`)) {
            counts['Service Records']++;
          }
        } else if (docType === 'coe' || name.includes('certificate') || name.includes('coe')) {
          counts['Certificate of Employment']++;
        } else if (docType === 'contract' || name.includes('contract')) {
          counts['Contract of Employment']++;
        }
      });

      setFolderCounts(counts);
      
      // Create employee map for names and files
      const employeeMap = new Map(employeesData.map((emp: any) => [emp.employeeId, emp]));
      
      // Group documents by employee
      const employeeDocs = new Map<string, Document>();
      
      // First, add documents from employees table (pds_file, service_record_file)
      employeesData.forEach((emp: any) => {
        if (emp.employeeId && !employeeDocs.has(emp.employeeId)) {
          employeeDocs.set(emp.employeeId, {
            id: emp.employeeId,
            name: emp.fullName || '',
            employeeId: emp.employeeId,
            pds: emp.pdsFile ? `/uploads/${emp.pdsFile}` : null,
            sr: emp.serviceRecordFile ? `/uploads/${emp.serviceRecordFile}` : null,
            coe: null,
            date: emp.createdAt || new Date().toISOString(),
          });
        } else if (emp.employeeId) {
          const empDoc = employeeDocs.get(emp.employeeId)!;
          if (emp.pdsFile && !empDoc.pds) {
            empDoc.pds = `/uploads/${emp.pdsFile}`;
          }
          if (emp.serviceRecordFile && !empDoc.sr) {
            empDoc.sr = `/uploads/${emp.serviceRecordFile}`;
          }
        }
      });
      
      // Then, add/update with documents from documents table
      documentsData.data.forEach((doc: any) => {
        if (doc.employeeId) {
          if (!employeeDocs.has(doc.employeeId)) {
            const employee = employeeMap.get(doc.employeeId);
            employeeDocs.set(doc.employeeId, {
              id: doc.employeeId,
              name: employee?.fullName || '',
              employeeId: doc.employeeId,
              pds: null,
              sr: null,
              coe: null,
              date: doc.createdAt || doc.uploadedAt,
            });
          }
          
          const empDoc = employeeDocs.get(doc.employeeId)!;
          const docType = doc.documentType?.toLowerCase() || '';
          if (docType === 'pds' || doc.name.toLowerCase().includes('pds') || doc.name.toLowerCase().includes('personal data')) {
            empDoc.pds = doc.fileUrl;
          } else if (docType === 'sr' || doc.name.toLowerCase().includes('service')) {
            empDoc.sr = doc.fileUrl;
          } else if (docType === 'coe' || doc.name.toLowerCase().includes('certificate')) {
            empDoc.coe = doc.fileUrl;
          }
        }
      });
      
      setDocuments(Array.from(employeeDocs.values()));
    } catch (error) {
      console.error('Error fetching documents', error);
      throw error;
    }
  };

  // Fetch documents and employees from API
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        await fetchAndProcessDocuments();
      } catch (error) {
        console.error('Error fetching documents', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load documents',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [toast]);

  const openModal = (key: NavCardKey) => {
    // For reports, navigate to the actual report pages
    if (key === 'employeeReports') {
      // Navigate to employee documents page
      navigate('/documents/employee');
      return;
    }
    if (key === 'attendanceReports') {
      // Navigate to attendance report page
      navigate('/attendance/report');
      return;
    }
    
    setActiveModal(key);
    setModalForm({});
  };

  const handleModalFieldChange = (name: string, value: string) => {
    setModalForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleModalSubmit = async () => {
    if (!activeModal) return;

    try {
      if (activeModal === 'documents' || activeModal === 'templates') {
        const fileInput = document.querySelector(`input[type="file"]`) as HTMLInputElement;
        const file = fileInput?.files?.[0];
        
        if (!file) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Please select a file to upload',
          });
          return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', modalForm.documentTitle || modalForm.templateName || file.name);
        formData.append('type', activeModal === 'templates' ? 'template' : 'other');
        formData.append('category', modalForm.templateCategory || '');
        formData.append('description', modalForm.documentDescription || '');
        formData.append('uploadedBy', user?.fullName || 'System');

        const response = await fetch(`${API_BASE_URL}/documents`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload document');
        }

        toast({
          title: modalConfigs[activeModal].title,
          description: modalConfigs[activeModal].successMessage,
        });

        // Refresh documents list
        if (activeModal === 'documents') {
          await fetchAndProcessDocuments();
        }
      } else {
        // For reports, just show success message
        toast({
          title: modalConfigs[activeModal].title,
          description: modalConfigs[activeModal].successMessage,
        });
      }

      setActiveModal(null);
      setModalForm({});
    } catch (error) {
      console.error('Error submitting form', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload document. Please try again.',
      });
    }
  };
  const filteredDocs = documents.filter((doc) =>
    [doc.name, doc.employeeId, doc.pds, doc.sr, doc.coe].some((value) =>
      value?.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );

  return (
    <DashboardLayoutNew>
      <div className="space-y-6">
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-2xl">Documents</CardTitle>
            <p className="text-sm text-muted-foreground">Workspace for employee files</p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {navCards.map((card) => (
              <button
                type="button"
                key={card.key}
                className="rounded-xl border border-border/60 bg-card p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/40 hover:border-primary hover:shadow-sm"
                onClick={() => openModal(card.key)}
              >
                <p className="text-base font-semibold">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-xl">Folders</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {folderTypes.map((folder) => (
              <button
                key={folder.title}
                className="rounded-xl border border-border/60 bg-gradient-to-b from-blue-50 to-white p-4 text-center transition hover:border-primary focus:outline-none"
                onClick={async () => {
                  setSelectedFolder({ title: folder.title, count: `${folderCounts[folder.title]} files` });
                  
                  // Fetch documents for this folder type
                  try {
                    const response = await fetch(`${API_BASE_URL}/documents?type=employee-doc&documentType=${folder.documentType}`);
                    if (response.ok) {
                      const data = await response.json();
                      const filteredDocs = data.data.filter((doc: any) => {
                        const docType = doc.documentType?.toLowerCase() || '';
                        const name = doc.name.toLowerCase();
                        if (folder.documentType === 'pds') {
                          return docType === 'pds' || name.includes('pds') || name.includes('personal data');
                        } else if (folder.documentType === 'sr') {
                          return docType === 'sr' || name.includes('service');
                        } else if (folder.documentType === 'coe') {
                          return docType === 'coe' || name.includes('certificate');
                        } else if (folder.documentType === 'contract') {
                          return docType === 'contract' || name.includes('contract');
                        }
                        return false;
                      });
                      
                      // Also include files from employees table
                      const empDocs = employees
                        .filter(emp => {
                          if (folder.documentType === 'pds' && emp.pdsFile) return true;
                          if (folder.documentType === 'sr' && emp.serviceRecordFile) return true;
                          return false;
                        })
                        .map(emp => ({
                          id: emp.id,
                          name: emp.fullName,
                          employeeId: emp.employeeId,
                          fileUrl: folder.documentType === 'pds' ? `/uploads/${emp.pdsFile}` : `/uploads/${emp.serviceRecordFile}`,
                          fileSize: 'N/A',
                          uploadedAt: emp.createdAt,
                        }));
                      
                      setFolderDocuments([...filteredDocs, ...empDocs]);
                    }
                  } catch (error) {
                    console.error('Error fetching folder documents', error);
                  }
                  
                  setShowFolderModal(true);
                }}
              >
                <div className="flex justify-center mb-2">
                  <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Folder className="w-12 h-12 text-blue-600" />
                  </div>
                </div>
                <p className="font-medium">{folder.title}</p>
                <p className="text-xs text-muted-foreground">{folderCounts[folder.title]} files</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl">Documents</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-full"
              />
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">Employee Name</th>
                    <th className="py-3 px-4 text-left font-medium">Employee ID</th>
                    <th className="py-3 px-4 text-left font-medium">Personal Data Sheet</th>
                    <th className="py-3 px-4 text-left font-medium">Service Records</th>
                    <th className="py-3 px-4 text-left font-medium">Certificate of Employments</th>
                    <th className="py-3 px-4 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        Loading documents...
                      </td>
                    </tr>
                  ) : filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No documents found
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc, idx) => (
                      <tr key={doc.id || idx} className={idx % 2 === 0 ? 'bg-[#eef3ff]' : 'bg-white'}>
                        <td className="py-3 px-4 font-medium text-foreground">{doc.name || 'N/A'}</td>
                        <td className="py-3 px-4">{doc.employeeId || 'N/A'}</td>
                        <td className="py-3 px-4">
                          {doc.pds ? (
                            <div className="flex items-center gap-2">
                              <a href={`${API_BASE_URL}${doc.pds}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                View
                              </a>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  // Open edit dialog for PDS
                                  setEditingDoc({ employeeId: doc.employeeId, type: 'pds', currentUrl: doc.pds });
                                  setShowEditDocDialog(true);
                                }}
                                title="Edit PDS"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingDoc({ employeeId: doc.employeeId, type: 'pds', currentUrl: null });
                                setShowEditDocDialog(true);
                              }}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Upload
                            </Button>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {doc.sr ? (
                            <div className="flex items-center gap-2">
                              <a href={`${API_BASE_URL}${doc.sr}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                View
                              </a>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setEditingDoc({ employeeId: doc.employeeId, type: 'sr', currentUrl: doc.sr });
                                  setShowEditDocDialog(true);
                                }}
                                title="Edit Service Records"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingDoc({ employeeId: doc.employeeId, type: 'sr', currentUrl: null });
                                setShowEditDocDialog(true);
                              }}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Upload
                            </Button>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {doc.coe ? (
                            <div className="flex items-center gap-2">
                              <a href={`${API_BASE_URL}${doc.coe}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                View
                              </a>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setEditingDoc({ employeeId: doc.employeeId, type: 'coe', currentUrl: doc.coe });
                                  setShowEditDocDialog(true);
                                }}
                                title="Edit COE"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingDoc({ employeeId: doc.employeeId, type: 'coe', currentUrl: null });
                                setShowEditDocDialog(true);
                              }}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Upload
                            </Button>
                          )}
                        </td>
                        <td className="py-3 px-4">{new Date(doc.date).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Folder Modal */}
        <Dialog open={showFolderModal} onOpenChange={setShowFolderModal}>
          <DialogContent className="max-w-3xl w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                  <Search className="w-4 h-4 text-primary" />
                </div>
                {selectedFolder?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search" 
                  className="pl-9 rounded-full"
                  value={folderSearchTerm}
                  onChange={(e) => setFolderSearchTerm(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-primary text-white">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium">Employee Name</th>
                      <th className="py-3 px-4 text-left font-medium">Employee ID</th>
                      <th className="py-3 px-4 text-left font-medium">File</th>
                      <th className="py-3 px-4 text-left font-medium">Size</th>
                      <th className="py-3 px-4 text-left font-medium">Date Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {folderDocuments
                      .filter(doc => 
                        !folderSearchTerm || 
                        doc.name?.toLowerCase().includes(folderSearchTerm.toLowerCase()) ||
                        doc.employeeId?.toLowerCase().includes(folderSearchTerm.toLowerCase())
                      )
                      .length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No documents found
                        </td>
                      </tr>
                    ) : (
                      folderDocuments
                        .filter(doc => 
                          !folderSearchTerm || 
                          doc.name?.toLowerCase().includes(folderSearchTerm.toLowerCase()) ||
                          doc.employeeId?.toLowerCase().includes(folderSearchTerm.toLowerCase())
                        )
                        .map((doc, idx) => (
                          <tr key={doc.id || idx} className={idx % 2 === 0 ? 'bg-[#eef3ff]' : 'bg-white'}>
                            <td className="py-3 px-4 font-medium text-foreground">{doc.name || 'N/A'}</td>
                            <td className="py-3 px-4">{doc.employeeId || 'N/A'}</td>
                            <td className="py-3 px-4">
                              <a 
                                href={`${API_BASE_URL}${doc.fileUrl}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 underline"
                              >
                                View
                              </a>
                            </td>
                            <td className="py-3 px-4">{doc.fileSize || 'N/A'}</td>
                            <td className="py-3 px-4">{new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick actions modal */}
        <Dialog open={Boolean(activeModal)} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="max-w-lg">
            {activeModal && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl">{modalConfigs[activeModal].title}</DialogTitle>
                  <DialogDescription>{modalConfigs[activeModal].description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {modalConfigs[activeModal].fields.map((field) => (
                    <Input
                      key={field.name}
                      placeholder={field.placeholder}
                      type={field.type ?? 'text'}
                      value={field.type === 'file' ? undefined : modalForm[field.name] ?? ''}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        if (field.type === 'file') {
                          const fileName = event.target.files?.[0]?.name ?? '';
                          handleModalFieldChange(field.name, fileName);
                        } else {
                          handleModalFieldChange(field.name, event.target.value);
                        }
                      }}
                    />
                  ))}
                  <Button onClick={handleModalSubmit}>{modalConfigs[activeModal].cta}</Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Document Dialog */}
        <Dialog open={showEditDocDialog} onOpenChange={setShowEditDocDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDoc && `Edit ${editingDoc.type.toUpperCase()} - ${editingDoc.employeeId}`}
              </DialogTitle>
              <DialogDescription>
                {editingDoc?.currentUrl ? 'Replace the current document or download it.' : 'Upload a new document.'}
              </DialogDescription>
            </DialogHeader>
            {editingDoc && (
              <div className="space-y-4">
                {editingDoc.currentUrl && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`${API_BASE_URL}${editingDoc.currentUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      Download Current Document
                    </a>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Upload New Document (PDF/DOC)</Label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setEditDocFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setShowEditDocDialog(false);
                    setEditingDoc(null);
                    setEditDocFile(null);
                  }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!editDocFile && !editingDoc.currentUrl) {
                        toast({
                          variant: 'destructive',
                          title: 'Error',
                          description: 'Please select a file to upload',
                        });
                        return;
                      }

                      try {
                        if (editDocFile) {
                          const formData = new FormData();
                          formData.append('file', editDocFile);
                          formData.append('name', `${editingDoc.type}_${editingDoc.employeeId}`);
                          formData.append('type', 'employee-doc');
                          formData.append('employeeId', editingDoc.employeeId);
                          formData.append('documentType', editingDoc.type);
                          formData.append('uploadedBy', user?.fullName || 'System');

                          const response = await fetch(`${API_BASE_URL}/documents`, {
                            method: 'POST',
                            body: formData,
                          });

                          if (!response.ok) {
                            throw new Error('Failed to upload document');
                          }

                          toast({
                            title: 'Success',
                            description: 'Document uploaded successfully',
                          });

                          // Refresh documents
                          await fetchAndProcessDocuments();
                        }

                        setShowEditDocDialog(false);
                        setEditingDoc(null);
                        setEditDocFile(null);
                      } catch (error) {
                        console.error('Error uploading document', error);
                        toast({
                          variant: 'destructive',
                          title: 'Error',
                          description: 'Failed to upload document. Please try again.',
                        });
                      }
                    }}
                  >
                    {editingDoc.currentUrl ? 'Replace' : 'Upload'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayoutNew>
  );
};

export default Documents;
