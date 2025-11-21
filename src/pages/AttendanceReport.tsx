import { useMemo, useState, useEffect } from 'react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReportRow {
  name: string;
  type: string;
  date: string;
  signIn: string;
  signOut: string;
  status: string;
  employeeId: string;
}

interface ReportSection {
  department: string;
  date: string;
  rows: ReportRow[];
}

interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'leave';
  notes?: string;
  checkInImage?: string;
  checkOutImage?: string;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  department: string;
  position: string;
  employmentType?: string;
}

const AttendanceReport = () => {
  // Set default date to today for easy daily report generation
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCOEDialog, setShowCOEDialog] = useState(false);
  const [selectedEmployeeForCOE, setSelectedEmployeeForCOE] = useState<{ employeeId: string; name: string } | null>(null);
  const [isGeneratingCOE, setIsGeneratingCOE] = useState(false);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  // Fetch attendance and employees from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [attendanceRes, employeesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/attendance`),
          fetch(`${API_BASE_URL}/employees?status=active`),
        ]);

        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          setAttendance(attendanceData.data || []);
        }

        if (employeesRes.ok) {
          const employeesData = await employeesRes.json();
          setEmployees(employeesData.data || []);
        }
      } catch (error) {
        console.error('Error fetching data', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Unable to load attendance data. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast, API_BASE_URL]);

  const reportData = useMemo(() => {
    // Filter attendance by date range if provided, otherwise show all
    let allAttendance = attendance;
    if (startDate && endDate) {
      allAttendance = attendance.filter(att => {
        const attDate = new Date(att.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return attDate >= start && attDate <= end;
      });
    } else if (startDate) {
      // If only start date is provided, show that single day
      allAttendance = attendance.filter(att => att.date === startDate);
    }

    const employeeMap = new Map(employees.map(emp => [emp.employeeId, emp]));

    // Group attendance by department and date
    const grouped = new Map<string, Map<string, ReportRow[]>>();

    allAttendance.forEach(att => {
      const employee = employeeMap.get(att.employeeId);
      if (!employee) return;

      const dept = employee.department || 'Unassigned';
      const date = att.date;

      if (!grouped.has(dept)) {
        grouped.set(dept, new Map());
      }

      const deptMap = grouped.get(dept)!;
      if (!deptMap.has(date)) {
        deptMap.set(date, []);
      }

      const statusMap: Record<string, string> = {
        present: 'Present',
        absent: 'Absent',
        late: 'Late',
        'half-day': 'Half Day',
        leave: 'Leave',
      };

      const formatTime = (time: string) => {
        if (!time) return '---------';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      };

      // Calculate minutes late if check-in is after 8:11 AM
      let statusText = statusMap[att.status] || att.status;
      if (att.checkIn && (att.status === 'late' || att.status === 'present')) {
        const checkInTime = new Date(`2000-01-01T${att.checkIn}`);
        const expectedTime = new Date('2000-01-01T08:11'); // 8:11 AM threshold
        const minutesLate = Math.floor((checkInTime.getTime() - expectedTime.getTime()) / 60000);
        
        if (minutesLate > 0) {
          statusText = `Late (${minutesLate} mins)`;
        } else if (att.status === 'late') {
          statusText = 'Late';
        }
      }

      // Use employmentType instead of position
      const employmentType = employee.employmentType || 'Regular';
      // Ensure it's one of the valid types
      const validTypes = ['Regular', 'Contractual', 'Probationary', 'Project-Based'];
      const employeeType = validTypes.includes(employmentType) ? employmentType : 'Regular';

      deptMap.get(date)!.push({
        name: employee.fullName,
        type: employeeType,
        date: new Date(date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-'),
        signIn: formatTime(att.checkIn),
        signOut: formatTime(att.checkOut || ''),
        status: statusText,
        employeeId: att.employeeId,
      });
    });

    // Convert to array format
    const sections: ReportSection[] = [];
    grouped.forEach((deptMap, department) => {
      deptMap.forEach((rows, date) => {
        sections.push({ department, date, rows });
      });
    });

    // Sort by date (newest first)
    sections.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter by search term
    const filtered = sections.map(section => ({
      ...section,
      rows: section.rows.filter(row =>
        row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    })).filter(section => section.rows.length > 0);

    return filtered;
  }, [searchTerm, startDate, endDate, attendance, employees]);

  const handleGenerate = () => {
    if (!startDate) {
      toast({
        variant: "destructive",
        title: "Date Required",
        description: "Please select at least a start date to generate a report.",
      });
      return;
    }

    // If only start date is provided, use it as both start and end (single day report)
    const reportStartDate = startDate;
    const reportEndDate = endDate || startDate;

    if (reportData.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "No attendance records found for the selected date(s).",
      });
      return;
    }

    // Generate CSV
    const csvRows: string[] = [];
    csvRows.push('Department,Date,Employee Name,Employee ID,Employee Type,Sign In Time,Sign Out Time,Attendance Status');

    reportData.forEach(section => {
      section.rows.forEach(row => {
        csvRows.push(
          `"${section.department}","${section.date}","${row.name}","${row.employeeId}","${row.type}","${row.signIn}","${row.signOut}","${row.status}"`
        );
      });
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fileName = endDate && endDate !== startDate
      ? `attendance_report_${reportStartDate}_to_${reportEndDate}.csv`
      : `attendance_report_${reportStartDate}.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Report Generated",
      description: endDate && endDate !== startDate
        ? `Attendance report exported successfully for ${reportStartDate} to ${reportEndDate}.`
        : `Attendance report exported successfully for ${reportStartDate}.`,
    });
  };

  const handleGenerateCOE = async (employeeId: string, employeeName: string) => {
    setSelectedEmployeeForCOE({ employeeId, name: employeeName });
    setShowCOEDialog(true);
  };

  const generateCOEDocument = async () => {
    if (!selectedEmployeeForCOE) return;

    try {
      setIsGeneratingCOE(true);
      
      // Fetch employee data from API
      const employeeResponse = await fetch(`${API_BASE_URL}/employees`);
      if (!employeeResponse.ok) {
        throw new Error('Failed to fetch employee data');
      }
      const employeeData = await employeeResponse.json();
      const employee = employeeData.data?.find((emp: any) => emp.employeeId === selectedEmployeeForCOE.employeeId);
      
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Generate COE HTML content
      const coeHTML = generateCOEHTML(employee);
      
      // Create a new window and print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(coeHTML);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      toast({
        title: "COE Generated",
        description: `Certificate of Employment generated for ${selectedEmployeeForCOE.name}.`,
      });
      
      setShowCOEDialog(false);
      setSelectedEmployeeForCOE(null);
    } catch (error) {
      console.error('Error generating COE:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate COE. Please try again.',
      });
    } finally {
      setIsGeneratingCOE(false);
    }
  };

  const generateCOEHTML = (employee: any): string => {
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate of Employment - ${employee.fullName}</title>
  <style>
    @page {
      size: letter;
      margin: 1in;
    }
    body {
      font-family: 'Times New Roman', serif;
      line-height: 1.6;
      color: #000;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .header p {
      font-size: 14px;
      margin: 5px 0;
    }
    .certificate-title {
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      margin: 30px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content {
      text-align: justify;
      font-size: 14px;
      line-height: 2;
      margin: 20px 0;
    }
    .content p {
      margin: 15px 0;
      text-indent: 50px;
    }
    .signature-section {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 45%;
    }
    .signature-line {
      border-top: 1px solid #000;
      margin-top: 60px;
      padding-top: 5px;
      text-align: center;
      font-size: 12px;
    }
    .date {
      text-align: right;
      margin-top: 20px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>GENERAL PEDRO CORPUS COLLEGE</h1>
    <p>General Pedro Corpus, San Vicente, Palawan</p>
    <p>Email: info@gpcc.edu.ph | Tel: (048) 123-4567</p>
  </div>
  
  <div class="certificate-title">
    CERTIFICATE OF EMPLOYMENT
  </div>
  
  <div class="content">
    <p>
      This is to certify that <strong>${employee.fullName}</strong>, 
      with Employee ID <strong>${employee.employeeId}</strong>, 
      is currently employed at General Pedro Corpus College.
    </p>
    <p>
      ${employee.position ? `He/She holds the position of ${employee.position}` : 'He/She is an employee'} 
      ${employee.department ? `in the ${employee.department} Department` : ''} 
      ${employee.dateHired ? `since ${new Date(employee.dateHired).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}.
    </p>
    <p>
      This certificate is issued upon the request of the employee for whatever legal purpose it may serve.
    </p>
    <p>
      Given this ${currentDate} at General Pedro Corpus, San Vicente, Palawan.
    </p>
  </div>
  
  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">
        <strong>HR Manager</strong>
      </div>
    </div>
    <div class="signature-box">
      <div class="signature-line">
        <strong>School Administrator</strong>
      </div>
    </div>
  </div>
  
  <div class="date">
    Date: ${currentDate}
  </div>
</body>
</html>
    `;
  };

  return (
    <DashboardLayoutNew>
      <div className="space-y-6">
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Attendance Report</CardTitle>
              <p className="text-sm text-muted-foreground">Generate custom date-range summaries</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Field label="Date">
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    // If end date is not set, allow single day report
                  }}
                  max={new Date().toISOString().split('T')[0]}
                />
              </Field>
              <Field label="End Date (Optional)">
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  max={new Date().toISOString().split('T')[0]}
                  placeholder="Leave empty for single day report"
                />
              </Field>
              <div className="flex items-end">
                <Button onClick={handleGenerate} className="w-full" disabled={isLoading}>
                  <Download className="w-4 h-4 mr-2" />
                  {isLoading ? 'Loading...' : 'Generate Report'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <div className="divide-y">
            {reportData.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No attendance records found.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {startDate && endDate
                    ? `Try adjusting the date range or search term.`
                    : 'Add attendance records or adjust your filters.'}
                </p>
              </div>
            ) : (
              reportData.map((dept, sectionIndex) => (
                <div key={`${dept.department}-${dept.date}-${sectionIndex}`} className="py-6">
                  <div className="px-6 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="uppercase text-xs font-semibold text-muted-foreground">{dept.department}</p>
                      <p className="text-sm font-semibold text-foreground">
                        {new Date(dept.date).toLocaleDateString(undefined, {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-full px-5"
                      onClick={() => {
                        const csvRows: string[] = [];
                        csvRows.push('Employee Name,Employee ID,Employee Type,Date,Sign In Time,Sign Out Time,Attendance Status');
                        dept.rows.forEach(row => {
                          csvRows.push(
                            `"${row.name}","${row.employeeId}","${row.type}","${row.date}","${row.signIn}","${row.signOut}","${row.status}"`
                          );
                        });
                        const csvContent = csvRows.join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        const url = URL.createObjectURL(blob);
                        link.setAttribute('href', url);
                        link.setAttribute('download', `attendance_${dept.department.replace(/\s+/g, '_')}_${dept.date}.csv`);
                        link.style.visibility = 'hidden';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast({
                          title: "Export Successful",
                          description: `CSV exported for ${dept.department}`,
                        });
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm border border-border/60 rounded-xl">
                    <thead className="bg-primary text-white">
                      <tr>
                        <th className="py-3 px-4 text-left font-medium">Employee Name</th>
                        <th className="py-3 px-4 text-left font-medium">Employee Type</th>
                        <th className="py-3 px-4 text-left font-medium">Date</th>
                        <th className="py-3 px-4 text-left font-medium">Sign In Time</th>
                        <th className="py-3 px-4 text-left font-medium">Sign Out Time</th>
                        <th className="py-3 px-4 text-left font-medium">Attendance Status</th>
                        <th className="py-3 px-4 text-left font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dept.rows.map((row, index) => (
                        <tr key={`${row.employeeId}-${row.date}-${index}`} className={index % 2 === 0 ? 'bg-[#eef3ff]' : 'bg-white'}>
                          <td className="py-3 px-4 font-medium text-foreground">{row.name}</td>
                          <td className="py-3 px-4">{row.type}</td>
                          <td className="py-3 px-4">{row.date}</td>
                          <td className="py-3 px-4">{row.signIn}</td>
                          <td className="py-3 px-4">{row.signOut}</td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary" className="rounded-full px-3 bg-primary/10 text-primary">
                              {row.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary hover:bg-primary/10 gap-2"
                              onClick={() => handleGenerateCOE(row.employeeId, row.name)}
                            >
                              <FileText className="w-4 h-4" />
                              Generate COE
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* COE Generation Dialog */}
      <Dialog open={showCOEDialog} onOpenChange={setShowCOEDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Certificate of Employment</DialogTitle>
            <DialogDescription>
              Generate a Certificate of Employment for {selectedEmployeeForCOE?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will generate a printable Certificate of Employment document for the selected employee.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCOEDialog(false)} disabled={isGeneratingCOE}>
              Cancel
            </Button>
            <Button onClick={generateCOEDocument} disabled={isGeneratingCOE}>
              {isGeneratingCOE ? 'Generating...' : 'Generate COE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayoutNew>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2 w-full">
    <Label className="text-sm font-semibold text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default AttendanceReport;
