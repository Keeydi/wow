export interface Department {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Designation {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const DEPARTMENTS_KEY = 'hrms_departments';
const DESIGNATIONS_KEY = 'hrms_designations';

const MOCK_DEPARTMENTS: Department[] = [
  { id: '1', name: 'IT Department', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', name: 'HR Department', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', name: 'Finance', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const MOCK_DESIGNATIONS: Designation[] = [
  { id: '1', name: 'Manager', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', name: 'Team Lead', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', name: 'Developer', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export const departmentStorage = {
  getAll(): Department[] {
    const stored = localStorage.getItem(DEPARTMENTS_KEY);
    if (!stored) {
      localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(MOCK_DEPARTMENTS));
      return MOCK_DEPARTMENTS;
    }
    return JSON.parse(stored);
  },

  add(name: string): Department {
    const departments = this.getAll();
    const newDept: Department = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    departments.push(newDept);
    localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
    return newDept;
  },

  update(id: string, name: string): Department | null {
    const departments = this.getAll();
    const index = departments.findIndex(d => d.id === id);
    if (index === -1) return null;
    departments[index] = { ...departments[index], name, updatedAt: new Date().toISOString() };
    localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
    return departments[index];
  },

  delete(id: string): boolean {
    const departments = this.getAll();
    const filtered = departments.filter(d => d.id !== id);
    if (filtered.length === departments.length) return false;
    localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(filtered));
    return true;
  },
};

export const designationStorage = {
  getAll(): Designation[] {
    const stored = localStorage.getItem(DESIGNATIONS_KEY);
    if (!stored) {
      localStorage.setItem(DESIGNATIONS_KEY, JSON.stringify(MOCK_DESIGNATIONS));
      return MOCK_DESIGNATIONS;
    }
    return JSON.parse(stored);
  },

  add(name: string): Designation {
    const designations = this.getAll();
    const newDesig: Designation = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    designations.push(newDesig);
    localStorage.setItem(DESIGNATIONS_KEY, JSON.stringify(designations));
    return newDesig;
  },

  update(id: string, name: string): Designation | null {
    const designations = this.getAll();
    const index = designations.findIndex(d => d.id === id);
    if (index === -1) return null;
    designations[index] = { ...designations[index], name, updatedAt: new Date().toISOString() };
    localStorage.setItem(DESIGNATIONS_KEY, JSON.stringify(designations));
    return designations[index];
  },

  delete(id: string): boolean {
    const designations = this.getAll();
    const filtered = designations.filter(d => d.id !== id);
    if (filtered.length === designations.length) return false;
    localStorage.setItem(DESIGNATIONS_KEY, JSON.stringify(filtered));
    return true;
  },
};
