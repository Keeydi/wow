import { useState, useMemo, useEffect } from 'react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Search, Users, Download, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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
}

interface AttendanceRecord {
  name: string;
  type: string;
  signIn: string;
  signOut: string;
  status: string;
  employeeId: string;
  attendanceId?: string;
  rawStatus?: string;
  rawCheckIn?: string;
  rawCheckOut?: string;
}

interface DepartmentRecord {
  department: string;
  date: string;
  records: AttendanceRecord[];
}

const toolbarButtons = [
  { label: 'Present Employees List', bg: 'bg-[#e3f2ff]', border: 'border-[#6cb3ff]', text: 'text-[#1c6ed3]' },
  { label: 'Absent Employees List', bg: 'bg-[#e7f4ff]', border: 'border-[#5aaeea]', text: 'text-[#146fbf]' },
  { label: 'Late Employees List', bg: 'bg-[#fef3d4]', border: 'border-[#f5c248]', text: 'text-[#c98204]' },
];

const AttendanceList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{ record: AttendanceRecord; date: string } | null>(null);
  const [editStatus, setEditStatus] = useState<'present' | 'absent' | 'late' | 'half-day' | 'leave'>('present');
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
          let attendanceRecords = attendanceData.data || [];
          
          // Auto-mark absent employees if no attendance by 5 PM
          if (employeesRes.ok) {
            const employeesData = await employeesRes.json();
            const activeEmployees = employeesData.data || [];
            const today = new Date().toISOString().split('T')[0];
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            // If it's past 5 PM, mark employees without attendance as absent
            if (currentHour >= 17) { // 5 PM
              const todayAttendance = attendanceRecords.filter((att: Attendance) => att.date === today);
              const attendedEmployeeIds = new Set(todayAttendance.map((att: Attendance) => att.employeeId));
              
              activeEmployees.forEach((emp: Employee) => {
                if (!attendedEmployeeIds.has(emp.employeeId)) {
                  // Check if absent record already exists
                  const existingAbsent = attendanceRecords.find(
                    (att: Attendance) => att.employeeId === emp.employeeId && att.date === today && att.status === 'absent'
                  );
                  
                  if (!existingAbsent) {
                    // Create absent record
                    attendanceRecords.push({
                      id: `absent-${emp.employeeId}-${today}`,
                      employeeId: emp.employeeId,
                      employeeName: emp.fullName,
                      date: today,
                      checkIn: undefined,
                      checkOut: undefined,
                      status: 'absent',
                      notes: 'Auto-marked absent - no attendance by 5 PM',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                  }
                }
              });
            }
          }
          
          setAttendance(attendanceRecords);
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
    
    // Refresh every minute to check for auto-absent
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [toast]);

  const departmentRecords = useMemo(() => {
    const employeeMap = new Map(employees.map(emp => [emp.employeeId, emp]));

    // Group attendance by department and date
    const grouped = new Map<string, Map<string, AttendanceRecord[]>>();

    attendance.forEach(att => {
      const employee = employeeMap.get(att.employeeId);
      const dept = employee?.department || 'Unassigned';
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
        if (!time) return '-';
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

      deptMap.get(date)!.push({
        name: att.employeeName || employee?.fullName || 'Unknown',
        type: employee?.position || 'Regular',
        signIn: formatTime(att.checkIn || ''),
        signOut: formatTime(att.checkOut || ''),
        status: statusText,
        employeeId: att.employeeId,
        attendanceId: att.id,
        rawStatus: att.status,
        rawCheckIn: att.checkIn || '',
        rawCheckOut: att.checkOut || '',
      });
    });

    // Convert to array format and filter by search
    const sections: DepartmentRecord[] = [];
    grouped.forEach((deptMap, department) => {
      deptMap.forEach((records, date) => {
        const filtered = records.filter(rec =>
          rec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rec.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (filtered.length > 0) {
          sections.push({ department, date, records: filtered });
        }
      });
    });

    // Sort by date (newest first)
    sections.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return sections;
  }, [searchTerm, attendance, employees]);

  const handleEditClick = (record: AttendanceRecord, date: string) => {
    if (user?.role !== 'admin') {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only admins can edit attendance records.',
      });
      return;
    }

    // Find the actual attendance record
    const attendanceRecord = attendance.find(att => att.id === record.attendanceId);

    if (attendanceRecord) {
      setEditingRecord({ record, date });
      setEditStatus(attendanceRecord.status);
      setEditCheckIn(attendanceRecord.checkIn || '');
      setEditCheckOut(attendanceRecord.checkOut || '');
      setEditNotes(attendanceRecord.notes || '');
      setEditModalOpen(true);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Attendance record not found.',
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !editingRecord.record.attendanceId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot save: attendance record not found.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/${editingRecord.record.attendanceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: editStatus,
          checkIn: editCheckIn || null,
          checkOut: editCheckOut || null,
          notes: editNotes || null,
          updatedBy: user?.fullName || 'Admin',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update attendance record');
      }

      const data = await response.json();
      const updated = data.data;

      // Update local state
      setAttendance(prev => prev.map(att => 
        att.id === updated.id ? updated : att
      ));

      toast({
        title: 'Success',
        description: 'Attendance record updated successfully.',
      });
      setEditModalOpen(false);
      setEditingRecord(null);
    } catch (error) {
      console.error('Error updating attendance', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unable to update attendance record. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayoutNew>
      <div className="space-y-6">
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between bg-card rounded-t-xl">
            <div>
              <p className="text-xs uppercase text-muted-foreground tracking-[0.3em]">Attendance</p>
              <CardTitle className="text-2xl">Welcome back, Admin!</CardTitle>
            </div>
            <div className="bg-primary/10 rounded-full p-3 text-primary">
              <CalendarDays className="w-6 h-6" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 pt-4">
            {toolbarButtons.map((btn) => (
              <Button
                key={btn.label}
                variant="outline"
                className={`rounded-full px-5 h-auto py-3 flex items-center gap-2 border ${btn.border} ${btn.bg} ${btn.text} hover:opacity-90`}
              >
                <Users className="w-4 h-4" />
                {btn.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-xl">Attendance List</CardTitle>
                <p className="text-sm text-muted-foreground">Daily summary per department</p>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>

          <div className="divide-y">
            {departmentRecords.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No attendance records found.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add attendance records to see them here.
                </p>
              </div>
            ) : (
              departmentRecords.map((dept, sectionIndex) => (
                <div key={`${dept.department}-${dept.date}-${sectionIndex}`} className="py-6 px-0 space-y-4">
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
                      className="rounded-full px-5"
                      onClick={() => {
                        const csvRows: string[] = [];
                        csvRows.push('Employee Name,Employee ID,Employee Type,Date,Sign In Time,Sign Out Time,Attendance Status');
                        dept.records.forEach(rec => {
                          csvRows.push(
                            `"${rec.name}","${rec.employeeId}","${rec.type}","${new Date(dept.date).toLocaleDateString()}","${rec.signIn}","${rec.signOut}","${rec.status}"`
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
                          title: "Report Generated",
                          description: `CSV exported for ${dept.department}`,
                        });
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-t border-border/60">
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
                        {dept.records.map((rec, index) => (
                          <tr key={`${rec.employeeId}-${dept.date}-${index}`} className={index % 2 === 0 ? 'bg-[#eef3ff]' : 'bg-white'}>
                            <td className="py-3 px-4 font-medium text-foreground">{rec.name}</td>
                            <td className="py-3 px-4">{rec.type}</td>
                            <td className="py-3 px-4">{new Date(dept.date).toLocaleDateString()}</td>
                            <td className="py-3 px-4">{rec.signIn}</td>
                            <td className="py-3 px-4">{rec.signOut}</td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary" className="rounded-full px-3 bg-primary/10 text-primary">
                                {rec.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(rec, dept.date)}
                                className="text-primary hover:text-primary/80 hover:bg-primary/10"
                                disabled={user?.role !== 'admin'}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
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

        {/* Edit Attendance Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Attendance</DialogTitle>
              <DialogDescription>
                {editingRecord && `Update attendance for ${editingRecord.record.name} on ${new Date(editingRecord.date).toLocaleDateString()}`}
              </DialogDescription>
            </DialogHeader>
            {editingRecord && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Employee Name</Label>
                    <Input value={editingRecord.record.name} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Employee ID</Label>
                    <Input value={editingRecord.record.employeeId} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input 
                    value={new Date(editingRecord.date).toLocaleDateString()} 
                    disabled 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sign In Time</Label>
                    <Input
                      type="time"
                      value={editCheckIn}
                      onChange={(e) => setEditCheckIn(e.target.value)}
                      disabled={editStatus === 'leave' || editStatus === 'absent'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sign Out Time</Label>
                    <Input
                      type="time"
                      value={editCheckOut}
                      onChange={(e) => setEditCheckOut(e.target.value)}
                      disabled={editStatus === 'leave' || editStatus === 'absent'}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Attendance Status</Label>
                  <Select value={editStatus} onValueChange={(value: 'present' | 'absent' | 'late' | 'half-day' | 'leave') => {
                    setEditStatus(value);
                    if (value === 'leave' || value === 'absent') {
                      setEditCheckIn('');
                      setEditCheckOut('');
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="half-day">Half Day</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add notes about this attendance record..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingRecord(null);
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
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

export default AttendanceList;
