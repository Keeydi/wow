import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Camera, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import profilePicture from '../../images/profile_picture.png';
import signIcon from '../../images/sign_signout_icon.png';

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

interface EmployeeData {
  fullName: string;
  employeeId: string;
  department: string;
  position: string;
  employmentType: string;
  registeredFaceFile: string | null;
}

interface TodayAttendance {
  checkIn?: string;
  checkOut?: string;
  checkInImage?: string;
  checkOutImage?: string;
  status: string;
}

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [calendarEvents, setCalendarEvents] = useState<Record<number, CalendarEvent[]>>({});
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [cameraIsOpen, setCameraIsOpen] = useState(false);
  const [activeCapture, setActiveCapture] = useState<'checkIn' | 'checkOut' | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();

  // Convert date string to day number
  const dateToDay = (dateStr: string): number | null => {
    const date = new Date(dateStr);
    if (date.getMonth() + 1 !== currentMonth || date.getFullYear() !== currentYear) {
      return null; // Date is not in current month
    }
    return date.getDate();
  };

  // Convert day number to actual date string (YYYY-MM-DD)
  const dayToDate = (day: number): string => {
    const date = new Date(currentYear, currentMonth - 1, day);
    return date.toISOString().split('T')[0];
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
      console.error('Error fetching calendar events', error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // Fetch employee data
  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!user?.employeeId) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/employees?employeeId=${user.employeeId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const emp = data.data[0];
            setEmployeeData({
              fullName: emp.fullName || user.fullName || '',
              employeeId: emp.employeeId || user.employeeId || '',
              department: emp.department || '',
              position: emp.position || '',
              employmentType: emp.employmentType || 'Regular',
              registeredFaceFile: emp.registeredFaceFile || null,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching employee data', error);
      }
    };

    fetchEmployeeData();
  }, [user]);

  // Fetch today's attendance
  useEffect(() => {
    const fetchTodayAttendance = async () => {
      if (!user?.employeeId) return;
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${API_BASE_URL}/attendance?employeeId=${user.employeeId}&date=${today}`);
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const att = data.data[0];
            setTodayAttendance({
              checkIn: att.checkIn || undefined,
              checkOut: att.checkOut || undefined,
              checkInImage: att.checkInImage || undefined,
              checkOutImage: att.checkOutImage || undefined,
              status: att.status || 'absent',
            });
          } else {
            setTodayAttendance(null);
          }
        }
      } catch (error) {
        console.error('Error fetching attendance', error);
      }
    };

    fetchTodayAttendance();
    // Refresh every minute
    const interval = setInterval(fetchTodayAttendance, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [currentMonth, currentYear]);

  const calendarDays = useMemo(
    () => Array.from({ length: 35 }, (_, index) => (index < 30 ? index + 1 : null)),
    [],
  );

  const handleOpenCamera = async (type: 'checkIn' | 'checkOut') => {
    // Check location first
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      const institutionLat = 14.5995;
      const institutionLng = 120.9842;
      
      const R = 6371; // Earth's radius in km
      const dLat = ((institutionLat - userLat) * Math.PI) / 180;
      const dLon = ((institutionLng - userLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLat * Math.PI) / 180) *
          Math.cos((institutionLat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance > 0.1) {
        toast({
          variant: 'destructive',
          title: 'Location Error',
          description: `You must be within the institution premises to use face recognition. You are ${(distance * 1000).toFixed(0)} meters away.`,
        });
        return;
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Location Error',
        description: 'Unable to get your location. Please enable location services.',
      });
      return;
    }

    setActiveCapture(type);
    setCameraIsOpen(true);
    setCapturedImage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera', error);
      toast({
        variant: 'destructive',
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions.',
      });
      setCameraIsOpen(false);
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageData);
    }

    stopCamera();
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraIsOpen(false);
    setActiveCapture(null);
    setCapturedImage(null);
  };

  const handleSubmitAttendance = async () => {
    if (!user?.employeeId || !selectedDate || !employeeData) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Missing required information',
      });
      return;
    }

    if (!capturedImage) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please capture your face first',
      });
      return;
    }

    try {
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      // Determine status based on check-in time
      let status = 'present';
      if (activeCapture === 'checkIn') {
        const checkInTime = new Date(`2000-01-01T${timeString}`);
        const expectedTime = new Date('2000-01-01T08:11');
        const minutesLate = Math.floor((checkInTime.getTime() - expectedTime.getTime()) / 60000);
        if (minutesLate > 0) {
          status = 'late';
        }
      }

      const payload: any = {
        employeeId: user.employeeId,
        employeeName: employeeData.fullName,
        date: selectedDate,
        status,
      };
      
      if (activeCapture === 'checkIn') {
        payload.checkIn = timeString;
        payload.checkInImage = capturedImage;
      } else if (activeCapture === 'checkOut') {
        payload.checkOut = timeString;
        payload.checkOutImage = capturedImage;
      }

      const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit attendance');
      }

      toast({
        title: 'Success',
        description: `${activeCapture === 'checkIn' ? 'Sign in' : 'Sign out'} recorded successfully`,
      });

      closeCamera();
      setShowAttendanceDialog(false);
      // Refresh attendance
      const refreshResponse = await fetch(`${API_BASE_URL}/attendance?employeeId=${user.employeeId}&date=${selectedDate}`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        if (data.data && data.data.length > 0) {
          const att = data.data[0];
          setTodayAttendance({
            checkIn: att.checkIn || undefined,
            checkOut: att.checkOut || undefined,
            checkInImage: att.checkInImage || undefined,
            checkOutImage: att.checkOutImage || undefined,
            status: att.status || 'absent',
          });
        }
      }
    } catch (error) {
      console.error('Error submitting attendance', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit attendance. Please try again.',
      });
    }
  };

  const formatTime = (time: string | undefined) => {
    if (!time) return 'No Time';
    return time;
  };

  const attendanceSummary = [
    { 
      label: 'Sign In Time', 
      value: todayAttendance?.checkIn ? formatTime(todayAttendance.checkIn) : 'No Time In',
      image: todayAttendance?.checkInImage,
    },
    { 
      label: 'Sign Out Time', 
      value: todayAttendance?.checkOut ? formatTime(todayAttendance.checkOut) : 'No Time Out',
      image: todayAttendance?.checkOutImage,
    },
  ];

  return (
    <DashboardLayoutNew>
      <div className="space-y-4">
        <div className="rounded-3xl border border-[#9bb4e6] bg-[#d1e4ff] p-6 text-[#0f2a5f] shadow-inner">
          <div className="flex flex-col gap-4 rounded-2xl bg-[#142274] px-6 py-4 text-white shadow-md md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] opacity-80">Dashboard</p>
              <h1 className="text-2xl font-semibold">Attendance</h1>
            </div>
            <Button 
              onClick={() => setShowAttendanceDialog(true)}
              className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold tracking-wide transition hover:bg-white/20 text-white border-0"
            >
              Attendance Status
            </Button>
          </div>

          <div className="mt-6 rounded-2xl bg-white p-6 shadow-lg">
            <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_220px]">
              {/* Profile column */}
              <div className="flex flex-col items-center gap-4">
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[#3f61a8] shadow-md">
                  {employeeData?.registeredFaceFile ? (
                    <img 
                      src={`${API_BASE_URL}/uploads/${employeeData.registeredFaceFile}`} 
                      alt={employeeData.fullName} 
                      className="h-full w-full object-cover" 
                    />
                  ) : (
                    <img src={profilePicture} alt={employeeData?.fullName || user?.fullName || 'Profile'} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xl font-semibold">{employeeData?.fullName || user?.fullName || 'Employee'}</p>
                  <p className="text-sm tracking-wide text-[#516a9d]">{employeeData?.employeeId || user?.employeeId || ''}</p>
                  <p className="text-sm text-[#516a9d]">{employeeData?.employmentType || 'Regular'}</p>
                </div>
                <div className="w-full space-y-2 rounded-2xl bg-[#f1f5ff] p-4 text-center text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#7e8ab0]">Position</p>
                    <p className="text-base font-medium text-[#1d3173]">{employeeData?.position || 'Employee'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#7e8ab0]">
                      College Department
                    </p>
                    <p className="text-base font-medium text-[#1d3173]">{employeeData?.department || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Calendar */}
              <div className="flex flex-col rounded-2xl border border-[#cfd8ff] bg-[#f5f7ff] p-4 shadow-inner">
                <div className="text-center">
                  <p className="text-lg font-semibold tracking-[0.2em] text-[#1d3173]">APRIL 2025</p>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#5d6c96]">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                    <div key={day} className="py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid flex-1 grid-cols-7 gap-1 text-center text-sm font-medium text-[#1d3173]">
                  {calendarDays.map((day, index) => {
                    const dayEvents = day ? calendarEvents[day] || [] : [];
                    const hasEvents = dayEvents.length > 0;
                    const hasEventType = dayEvents.some(e => e.type === 'event');
                    const hasReminderType = dayEvents.some(e => e.type === 'reminder');
                    
                    const DayContent = (
                      <div
                        className={`flex min-h-[60px] flex-col items-center justify-center rounded-md border border-[#d7defc] bg-white ${
                          day ? 'shadow-sm cursor-pointer hover:bg-[#eef3ff] transition-colors' : 'bg-transparent border-none'
                        }`}
                      >
                        <span className="font-medium">{day ?? ''}</span>
                        {day && hasEvents && (
                          <div className="mt-1 flex items-center gap-0.5">
                            {hasEventType && (
                              <div className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-200" title="Event" />
                            )}
                            {hasReminderType && (
                              <div className="h-1.5 w-1.5 rounded-full bg-[#3f61a8]" title="Reminder" />
                            )}
                          </div>
                        )}
                      </div>
                    );

                    if (!day || !hasEvents) {
                      return <div key={`day-${index}`}>{DayContent}</div>;
                    }

                    return (
                      <HoverCard key={`day-${index}`} openDelay={200} closeDelay={100}>
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
                                  <div key={eventIndex} className="border-l-2 border-[#3f61a8] pl-3 py-1">
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
                              Hover to view event details
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}
                </div>
              </div>

              {/* Sign in/out summary */}
              <div className="flex flex-col gap-4 rounded-2xl bg-[#eef3ff] p-4 text-center">
                {attendanceSummary.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-[#cfd8ff] bg-white px-4 py-5 shadow-sm">
                    <p className="text-sm font-semibold text-[#1d3173]">{item.label}</p>
                    <p className="mt-4 text-base text-[#6c7393]">{item.value}</p>
                    <div className="mt-3 flex justify-center">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={`${item.label} capture`} 
                          className="h-12 w-12 rounded-full object-cover border-2 border-[#3f61a8]" 
                        />
                      ) : (
                        <img src={signIcon} alt="Biometric icon" className="h-12 w-12 opacity-80" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Status Dialog */}
      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>My Attendance Status</DialogTitle>
            <DialogDescription>View and record your attendance</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Date *</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  // Fetch attendance for selected date
                  if (user?.employeeId && e.target.value) {
                    fetch(`${API_BASE_URL}/attendance?employeeId=${user.employeeId}&date=${e.target.value}`)
                      .then(res => res.json())
                      .then(data => {
                        if (data.data && data.data.length > 0) {
                          const att = data.data[0];
                          setTodayAttendance({
                            checkIn: att.checkIn || undefined,
                            checkOut: att.checkOut || undefined,
                            checkInImage: att.checkInImage || undefined,
                            checkOutImage: att.checkOutImage || undefined,
                            status: att.status || 'absent',
                          });
                        } else {
                          setTodayAttendance(null);
                        }
                      })
                      .catch(err => console.error('Error fetching attendance', err));
                  }
                }}
                max={new Date().toISOString().split('T')[0]}
                className="w-full"
                required
              />
            </div>

            {/* Attendance Status Display */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Attendance for {new Date(selectedDate).toLocaleDateString()}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Sign In</p>
                  {todayAttendance?.checkIn ? (
                    <div>
                      <p className="text-lg font-semibold text-green-600">{todayAttendance.checkIn}</p>
                      {todayAttendance.checkInImage && (
                        <img 
                          src={todayAttendance.checkInImage} 
                          alt="Sign in capture" 
                          className="mt-2 w-20 h-20 rounded-full object-cover border-2 border-green-500"
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No Time In</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Sign Out</p>
                  {todayAttendance?.checkOut ? (
                    <div>
                      <p className="text-lg font-semibold text-blue-600">{todayAttendance.checkOut}</p>
                      {todayAttendance.checkOutImage && (
                        <img 
                          src={todayAttendance.checkOutImage} 
                          alt="Sign out capture" 
                          className="mt-2 w-20 h-20 rounded-full object-cover border-2 border-blue-500"
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No Time Out</p>
                  )}
                </div>
              </div>
              {todayAttendance?.status && (
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant={todayAttendance.status === 'present' ? 'default' : todayAttendance.status === 'late' ? 'destructive' : 'secondary'}>
                    {todayAttendance.status.charAt(0).toUpperCase() + todayAttendance.status.slice(1)}
                  </Badge>
                </div>
              )}
            </div>

            {/* Record Attendance Buttons */}
            {selectedDate === new Date().toISOString().split('T')[0] && (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleOpenCamera('checkIn')}
                  disabled={!!todayAttendance?.checkIn}
                  className="h-20 flex flex-col gap-2"
                >
                  <Camera className="h-6 w-6" />
                  <span>Sign In</span>
                  {todayAttendance?.checkIn && (
                    <span className="text-xs text-muted-foreground">{todayAttendance.checkIn}</span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOpenCamera('checkOut')}
                  disabled={!!todayAttendance?.checkOut || !todayAttendance?.checkIn}
                  className="h-20 flex flex-col gap-2"
                >
                  <Camera className="h-6 w-6" />
                  <span>Sign Out</span>
                  {todayAttendance?.checkOut && (
                    <span className="text-xs text-muted-foreground">{todayAttendance.checkOut}</span>
                  )}
                </Button>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Captured Image:</p>
                <img src={capturedImage} alt="Captured" className="w-full rounded-lg border" />
                <Button onClick={handleSubmitAttendance} className="w-full">
                  Submit {activeCapture === 'checkIn' ? 'Sign In' : 'Sign Out'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera Dialog */}
      {cameraIsOpen && (
        <Dialog open={cameraIsOpen} onOpenChange={closeCamera}>
          <DialogContent className="max-w-2xl w-full p-0 gap-0">
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <DialogTitle className="text-lg font-semibold">
                    Capture Face — {activeCapture === 'checkIn' ? 'Sign In' : 'Sign Out'}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Align your face then tap capture.
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={closeCamera} className="h-8 w-8">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="rounded-xl overflow-hidden bg-black aspect-video mb-4">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeCamera}>Cancel</Button>
                <Button onClick={handleCapturePhoto}>Capture</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayoutNew>
  );
};

export default EmployeeDashboard;

