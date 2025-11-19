export interface Employee {
  id: string;
  employeeId: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffixName?: string;
  fullName: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  gender?: string;
  civilStatus?: string;
  dateHired: string;
  dateOfLeaving?: string;
  employmentType?: string;
  role?: string;
  sssNumber?: string;
  pagibigNumber?: string;
  tinNumber?: string;
  emergencyContact?: string;
  educationalBackground?: string;
  signatureFile?: string;
  pdsFile?: string;
  serviceRecordFile?: string;
  registeredFaceFile?: string;
  status: 'active' | 'inactive';
  archivedReason?: string;
  archivedDate?: string;
  createdAt: string;
  updatedAt: string;
}

