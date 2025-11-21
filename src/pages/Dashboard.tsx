import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, FileText, TrendingUp, UserCircle, LogOut, Plus, Trash2, Calendar } from 'lucide-react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { employeeStorage } from '@/lib/employeeStorage';
import { attendanceStorage } from '@/lib/attendanceStorage';
import { departmentStorage } from '@/lib/organizationStorage';
import { documentStorage } from '@/lib/documentStorage';
import { todoStorage, Todo } from '@/lib/todoStorage';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type CalendarEventType = 'reminder' | 'event';

type CalendarEvent = {
  id?: string;
  title: string;
  type: CalendarEventType;
  description: string;
  eventDate: string;
  eventTime?: string | null;
  createdBy?: string | null;
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const calendarDays = Array.from({ length: 35 }, (_, i) => (i < 30 ? i + 1 : null));
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [eventType, setEventType] = useState<CalendarEventType>('reminder');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [calendarEvents, setCalendarEvents] = useState<Record<number, CalendarEvent[]>>({});
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [recentActivities, setRecentActivities] = useState<Array<{ action: string; name: string; time: string }>>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [newTodoTask, setNewTodoTask] = useState('');
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
  });

  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();

  // Convert day number to actual date string (YYYY-MM-DD)
  const dayToDate = (day: number): string => {
    const date = new Date(currentYear, currentMonth - 1, day);
    return date.toISOString().split('T')[0];
  };

  // Convert date string to day number
  const dateToDay = (dateStr: string): number | null => {
    const date = new Date(dateStr);
    if (date.getMonth() + 1 !== currentMonth || date.getFullYear() !== currentYear) {
      return null; // Date is not in current month
    }
    return date.getDate();
  };

  // Fetch calendar events for current month
  const fetchCalendarEvents = async () => {
    try {
      setIsLoadingEvents(true);
      const response = await fetch(
        `${API_BASE_URL}/calendar-events?month=${currentMonth}&year=${currentYear}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }
      const data = await response.json();
      
      // Group events by day number
      const eventsByDay: Record<number, CalendarEvent[]> = {};
      data.data.forEach((event: CalendarEvent) => {
        const day = dateToDay(event.eventDate);
        if (day !== null) {
          if (!eventsByDay[day]) {
            eventsByDay[day] = [];
          }
          eventsByDay[day].push(event);
        }
      });
      
      setCalendarEvents(eventsByDay);
    } catch (error) {
      // Silently fail if server is not running
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setCalendarEvents({});
        setIsLoadingEvents(false);
        return;
      }
      console.error('Error fetching calendar events', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Unable to load calendar events. Please try again.',
      });
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // Fetch recent activity logs
  const fetchRecentActivities = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/activity-logs/recent?limit=5`);
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      const data = await response.json();
      
      const activities = data.data.map((log: any) => ({
        action: log.description || `${log.actionType} ${log.resourceType}`,
        name: log.resourceName || log.userName,
        time: getTimeAgo(new Date(log.createdAt)),
      }));
      
      setRecentActivities(activities);
    } catch (error) {
      // Silently fail if server is not running
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setRecentActivities([]);
        return;
      }
      console.error('Error fetching activity logs', error);
    }
  };

  // Fetch today's attendance and calculate stats
  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_BASE_URL}/attendance?date=${today}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance');
      }
      
      const data = await response.json();
      const attendance = data.data || [];
      setTodayAttendance(attendance);
      
      // Get active employees count
      const employeesResponse = await fetch(`${API_BASE_URL}/employees?status=active`);
      let activeEmployeesCount = 0;
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        activeEmployeesCount = employeesData.data?.length || 0;
      }
      
      // Calculate stats
      const present = attendance.filter((att: any) => att.status === 'present').length;
      const late = attendance.filter((att: any) => att.status === 'late').length;
      const absent = activeEmployeesCount - (present + late);
      
      setAttendanceStats({
        present: Math.max(0, present),
        absent: Math.max(0, absent),
        late: Math.max(0, late),
      });
    } catch (error) {
      // Silently fail if server is not running
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setAttendanceStats({ present: 0, absent: 0, late: 0 });
        return;
      }
      console.error('Error fetching attendance', error);
    }
  };

  // Check and reset stats daily at 11:59 PM (resets to 0, then fetches new day data at midnight)
  useEffect(() => {
    const getTodayDateString = () => new Date().toISOString().split('T')[0];
    let lastCheckedDate = getTodayDateString();
    let hasResetToday = false;
    
    const checkAndReset = () => {
      const now = new Date();
      const currentDate = getTodayDateString();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // Check if it's past 11:59 PM (23:59) - reset counts to 0
      if (hours === 23 && minutes >= 59 && !hasResetToday) {
        // Reset stats at 11:59 PM
        setAttendanceStats({ present: 0, absent: 0, late: 0 });
        setTodayAttendance([]);
        hasResetToday = true;
      } 
      // Check if it's a new day (date changed after midnight)
      else if (currentDate !== lastCheckedDate) {
        // New day - reset flag and fetch fresh data
        hasResetToday = false;
        lastCheckedDate = currentDate;
        fetchTodayAttendance();
      }
      // Same day - just fetch/update attendance (unless we just reset)
      else if (!hasResetToday || (hours < 23 || minutes < 59)) {
        fetchTodayAttendance();
      }
    };

    // Check immediately
    checkAndReset();
    
    // Check every minute
    const interval = setInterval(checkAndReset, 60000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load todos
  useEffect(() => {
    setTodos(todoStorage.getAll());
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchCalendarEvents();
      fetchRecentActivities();
      fetchTodayAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, currentYear, user?.role]);

  const handleAddTodo = () => {
    if (!newTodoTask.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a task.',
      });
      return;
    }
    const newTodo = todoStorage.add(newTodoTask);
    setTodos(todoStorage.getAll());
    setNewTodoTask('');
    setShowTodoModal(false);
    toast({
      title: 'Success',
      description: 'Todo added successfully.',
    });
  };

  const handleToggleTodo = (id: string) => {
    todoStorage.toggle(id);
    setTodos(todoStorage.getAll());
  };

  const handleDeleteTodo = (id: string) => {
    todoStorage.delete(id);
    setTodos(todoStorage.getAll());
    toast({
      title: 'Success',
      description: 'Todo deleted successfully.',
    });
  };
  const employeeQuickActions = [
    {
      key: 'attendance',
      title: 'Attendance',
      description: 'View attendance history',
      icon: Clock,
      iconClasses: 'text-accent',
      bg: 'bg-accent/10',
      handler: () => navigate('/attendance/list'),
    },
    {
      key: 'profile',
      title: 'My Profile',
      description: 'Update your information',
      icon: UserCircle,
      iconClasses: 'text-primary',
      bg: 'bg-primary/10',
      handler: () => navigate('/profile'),
    },
    {
      key: 'logout',
      title: 'Logout',
      description: 'Sign out of HR Hub',
      icon: LogOut,
      iconClasses: 'text-destructive',
      bg: 'bg-destructive/10',
      handler: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const handleDayClick = (day: number | null) => {
    if (!day) return;
    console.log('handleDayClick called with day:', day);
    const dateStr = dayToDate(day);
    console.log('Date string:', dateStr);
    setSelectedDay(day);
    setEventType('reminder');
    setEventTitle('');
    setEventDescription('');
    setEventDate(dateStr);
    setEventTime('');
    // Use setTimeout to ensure state updates are processed
    setTimeout(() => {
      console.log('Setting showEventModal to true');
      setShowEventModal(true);
    }, 0);
  };

  const handleEventSave = async () => {
    if (!eventTitle.trim() || !eventDate) {
      return;
    }

    try {
      setIsSavingEvent(true);
      
      const response = await fetch(`${API_BASE_URL}/calendar-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: eventTitle.trim(),
          type: eventType,
          description: eventDescription.trim() || null,
          eventDate,
          eventTime: eventTime || null,
          createdBy: user?.fullName || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save calendar event');
      }

      // Refresh events from API
      await fetchCalendarEvents();
      
      setShowEventModal(false);
      setEventTitle('');
      setEventDescription('');
      setEventDate('');
      setEventTime('');
      
      toast({
        title: 'Success',
        description: 'Event/Reminder saved successfully',
      });
    } catch (error) {
      console.error('Error saving calendar event', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Unable to save event. Please try again.',
      });
    } finally {
      setIsSavingEvent(false);
    }
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Calculate dashboard statistics from database
  const dashboardStats = useMemo(() => {
    const allEmployees = employeeStorage.getAll();
    const activeEmployees = employeeStorage.getActive();
    const inactiveEmployees = employeeStorage.getInactive();
    const allAttendance = attendanceStorage.getAll();
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = allAttendance.filter(att => att.date === today);
    
    // Count present/absent today
    const presentToday = todayAttendance.filter(att => att.status === 'present' || att.status === 'late').length;
    const absentToday = activeEmployees.length - presentToday;
    
    // Get unique departments from employees
    const departments = new Set(activeEmployees.map(emp => emp.department).filter(Boolean));
    const departmentCounts = Array.from(departments).map((dept, index) => {
      const count = activeEmployees.filter(emp => emp.department === dept).length;
      const colors = ['bg-primary', 'bg-accent', 'bg-success', 'bg-warning', 'bg-destructive'];
      return {
        name: dept,
        count,
        color: colors[index % colors.length] || 'bg-primary',
      };
    });

    // Calculate growth (employees added in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentEmployees = allEmployees.filter(emp => 
      new Date(emp.createdAt) >= thirtyDaysAgo
    );
    const previousMonthCount = allEmployees.length - recentEmployees.length;
    const growth = previousMonthCount > 0 
      ? allEmployees.length - previousMonthCount 
      : 0;


    return {
      totalEmployees: allEmployees.length,
      activeEmployees: activeEmployees.length,
      inactiveEmployees: inactiveEmployees.length,
      presentToday,
      absentToday,
      departmentsCount: departments.size,
      departmentCounts,
      growth,
    };
  }, []);

  if (user?.role === 'admin') {
    return (
      <DashboardLayoutNew>
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user.fullName}</p>
          </div>

          {/* Top Navigation Cards */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Card 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/employees')}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <Users className="w-8 h-8 text-primary" />
                  <CardTitle className="text-lg">Employees</CardTitle>
                  <Button variant="link" className="text-primary">View Details</Button>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/attendance/list')}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <Clock className="w-8 h-8 text-primary" />
                  <CardTitle className="text-lg">Attendance</CardTitle>
                  <Button variant="link" className="text-primary">View Details</Button>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/documents')}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <FileText className="w-8 h-8 text-primary" />
                  <CardTitle className="text-lg">Documents</CardTitle>
                  <Button variant="link" className="text-primary">View Details</Button>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/documents/templates')}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <FileText className="w-8 h-8 text-primary" />
                  <CardTitle className="text-lg">Templates</CardTitle>
                  <Button variant="link" className="text-primary">View Details</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{attendanceStats.absent}</div>
                    <p className="text-sm text-muted-foreground">Absent Employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{attendanceStats.present}</div>
                    <p className="text-sm text-muted-foreground">Present Employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{attendanceStats.late}</div>
                    <p className="text-sm text-muted-foreground">Late Employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar and To Do List */}
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="h-[320px] flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-[minmax(35px,1fr)]">
                  {calendarDays.map((day, index) => {
                    const dayEvents = day ? calendarEvents[day] || [] : [];
                    const hasEvents = dayEvents.length > 0;
                    const hasEventType = dayEvents.some(e => e.type === 'event');
                    const hasReminderType = dayEvents.some(e => e.type === 'reminder');
                    
                    const DayContent = (
                      <div
                        className={`relative flex h-full w-full flex-col items-center justify-center rounded-md text-sm transition-colors ${
                          day ? 'hover:bg-accent cursor-pointer active:bg-accent/80' : 'cursor-default text-transparent pointer-events-none'
                        }`}
                        onClick={(e) => {
                          if (!day) return;
                          console.log('Calendar day clicked, day:', day);
                          e.preventDefault();
                          e.stopPropagation();
                          handleDayClick(day);
                        }}
                        role="button"
                        tabIndex={day ? 0 : -1}
                        onKeyDown={(e) => {
                          if (day && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            handleDayClick(day);
                          }
                        }}
                      >
                        <span className="font-medium">{day ?? ''}</span>
                        {day && hasEvents && (
                          <div className="mt-1 flex items-center gap-0.5">
                            {hasEventType && (
                              <div className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-200" title="Event" />
                            )}
                            {hasReminderType && (
                              <div className="h-1.5 w-1.5 rounded-full bg-primary" title="Reminder" />
                            )}
                          </div>
                        )}
                      </div>
                    );

                    if (!day || !hasEvents) {
                      return <div key={index}>{DayContent}</div>;
                    }

                    return (
                      <HoverCard key={index} openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          {DayContent}
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80" side="top" align="center">
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-sm font-semibold mb-2">
                                {new Date(dayToDate(day)).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </h4>
                              <div className="space-y-2">
                                {dayEvents.map((event, eventIndex) => (
                                  <div key={eventIndex} className="border-l-2 border-primary pl-3 py-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge 
                                        variant={event.type === 'event' ? 'default' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {event.type === 'event' ? 'Event' : 'Reminder'}
                                      </Badge>
                                      {event.eventTime && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {event.eventTime}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                                    {event.description && (
                                      <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                                    )}
                                    {event.createdBy && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Created by: {event.createdBy}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                              Click the date to view details
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="h-[320px] flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>To Do List</CardTitle>
                    <p className="text-sm text-muted-foreground">List of your next task to complete</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowTodoModal(true)}
                    className="rounded-full h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col overflow-y-auto">
                <div className="space-y-2 flex-1">
                  {todos.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      No tasks yet. Click + to add one.
                    </div>
                  ) : (
                    todos.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-1 group">
                        <button
                          onClick={() => handleToggleTodo(item.id)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            item.completed ? 'bg-success border-success' : 'border-muted-foreground hover:border-primary'
                          }`}
                        >
                          {item.completed && <span className="text-white text-xs">✓</span>}
                        </button>
                        <span className={`text-sm flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {item.task}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTodo(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Event/Reminder Modal */}
          <Dialog 
            open={showEventModal} 
            onOpenChange={(open) => {
              console.log('Dialog onOpenChange called with:', open);
              setShowEventModal(open);
              if (!open) {
                setEventTitle('');
                setEventDescription('');
                setEventDate('');
                setEventTime('');
                setSelectedDay(null);
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedDay ? `Schedule for ${new Date(eventDate || dayToDate(selectedDay)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : 'Schedule'}
                </DialogTitle>
                <DialogDescription>Add a reminder or event to keep track of your schedule.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Type</label>
                  <Select value={eventType} onValueChange={(value) => setEventType(value as CalendarEventType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Date</label>
                    <Input
                      type="date"
                      value={eventDate}
                      onChange={(event) => setEventDate(event.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Time</label>
                    <Input
                      type="time"
                      value={eventTime}
                      onChange={(event) => setEventTime(event.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Event Name</label>
                  <Input
                    placeholder="Team sync, submit report..."
                    value={eventTitle}
                    onChange={(event) => setEventTitle(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea
                    placeholder="Add notes, agenda, preparation reminders..."
                    value={eventDescription}
                    onChange={(event) => setEventDescription(event.target.value)}
                    rows={4}
                  />
                </div>
                {selectedDay && (calendarEvents[selectedDay]?.length ?? 0) > 0 && (
                  <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      Existing items for this date
                    </p>
                    <ul className="space-y-2">
                      {calendarEvents[selectedDay]!.map((item, index) => (
                        <li key={`${item.title}-${index}`} className="text-sm">
                          <span className="font-medium capitalize">{item.type}</span>: {item.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEventModal(false)} disabled={isSavingEvent}>
                  Cancel
                </Button>
                <Button onClick={handleEventSave} disabled={!eventTitle.trim() || !eventDate || isSavingEvent}>
                  {isSavingEvent ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Todo Modal */}
          <Dialog open={showTodoModal} onOpenChange={setShowTodoModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>Add a new task to your todo list.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Task</label>
                  <Input
                    placeholder="Enter task description..."
                    value={newTodoTask}
                    onChange={(e) => setNewTodoTask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTodo();
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTodoModal(false);
                    setNewTodoTask('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddTodo} disabled={!newTodoTask.trim()}>
                  Add Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayoutNew>
    );
  }

  // Employee Dashboard
  return (
    <DashboardLayoutNew>
      <div className="space-y-4">
        {/* Quick Action Cards */}
        <div className="grid gap-3 md:grid-cols-3">
          {employeeQuickActions.map((action) => (
            <Card
              key={action.key}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={action.handler}
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${action.bg}`}>
                    <action.icon className={`w-5 h-5 ${action.iconClasses}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{attendanceStats.absent}</div>
                  <p className="text-sm text-muted-foreground">Absent Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{attendanceStats.present}</div>
                  <p className="text-sm text-muted-foreground">Present Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{attendanceStats.late}</div>
                  <p className="text-sm text-muted-foreground">Late Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar and To-Do List */}
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="h-[320px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">APRIL 2025</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1 flex flex-col">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-[minmax(35px,1fr)]">
                {calendarDays.map((day, index) => {
                  const dayEvents = day ? calendarEvents[day] || [] : [];
                  const hasEvents = dayEvents.length > 0;
                  const hasEventType = dayEvents.some(e => e.type === 'event');
                  const hasReminderType = dayEvents.some(e => e.type === 'reminder');
                  
                  const DayContent = (
                    <div
                      className={`relative flex h-full w-full flex-col items-center justify-center rounded-md text-sm transition-colors ${
                        day ? 'hover:bg-accent cursor-pointer active:bg-accent/80' : 'cursor-default text-transparent pointer-events-none'
                      }`}
                      onClick={(e) => {
                        if (!day) return;
                        e.preventDefault();
                        e.stopPropagation();
                        handleDayClick(day);
                      }}
                      role="button"
                      tabIndex={day ? 0 : -1}
                      onKeyDown={(e) => {
                        if (day && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          handleDayClick(day);
                        }
                      }}
                    >
                      <span className="font-medium">{day ?? ''}</span>
                      {day && hasEvents && (
                        <div className="mt-1 flex items-center gap-0.5">
                          {hasEventType && (
                            <div className="h-2 w-2 rounded-full bg-destructive ring-2 ring-destructive/30" title="Event" />
                          )}
                          {hasReminderType && (
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" title="Reminder" />
                          )}
                        </div>
                      )}
                    </div>
                  );

                  if (!day || !hasEvents) {
                    return <div key={index}>{DayContent}</div>;
                  }

                  return (
                    <HoverCard key={index} openDelay={200} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        {DayContent}
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80" side="top" align="center">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-semibold mb-2">
                              {new Date(dayToDate(day)).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </h4>
                            <div className="space-y-2">
                              {dayEvents.map((event, eventIndex) => (
                                <div key={eventIndex} className="border-l-2 border-primary pl-3 py-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge 
                                      variant={event.type === 'event' ? 'default' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {event.type === 'event' ? 'Event' : 'Reminder'}
                                    </Badge>
                                    {event.eventTime && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {event.eventTime}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                                  {event.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                                  )}
                                  {event.createdBy && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Created by: {event.createdBy}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground italic">
                            Click the date to view details
                          </p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="h-[320px] flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>To Do List</CardTitle>
                  <p className="text-sm text-muted-foreground">List of your next task to complete</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowTodoModal(true)}
                  className="rounded-full h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex-1 flex flex-col overflow-y-auto">
              <div className="space-y-2 flex-1">
                {todos.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No tasks yet. Click + to add one.
                  </div>
                ) : (
                  todos.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-1 group">
                      <button
                        onClick={() => handleToggleTodo(item.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          item.completed ? 'bg-success border-success' : 'border-muted-foreground hover:border-primary'
                        }`}
                      >
                        {item.completed && <span className="text-white text-xs">✓</span>}
                      </button>
                      <span className={`text-sm flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {item.task}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTodo(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog 
          open={showEventModal} 
          onOpenChange={(open) => {
            console.log('Dialog onOpenChange called with:', open);
            setShowEventModal(open);
            if (!open) {
              setEventTitle('');
              setEventDescription('');
              setEventDate('');
              setEventTime('');
              setSelectedDay(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedDay ? `Schedule for ${new Date(eventDate || dayToDate(selectedDay)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : 'Schedule'}
              </DialogTitle>
              <DialogDescription>Add a reminder or event to keep track of your schedule.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Type</label>
                <Select value={eventType} onValueChange={(value) => setEventType(value as CalendarEventType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Date</label>
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Time</label>
                  <Input
                    type="time"
                    value={eventTime}
                    onChange={(event) => setEventTime(event.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Event Name</label>
                <Input
                  placeholder="Team sync, submit report..."
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  placeholder="Add notes, agenda, preparation reminders..."
                  value={eventDescription}
                  onChange={(event) => setEventDescription(event.target.value)}
                  rows={4}
                />
              </div>
              {selectedDay && (calendarEvents[selectedDay]?.length ?? 0) > 0 && (
                <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    Existing items for this date
                  </p>
                  <ul className="space-y-2">
                    {calendarEvents[selectedDay]!.map((item, index) => (
                      <li key={`${item.title}-${index}`} className="text-sm">
                        <span className="font-medium capitalize">{item.type}</span>: {item.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEventModal(false)} disabled={isSavingEvent}>
                Cancel
              </Button>
              <Button onClick={handleEventSave} disabled={!eventTitle.trim() || !eventDate || isSavingEvent}>
                {isSavingEvent ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Todo Modal */}
        <Dialog open={showTodoModal} onOpenChange={setShowTodoModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
              <DialogDescription>Add a new task to your todo list.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Task</label>
                <Input
                  placeholder="Enter task description..."
                  value={newTodoTask}
                  onChange={(e) => setNewTodoTask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTodo();
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTodoModal(false);
                  setNewTodoTask('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddTodo} disabled={!newTodoTask.trim()}>
                Add Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayoutNew>
  );
};

export default Dashboard;
