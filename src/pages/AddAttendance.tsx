import { useEffect, useRef, useState } from 'react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Camera, Clock, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Calculate distance between two coordinates in kilometers (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const AddAttendance = () => {
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [status, setStatus] = useState<'present' | 'absent' | 'late' | 'half-day' | 'leave'>('present');
  const [notes, setNotes] = useState('');
  const [cameraIsOpen, setCameraIsOpen] = useState(false);
  const [activeCapture, setActiveCapture] = useState<'checkIn' | 'checkOut' | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [capturedImages, setCapturedImages] = useState<{ checkIn?: string; checkOut?: string }>({});
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(false);
  const [minutesLate, setMinutesLate] = useState(0);
  const { toast } = useToast();
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Fetch employee name when employee ID is entered
  useEffect(() => {
    const fetchEmployeeName = async () => {
      if (!employeeId.trim()) {
        setEmployeeName('');
        return;
      }

      // Validate employee ID format (YY-GPC-XXXXX)
      const employeeIdPattern = /^\d{2}-[A-Z]{2,4}-\d{1,5}$/;
      if (!employeeIdPattern.test(employeeId.trim())) {
        setEmployeeName('');
        return;
      }

      setIsLoadingEmployee(true);
      try {
        const response = await fetch(`${API_BASE_URL}/employees?employeeId=${encodeURIComponent(employeeId.trim())}`);
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const employee = data.data[0];
            setEmployeeName(employee.full_name || `${employee.first_name || ''} ${employee.middle_name || ''} ${employee.last_name || ''} ${employee.suffix_name || ''}`.trim());
          } else {
            setEmployeeName('');
            toast({
              variant: 'destructive',
              title: 'Employee not found',
              description: 'No employee found with this ID. Please check and try again.',
            });
          }
        } else {
          setEmployeeName('');
        }
      } catch (error) {
        console.error('Error fetching employee:', error);
        setEmployeeName('');
      } finally {
        setIsLoadingEmployee(false);
      }
    };

    const timeoutId = setTimeout(fetchEmployeeName, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [employeeId, API_BASE_URL, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing details',
        description: 'Please enter the employee ID.',
      });
      return;
    }

    if (!employeeName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Invalid Employee ID',
        description: 'Please enter a valid employee ID.',
      });
      return;
    }

    if (!checkIn.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing details',
        description: 'Please enter the time in.',
      });
      return;
    }

    // Check current time - attendance only allowed until 7:00 PM
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const cutoffHour = 19; // 7:00 PM
    const cutoffMinute = 0;
    
    if (currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute > cutoffMinute)) {
      toast({
        variant: 'destructive',
        title: 'Attendance Closed',
        description: 'Attendance can only be recorded until 7:00 PM.',
      });
      return;
    }

    // Get user's location for face recognition verification
    let location: { latitude: number; longitude: number } | null = null;
    if (capturedImages.checkIn || capturedImages.checkOut) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        
        // Check if within institution (set your institution coordinates here)
        // Default: Manila area (update with your actual institution coordinates)
        const institutionLat = 14.5995; // Update with your institution's latitude
        const institutionLng = 120.9842; // Update with your institution's longitude
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          institutionLat,
          institutionLng
        );
        
        // Allow if within 100 meters (0.1 km) of institution
        if (distance > 0.1) {
          toast({
            variant: 'destructive',
            title: 'Location Error',
            description: `You must be within the institution premises to record attendance. You are ${(distance * 1000).toFixed(0)} meters away.`,
          });
          return;
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Location Required',
          description: 'Face recognition requires location verification. Please enable location services and try again.',
        });
        return;
      }
    }

    // Auto-detect late status if check-in is after 8:11 AM
    let finalStatus = status;
    let minutesLate = 0;
    if (checkIn && (status === 'present' || status === 'late')) {
      const checkInTime = new Date(`2000-01-01T${checkIn}`);
      const expectedTime = new Date('2000-01-01T08:11'); // 8:11 AM threshold
      minutesLate = Math.floor((checkInTime.getTime() - expectedTime.getTime()) / 60000);
      
      if (minutesLate > 0) {
        finalStatus = 'late';
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employeeId.trim(),
          employeeName: employeeName.trim(),
          date,
          checkIn: checkIn || null,
          checkOut: checkOut || null,
          status: finalStatus,
          notes: notes || null,
          checkInImage: capturedImages.checkIn || null,
          checkOutImage: capturedImages.checkOut || null,
          location: location ? {
            latitude: location.latitude,
            longitude: location.longitude,
          } : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add attendance record');
      }

      // Show success message with late information if applicable
      if (finalStatus === 'late' && minutesLate > 0) {
        toast({ 
          title: "Attendance Recorded", 
          description: `Attendance added successfully. Employee is ${minutesLate} minute${minutesLate !== 1 ? 's' : ''} late.`,
          duration: 5000,
        });
      } else {
        toast({ 
          title: "Success", 
          description: "Attendance record added successfully" 
        });
      }
    } catch (error) {
      console.error('Error adding attendance', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unable to add attendance record. Please try again.',
      });
      return;
    }
    
    // Reset form
    setEmployeeId('');
    setEmployeeName('');
    setDate(new Date().toISOString().split('T')[0]);
    setCheckIn('');
    setCheckOut('');
    setStatus('present');
    setNotes('');
    setCapturedImages({});
    setMinutesLate(0);
  };

  const handleOpenCamera = async (captureType: 'checkIn' | 'checkOut') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        variant: 'destructive',
        title: 'Camera not supported',
        description: 'Your browser does not support camera access.',
      });
      return;
    }

    // Check location before opening camera
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      
      // Check if within institution (set your institution coordinates here)
      const institutionLat = 14.5995; // Update with your institution's latitude
      const institutionLng = 120.9842; // Update with your institution's longitude
      const distance = calculateDistance(userLat, userLng, institutionLat, institutionLng);
      
      // Allow if within 100 meters (0.1 km) of institution
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
        title: 'Location Required',
        description: 'Face recognition requires location verification. Please enable location services.',
      });
      return;
    }

    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      mediaStreamRef.current = stream;
      setActiveCapture(captureType);
      setCameraIsOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch (error) {
      console.error('Unable to open camera', error);
      setCameraError('Unable to access camera. Please check permissions and try again.');
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || !activeCapture) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    setCapturedImages((prev) => ({ ...prev, [activeCapture]: dataUrl }));
    toast({ title: 'Face captured', description: 'Photo saved for this entry.' });
    closeCamera();
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraIsOpen(false);
    setActiveCapture(null);
  };

  // Check if attendance is still allowed (before 7:00 PM)
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const cutoffHour = 19; // 7:00 PM
  const isAttendanceClosed = currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute > cutoffMinute);

  return (
    <DashboardLayoutNew>
      <Card className="p-6 shadow-lg border-border/70">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Add Attendance</h2>
          {isAttendanceClosed && (
            <Badge variant="destructive" className="px-3 py-1">
              Attendance Closed (After 7:00 PM)
            </Badge>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Employee ID">
              <Input
                placeholder="Example: 25-GPC-12345"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                className="h-12 rounded-xl"
                required
                disabled={isLoadingEmployee}
              />
              {employeeName && (
                <p className="text-sm text-muted-foreground mt-1">
                  Employee: <span className="font-semibold text-foreground">{employeeName}</span>
                </p>
              )}
              {isLoadingEmployee && (
                <p className="text-sm text-muted-foreground mt-1">Loading employee info...</p>
              )}
            </Field>

            <Field label="Select Date">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <CaptureCard
                title="Sign In Time"
                value={checkIn}
                onChange={(val) => {
                  setCheckIn(val);
                  // Calculate minutes late when check-in time changes
                  if (val) {
                    const checkInTime = new Date(`2000-01-01T${val}`);
                    const expectedTime = new Date('2000-01-01T08:11'); // 8:11 AM threshold
                    const late = Math.floor((checkInTime.getTime() - expectedTime.getTime()) / 60000);
                    setMinutesLate(late > 0 ? late : 0);
                  } else {
                    setMinutesLate(0);
                  }
                }}
                placeholder="Now"
                disabled={status === 'leave' || status === 'absent'}
                onOpenCamera={() => handleOpenCamera('checkIn')}
                capturedImage={capturedImages.checkIn}
              />
              {checkIn && minutesLate > 0 && (
                <div className="rounded-lg border-2 border-orange-500 bg-orange-50 p-3">
                  <p className="text-sm font-semibold text-orange-700">
                    ⚠️ Employee is {minutesLate} minute{minutesLate !== 1 ? 's' : ''} late
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Check-in time: {checkIn} (Expected: 08:11)
                  </p>
                </div>
              )}
              {checkIn && minutesLate <= 0 && (
                <div className="rounded-lg border-2 border-green-500 bg-green-50 p-3">
                  <p className="text-sm font-semibold text-green-700">
                    ✓ On time
                  </p>
                </div>
              )}
            </div>
            <CaptureCard
              title="Sign Out Time"
              value={checkOut}
              onChange={setCheckOut}
              placeholder="Later"
              disabled={status === 'leave' || status === 'absent'}
              onOpenCamera={() => handleOpenCamera('checkOut')}
              capturedImage={capturedImages.checkOut}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Attendance Status">
              <Select value={status} onValueChange={(value: 'present' | 'absent' | 'late' | 'half-day' | 'leave') => {
                setStatus(value);
                if (value === 'leave' || value === 'absent') {
                  setCheckIn('');
                  setCheckOut('');
                }
              }}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Notes (Optional)">
              <Input
                placeholder="Add note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-12 rounded-xl"
              />
            </Field>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={() => window.history.back()}
              className="rounded-full px-8 bg-red-500 hover:bg-red-600"
            >
              Close
            </Button>
            <Button type="submit" className="rounded-full px-8 bg-green-600 hover:bg-green-700">
              Submit
            </Button>
          </div>
        </form>
      </Card>

      {cameraIsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-border/60">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">
                  Capture Face — {activeCapture === 'checkIn' ? 'Sign In' : 'Sign Out'}
                </p>
                <p className="text-sm text-muted-foreground">Align the employee’s face then tap capture.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeCamera}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="rounded-xl overflow-hidden bg-black aspect-video">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>

            {cameraError && <p className="text-sm text-destructive">{cameraError}</p>}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeCamera}>Cancel</Button>
              <Button onClick={handleCapturePhoto}>Capture</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayoutNew>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label className="text-sm font-semibold text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const CaptureCard = ({
  title,
  value,
  onChange,
  placeholder,
  disabled,
  onOpenCamera,
  capturedImage,
}: {
  title: string;
  value: string;
  placeholder: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  onOpenCamera: () => void;
  capturedImage?: string;
}) => (
  <div className="rounded-2xl border border-border/70 p-4 space-y-4">
    <div className="space-y-2">
      <Label className="font-semibold">{title}</Label>
      <div className="relative">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 h-12 rounded-xl"
          disabled={disabled}
        />
      </div>
    </div>
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground uppercase tracking-widest">Capture Face</Label>
      {capturedImage ? (
        <div className="relative">
          <img
            src={capturedImage}
            alt={`${title} capture`}
            className="w-full h-32 object-cover rounded-xl border border-border/70"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2 rounded-full px-3"
            onClick={onOpenCamera}
            disabled={disabled}
          >
            Retake
          </Button>
        </div>
      ) : (
        <div className="border border-dashed border-border/60 rounded-xl h-32 flex items-center justify-center text-sm text-muted-foreground">
          No capture yet
        </div>
      )}
      <Button
        variant="outline"
        type="button"
        className="w-full rounded-xl"
        disabled={disabled}
        onClick={onOpenCamera}
      >
        <Camera className="w-4 h-4 mr-2" />
        {capturedImage ? 'Retake Photo' : 'Open Camera'}
      </Button>
    </div>
  </div>
);

export default AddAttendance;
