export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'leave';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'hrms_attendance';

const MOCK_ATTENDANCE: Attendance[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'John Doe',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00',
    checkOut: '17:00',
    status: 'present',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const attendanceStorage = {
  getAll(): Attendance[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_ATTENDANCE));
      return MOCK_ATTENDANCE;
    }
    return JSON.parse(stored);
  },

  getByDateRange(startDate: string, endDate: string): Attendance[] {
    return this.getAll().filter(att => att.date >= startDate && att.date <= endDate);
  },

  getByEmployee(employeeId: string): Attendance[] {
    return this.getAll().filter(att => att.employeeId === employeeId);
  },

  getByEmployeeAndDate(employeeId: string, date: string): Attendance | null {
    const records = this.getAll();
    return records.find(att => att.employeeId === employeeId && att.date === date) || null;
  },

  add(attendance: Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>): Attendance {
    const records = this.getAll();
    const newRecord: Attendance = {
      ...attendance,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    records.push(newRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return newRecord;
  },

  update(id: string, updates: Partial<Attendance>): Attendance | null {
    const records = this.getAll();
    const index = records.findIndex(att => att.id === id);
    if (index === -1) return null;
    records[index] = { ...records[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return records[index];
  },

  delete(id: string): boolean {
    const records = this.getAll();
    const filtered = records.filter(att => att.id !== id);
    if (filtered.length === records.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },
};
