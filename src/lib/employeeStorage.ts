import { Employee } from '@/types/employee';

const STORAGE_KEY = 'hrms_employees';

// Mock initial data
const MOCK_EMPLOYEES: Employee[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    firstName: 'John',
    middleName: 'A.',
    lastName: 'Doe',
    suffixName: 'Jr.',
    fullName: 'John A. Doe Jr.',
    department: 'IT Department',
    position: 'Software Developer',
    email: 'john.doe@company.com',
    phone: '+1234567890',
    dateOfBirth: '1990-05-15',
    address: '123 Main St, City, State 12345',
    dateHired: '2020-01-15',
    employmentType: 'Regular',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    employeeId: 'EMP002',
    firstName: 'Jane',
    middleName: 'B.',
    lastName: 'Smith',
    suffixName: '',
    fullName: 'Jane B. Smith',
    department: 'HR Department',
    position: 'HR Manager',
    email: 'jane.smith@company.com',
    phone: '+1234567891',
    dateOfBirth: '1988-08-22',
    address: '456 Oak Ave, City, State 12345',
    dateHired: '2019-03-10',
    employmentType: 'Regular',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    employeeId: 'EMP003',
    firstName: 'Mike',
    middleName: 'C.',
    lastName: 'Johnson',
    suffixName: '',
    fullName: 'Mike C. Johnson',
    department: 'Finance',
    position: 'Accountant',
    email: 'mike.johnson@company.com',
    phone: '+1234567892',
    dateOfBirth: '1992-12-05',
    address: '789 Pine Rd, City, State 12345',
    dateHired: '2021-06-20',
    employmentType: 'Regular',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const employeeStorage = {
  getAll(): Employee[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_EMPLOYEES));
      return MOCK_EMPLOYEES;
    }
    return JSON.parse(stored);
  },

  getActive(): Employee[] {
    return this.getAll().filter(emp => emp.status === 'active');
  },

  getInactive(): Employee[] {
    return this.getAll().filter(emp => emp.status === 'inactive');
  },

  getById(id: string): Employee | undefined {
    return this.getAll().find(emp => emp.id === id);
  },

  add(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Employee {
    const employees = this.getAll();
    const newEmployee: Employee = {
      ...employee,
      id: Date.now().toString(),
      employmentType: employee.employmentType || 'Regular',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    employees.push(newEmployee);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    return newEmployee;
  },

  update(id: string, updates: Partial<Employee>): Employee | null {
    const employees = this.getAll();
    const index = employees.findIndex(emp => emp.id === id);
    if (index === -1) return null;

    employees[index] = {
      ...employees[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    return employees[index];
  },

  archive(id: string, reason: string): Employee | null {
    return this.update(id, {
      status: 'inactive',
      archivedReason: reason,
      archivedDate: new Date().toISOString(),
    });
  },

  restore(id: string): Employee | null {
    return this.update(id, {
      status: 'active',
      archivedReason: undefined,
      archivedDate: undefined,
    });
  },

  delete(id: string): boolean {
    const employees = this.getAll();
    const filtered = employees.filter(emp => emp.id !== id);
    if (filtered.length === employees.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },
};
