import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
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

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [calendarEvents, setCalendarEvents] = useState<Record<number, CalendarEvent[]>>({});
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const profile = {
    name: user?.fullName || 'Mia R. Tresenio',
    employeeId: user?.employeeId || '25-GPC-07843',
    employmentType: 'Regular',
    department: 'MIS Coordinator',
    roleLabel: 'Employee',
  };

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

  useEffect(() => {
    fetchCalendarEvents();
  }, [currentMonth, currentYear]);

  const calendarDays = useMemo(
    () => Array.from({ length: 35 }, (_, index) => (index < 30 ? index + 1 : null)),
    [],
  );

  const attendanceSummary = [
    { label: 'Sign In Time', value: 'No Time In' },
    { label: 'Sign Out Time', value: 'No Time Out' },
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
            <button className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold tracking-wide transition hover:bg-white/20">
              Attendance Status
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-white p-6 shadow-lg">
            <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_220px]">
              {/* Profile column */}
              <div className="flex flex-col items-center gap-4">
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[#3f61a8] shadow-md">
                  <img src={profilePicture} alt={profile.name} className="h-full w-full object-cover" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xl font-semibold">{profile.name}</p>
                  <p className="text-sm tracking-wide text-[#516a9d]">{profile.employeeId}</p>
                  <p className="text-sm text-[#516a9d]">{profile.employmentType}</p>
                </div>
                <div className="w-full space-y-2 rounded-2xl bg-[#f1f5ff] p-4 text-center text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#7e8ab0]">Position</p>
                    <p className="text-base font-medium text-[#1d3173]">{profile.roleLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#7e8ab0]">
                      College Department
                    </p>
                    <p className="text-base font-medium text-[#1d3173]">{profile.department}</p>
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
                      <img src={signIcon} alt="Biometric icon" className="h-12 w-12 opacity-80" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayoutNew>
  );
};

export default EmployeeDashboard;

