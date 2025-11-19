import type { RowDataPacket } from 'mysql2';

export interface DbUser extends RowDataPacket {
  id: number;
  username: string;
  email: string;
  employee_id: string | null;
  full_name: string;
  role: 'admin' | 'employee';
  password_hash: string;
  password_reset_required: boolean;
}

export interface DbEmployee extends RowDataPacket {
  id: number;
  employee_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix_name: string;
  full_name: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  address: string | null;
  gender: string | null;
  civil_status: string | null;
  date_hired: string;
  date_of_leaving: string | null;
  employment_type: string;
  role: string | null;
  sss_number: string | null;
  pagibig_number: string | null;
  tin_number: string | null;
  emergency_contact: string | null;
  educational_background: string | null;
  signature_file: string | null;
  pds_file: string | null;
  service_record_file: string | null;
  registered_face_file: string | null;
  password_hash: string | null;
  status: 'active' | 'inactive';
  archived_reason: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAttendance extends RowDataPacket {
  id: number;
  employee_id: string;
  employee_name: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'leave';
  notes: string | null;
  check_in_image: string | null;
  check_out_image: string | null;
  created_at: string;
  updated_at: string;
}

