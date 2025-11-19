import { useMemo, useState } from 'react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { employeeStorage } from '@/lib/employeeStorage';
import { useToast } from '@/hooks/use-toast';
import { FileText, Folder, Upload, Download, Search, FileUp } from 'lucide-react';
import { Employee } from '@/types/employee';
import {
  DocumentTemplateKey,
  generateDocumentByTemplate,
} from '@/lib/documentTemplates';

interface EmployeeDocument {
  employeeId: string;
  employeeName: string;
  personalDataSheet: string | null;
  serviceRecords: string | null;
  contractOfEmployment: string | null;
  certificateOfEmployment: string | null;
  date: string;
}

const EmployeeDocuments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [reportDialogType, setReportDialogType] = useState<'employee' | 'attendance' | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [activeFolder, setActiveFolder] = useState<{ id: string; name: string; count: number } | null>(null);
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [generatorEmployeeId, setGeneratorEmployeeId] = useState('');
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [activeTemplateKey, setActiveTemplateKey] = useState<DocumentTemplateKey | null>(null);
  const { toast } = useToast();

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const employees = useMemo(() => employeeStorage.getActive(), []);

  const documentTemplateOptions = useMemo(
    () => [
      { key: 'pds' as DocumentTemplateKey, label: 'Personal Data Sheet', description: 'Auto-fill PDS template' },
      { key: 'file201' as DocumentTemplateKey, label: '201 File Summary', description: 'Snapshot of employee records' },
      { key: 'serviceRecord' as DocumentTemplateKey, label: 'Service Record', description: 'Employment history overview' },
      { key: 'coe' as DocumentTemplateKey, label: 'Certificate of Employment', description: 'COE ready for printing' },
    ],
    [],
  );

  const employeeDocuments = useMemo<EmployeeDocument[]>(
    () =>
      employees.map(emp => ({
        employeeId: emp.employeeId,
        employeeName: emp.fullName,
        personalDataSheet: null,
        serviceRecords: null,
        contractOfEmployment: null,
        certificateOfEmployment: null,
        date: emp.dateHired,
      })),
    [employees],
  );

  const documentCategories = [
    { id: 'documents', name: 'Documents', icon: FileText, action: 'Add' },
    { id: 'templates', name: 'Templates', icon: FileText, action: 'Add' },
    { id: 'employee-reports', name: 'Employee Reports', icon: FileText, action: '' },
    { id: 'attendance-reports', name: 'Attendance Reports', icon: FileText, action: '' },
  ];

  const documentFolders = [
    { id: 'personal-data', name: 'Personal Data Sheet', count: 400 },
    { id: 'service-records', name: 'Service Records', count: 400 },
    { id: 'certificate', name: 'Certificate of Employment', count: 400 },
    { id: 'contract', name: 'Contract of Employment', count: 400 },
  ];

  const normalizeEmployeeId = (value: string) => value.trim().toUpperCase();

  const fetchEmployeeById = async (rawId: string): Promise<Employee | null> => {
    const normalizedId = normalizeEmployeeId(rawId);
    if (!normalizedId) return null;

    const localMatch = employees.find(
      (emp) => emp.employeeId.toUpperCase() === normalizedId,
    );
    if (localMatch) {
      return localMatch;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/employees`);
      if (!response.ok) {
        return null;
      }
      const payload = await response.json();
      const remoteMatch = payload.data?.find(
        (emp: any) =>
          (emp.employeeId || emp.employee_id)?.toUpperCase() === normalizedId,
      );
      return remoteMatch || null;
    } catch (error) {
      console.error('Error fetching employee for template generation', error);
      return null;
    }
  };

  const openDocumentWindow = (html: string) => {
    const docWindow = window.open('', '_blank');
    if (docWindow) {
      docWindow.document.write(html);
      docWindow.document.close();
      docWindow.focus();
    }
  };

  const handleGenerateDocument = async (templateKey: DocumentTemplateKey) => {
    if (!generatorEmployeeId.trim()) {
      toast({
        variant: 'destructive',
        title: 'Employee ID required',
        description: 'Please type an employee ID before generating a document.',
      });
      return;
    }

    setIsGeneratingDocument(true);
    setActiveTemplateKey(templateKey);
    try {
      const employee = await fetchEmployeeById(generatorEmployeeId);
      if (!employee) {
        toast({
          variant: 'destructive',
          title: 'Employee not found',
          description: `No employee matched the ID ${generatorEmployeeId.trim()}.`,
        });
        return;
      }

      const html = generateDocumentByTemplate(templateKey, employee);
      const templateLabel =
        documentTemplateOptions.find((option) => option.key === templateKey)?.label || 'Document';
      openDocumentWindow(html);
      toast({
        title: 'Document ready',
        description: `${templateLabel} generated for ${employee.fullName}.`,
      });
    } catch (error) {
      console.error('Document generation failed', error);
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: 'Unable to generate the selected document. Please try again.',
      });
    } finally {
      setIsGeneratingDocument(false);
      setActiveTemplateKey(null);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!employeeIdInput.trim() || !documentType) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please type the employee ID and choose a document type.',
      });
      return;
    }

    const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please choose a file to upload.',
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('type', 'employee-doc');
      formData.append('employeeId', normalizeEmployeeId(employeeIdInput));
      formData.append('documentType', documentType);
      formData.append('uploadedBy', 'System'); // You can get from auth context

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

      setUploadDialogOpen(false);
      setEmployeeIdInput('');
      setDocumentType('');
    } catch (error) {
      console.error('Error uploading document', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload document. Please try again.',
      });
    }
  };

  const filteredDocuments = employeeDocuments.filter(doc =>
    doc.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategoryClick = (categoryId: string) => {
    switch (categoryId) {
      case 'documents':
        setUploadDialogOpen(true);
        break;
      case 'templates':
        setTemplateDialogOpen(true);
        break;
      case 'employee-reports':
        setReportDialogType('employee');
        break;
      case 'attendance-reports':
        setReportDialogType('attendance');
        break;
      default:
        break;
    }
  };

  const handleTemplateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!templateName.trim() || !templateCategory.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please provide a template name and category.',
      });
      return;
    }

    const fileInput = event.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a file to upload',
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', templateName);
      formData.append('type', 'template');
      formData.append('category', templateCategory);
      formData.append('uploadedBy', 'System'); // You can get from auth context

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload template');
      }

      toast({
        title: 'Template saved',
        description: 'Your template is now available for use.',
      });
      setTemplateDialogOpen(false);
      setTemplateName('');
      setTemplateCategory('');
    } catch (error) {
      console.error('Error uploading template', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload template. Please try again.',
      });
    }
  };

  const reportSamples = {
    employee: [
      { name: 'John Doe', file: 'EmployeeSummary_Q1.docx', size: '65 KB', date: '1/15/2025' },
      { name: 'Jane Smith', file: 'EmployeeSummary_Q2.docx', size: '65 KB', date: '3/10/2025' },
      { name: 'Mike Johnson', file: 'EmployeeSummary_Q3.docx', size: '65 KB', date: '6/20/2025' },
    ],
    attendance: [
      { name: 'Daily Attendance', file: 'AttendanceReport_Jan15.docx', size: '65 KB', date: '1/15/2025' },
      { name: 'Weekly Attendance', file: 'AttendanceReport_Week10.docx', size: '65 KB', date: '3/10/2025' },
      { name: 'Monthly Attendance', file: 'AttendanceReport_June.docx', size: '65 KB', date: '6/20/2025' },
    ],
  };

  const reportData =
    reportDialogType === 'attendance' ? reportSamples.attendance : reportSamples.employee;
  const filteredReports = reportData.filter(
    (item) =>
      item.name.toLowerCase().includes(reportSearch.toLowerCase()) ||
      item.file.toLowerCase().includes(reportSearch.toLowerCase()),
  );

  const closeReportDialog = () => {
    setReportDialogType(null);
    setReportSearch('');
  };

  return (
    <DashboardLayoutNew>
      <div className="space-y-6">
        {/* Header Sections */}
        <div className="space-y-4">
          <Card className="p-4 bg-sidebar border-sidebar-border">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-sidebar-foreground" />
              <h2 className="text-xl font-semibold text-sidebar-foreground">Documents</h2>
            </div>
          </Card>

          <Card className="p-4 bg-sidebar border-sidebar-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileUp className="h-6 w-6 text-sidebar-foreground" />
                <h2 className="text-xl font-semibold text-sidebar-foreground">Upload/Store Documents</h2>
              </div>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Employee Document</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUpload} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Employee ID</Label>
                      <Input
                        value={employeeIdInput}
                        onChange={(e) => setEmployeeIdInput(e.target.value.toUpperCase())}
                        placeholder="Type Employee ID (e.g., 25-GPC-12345)"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Document Type</Label>
                      <select
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                      >
                        <option value="">Select Document Type</option>
                        <option value="personal-data">Personal Data Sheet</option>
                        <option value="service-records">Service Records</option>
                        <option value="certificate">Certificate of Employment</option>
                        <option value="contract">Contract of Employment</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Upload File</Label>
                      <Input type="file" required />
                    </div>

                    <div className="flex gap-3 justify-end">
                      <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Upload</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {documentCategories.map(category => (
            <Card
              key={category.id}
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-2"
              onClick={() => handleCategoryClick(category.id)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <category.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{category.name}</h3>
                  {category.action && (
                    <p className="text-sm text-muted-foreground">{category.action}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Document Generator */}
        <Card className="p-6 border-dashed border-primary/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Generate Employee Documents</h3>
              <p className="text-sm text-muted-foreground">
                Type the employee ID then choose which template to merge automatically.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={generatorEmployeeId}
                onChange={(event) => setGeneratorEmployeeId(event.target.value.toUpperCase())}
                placeholder="Enter Employee ID"
                className="w-full sm:w-64"
              />
              <Button variant="outline" onClick={() => setGeneratorEmployeeId('')}>
                Clear
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {documentTemplateOptions.map((template) => {
              const isActive = activeTemplateKey === template.key;
              return (
                <Card key={template.key} className="p-4 flex flex-col gap-2 border border-border/70">
                  <div>
                    <h4 className="font-semibold">{template.label}</h4>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleGenerateDocument(template.key)}
                    disabled={!generatorEmployeeId.trim() || isGeneratingDocument}
                  >
                    {isActive && isGeneratingDocument ? 'Generating…' : 'Generate'}
                  </Button>
                </Card>
              );
            })}
          </div>
        </Card>

        {/* Document Folders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {documentFolders.map(folder => (
            <Card
              key={folder.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer text-center"
              onClick={() => {
                setActiveFolder(folder);
                setFolderDialogOpen(true);
              }}
            >
              <Folder className="h-16 w-16 mx-auto mb-3 text-blue-400" />
              <h3 className="font-semibold mb-1">{folder.name}</h3>
              <p className="text-sm text-muted-foreground">{folder.count} files</p>
            </Card>
          ))}
        </div>

        {/* Documents Table */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-950/30">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Documents</h3>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Employee Name</th>
                  <th className="text-left py-3 px-4 font-medium">Employee ID</th>
                  <th className="text-left py-3 px-4 font-medium">Personal Data Sheet</th>
                  <th className="text-left py-3 px-4 font-medium">Service Records</th>
                  <th className="text-left py-3 px-4 font-medium">Contract of Employment</th>
                  <th className="text-left py-3 px-4 font-medium">Certificate of Employment</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc.employeeId} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">{doc.employeeName}</td>
                    <td className="py-3 px-4 text-blue-600 font-medium">{doc.employeeId}</td>
                    <td className="py-3 px-4">
                      {doc.personalDataSheet ? (
                        <Button size="sm" variant="ghost" className="text-blue-500">
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not uploaded</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {doc.serviceRecords ? (
                        <Button size="sm" variant="ghost" className="text-blue-500">
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not uploaded</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {doc.contractOfEmployment ? (
                        <Button size="sm" variant="ghost" className="text-blue-500">
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not uploaded</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {doc.certificateOfEmployment ? (
                        <Button size="sm" variant="ghost" className="text-blue-500">
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not uploaded</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {new Date(doc.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
          <DialogContent className="max-w-5xl w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-primary" />
                {activeFolder?.name || 'Folder'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search" className="pl-9 rounded-full" />
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-primary text-white">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium">Name</th>
                      <th className="py-3 px-4 text-left font-medium">Files</th>
                      <th className="py-3 px-4 text-left font-medium">Size</th>
                      <th className="py-3 px-4 text-left font-medium">Date Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeDocuments.slice(0, 4).map((doc, idx) => (
                      <tr key={doc.employeeId} className={idx % 2 === 0 ? 'bg-[#eef3ff]' : 'bg-white'}>
                        <td className="py-3 px-4 font-medium text-foreground">{doc.employeeName}</td>
                        <td className="py-3 px-4 text-blue-600 underline">PersonalDataSheet.docx</td>
                        <td className="py-3 px-4">65 KB</td>
                        <td className="py-3 px-4">{doc.date ? new Date(doc.date).toLocaleDateString() : '02-25-2025'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleTemplateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="e.g. Contract of Employment"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={templateCategory}
                  onChange={(event) => setTemplateCategory(event.target.value)}
                  placeholder="e.g. HR / Finance"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Upload Template</Label>
                <Input type="file" required />
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Template</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(reportDialogType)} onOpenChange={(open) => !open && closeReportDialog()}>
          <DialogContent className="max-w-3xl w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {reportDialogType === 'attendance' ? 'Attendance Reports' : 'Employee Reports'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search"
                  value={reportSearch}
                  onChange={(event) => setReportSearch(event.target.value)}
                  className="pl-10 rounded-full"
                />
              </div>
              <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-primary text-white">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium">Name</th>
                      <th className="py-3 px-4 text-left font-medium">Files</th>
                      <th className="py-3 px-4 text-left font-medium">Size</th>
                      <th className="py-3 px-4 text-left font-medium">Date Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report, index) => (
                      <tr key={report.file} className={index % 2 === 0 ? 'bg-[#eef3ff]' : 'bg-white'}>
                        <td className="py-3 px-4 font-medium text-foreground">{report.name}</td>
                        <td className="py-3 px-4 text-blue-600 underline cursor-pointer">{report.file}</td>
                        <td className="py-3 px-4">{report.size}</td>
                        <td className="py-3 px-4">{report.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayoutNew>
  );
};

export default EmployeeDocuments;
