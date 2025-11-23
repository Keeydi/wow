-- PostgreSQL/Supabase Schema for HR Hub
-- Run this in Supabase SQL Editor

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE employee_status AS ENUM ('active', 'inactive');
CREATE TYPE calendar_event_type AS ENUM ('reminder', 'event');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'half-day', 'leave');
CREATE TYPE document_type_enum AS ENUM ('policy', 'template', 'employee-doc', 'other');
CREATE TYPE activity_status AS ENUM ('success', 'failed', 'warning');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  employee_id VARCHAR(50) UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  password_hash VARCHAR(255) NOT NULL,
  password_reset_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed admin account (password: admin123)
INSERT INTO users (username, email, employee_id, full_name, role, password_hash)
VALUES ('admin', 'admin@greatplebeian.edu', NULL, 'System Administrator', 'admin', 'admin123')
ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email;

-- Seed employee account (password: emp123)
INSERT INTO users (username, email, employee_id, full_name, role, password_hash)
VALUES ('employee', 'employee@greatplebeian.edu', '25-GPC-12345', 'John Doe', 'employee', 'emp123')
ON CONFLICT (username) DO UPDATE SET 
  email = EXCLUDED.email, 
  employee_id = EXCLUDED.employee_id, 
  role = EXCLUDED.role;

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(60) NOT NULL,
  middle_name VARCHAR(60) NOT NULL,
  last_name VARCHAR(60) NOT NULL,
  suffix_name VARCHAR(30) NOT NULL,
  full_name VARCHAR(180) NOT NULL,
  department VARCHAR(120) NOT NULL,
  position VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  date_of_birth DATE NULL,
  address VARCHAR(255) NULL,
  gender VARCHAR(20) NULL,
  civil_status VARCHAR(20) NULL,
  date_hired DATE NOT NULL,
  date_of_leaving DATE NULL,
  employment_type VARCHAR(50) NOT NULL DEFAULT 'Regular',
  role VARCHAR(50) NULL,
  sss_number VARCHAR(20) NULL,
  pagibig_number VARCHAR(20) NULL,
  tin_number VARCHAR(20) NULL,
  emergency_contact VARCHAR(255) NULL,
  educational_background TEXT NULL,
  signature_file VARCHAR(255) NULL,
  pds_file VARCHAR(255) NULL,
  service_record_file VARCHAR(255) NULL,
  registered_face_file VARCHAR(255) NULL,
  password_hash VARCHAR(255) NULL,
  status employee_status NOT NULL DEFAULT 'active',
  archived_reason VARCHAR(255) NULL,
  archived_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for employees updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO employees (employee_id, first_name, middle_name, last_name, suffix_name, full_name, department, position, email, phone, date_of_birth, address, date_hired, employment_type, status)
VALUES 
  ('25-GPC-12345', 'John', 'A.', 'Doe', 'Jr.', 'John A. Doe Jr.', 'IT Department', 'Software Developer', 'john.doe@greatplebeian.edu', '+639123456789', '1990-05-15', 'Barangay Poblacion, Alaminos, Pangasinan', '2020-01-15', 'Regular', 'active'),
  ('25-GPC-12346', 'Jane', 'B.', 'Smith', '', 'Jane B. Smith', 'HR Department', 'HR Manager', 'jane.smith@greatplebeian.edu', '+639123456790', '1988-08-22', 'Barangay Poblacion, Alaminos, Pangasinan', '2019-03-10', 'Regular', 'active'),
  ('25-GPC-12347', 'Mike', 'C.', 'Johnson', '', 'Mike C. Johnson', 'Finance Department', 'Accountant', 'mike.johnson@greatplebeian.edu', '+639123456791', '1992-12-05', 'Barangay Poblacion, Alaminos, Pangasinan', '2021-06-20', 'Regular', 'active'),
  ('25-GPC-12348', 'Maria', 'D.', 'Garcia', '', 'Maria D. Garcia', 'High School Department', 'Teacher', 'maria.garcia@greatplebeian.edu', '+639123456792', '1991-03-20', 'Barangay Poblacion, Alaminos, Pangasinan', '2020-08-01', 'Regular', 'active'),
  ('25-GPC-12349', 'Robert', 'E.', 'Santos', '', 'Robert E. Santos', 'College Department', 'Professor', 'robert.santos@greatplebeian.edu', '+639123456793', '1985-07-10', 'Barangay Poblacion, Alaminos, Pangasinan', '2018-06-15', 'Regular', 'active')
ON CONFLICT (employee_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  middle_name = EXCLUDED.middle_name,
  last_name = EXCLUDED.last_name,
  suffix_name = EXCLUDED.suffix_name,
  full_name = EXCLUDED.full_name,
  department = EXCLUDED.department,
  position = EXCLUDED.position,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  date_of_birth = EXCLUDED.date_of_birth,
  address = EXCLUDED.address,
  date_hired = EXCLUDED.date_hired,
  employment_type = EXCLUDED.employment_type,
  status = EXCLUDED.status;

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for departments updated_at
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial departments
INSERT INTO departments (name)
VALUES 
  ('Board of Directors'),
  ('Administration Department'),
  ('Finance Department'),
  ('High School Department'),
  ('College Department'),
  ('Elementary Department')
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;

-- Designations table
CREATE TABLE IF NOT EXISTS designations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for designations updated_at
CREATE TRIGGER update_designations_updated_at BEFORE UPDATE ON designations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial designations
INSERT INTO designations (name)
VALUES 
  ('Chairman of the Board'),
  ('Vice Chairman'),
  ('Members of the Board of Directors'),
  ('Legal Counsel Corporate Secretary'),
  ('External Auditor'),
  ('School President'),
  ('Board Secretary'),
  ('Vice President for Administration'),
  ('Human Resource Head'),
  ('Admin officer'),
  ('Records Officer'),
  ('Clerk'),
  ('Nurse'),
  ('IT Coordinator'),
  ('Property Custodian'),
  ('Supply Officer'),
  ('Maintenance (3 securities, 5 utilities)'),
  ('Vice President for Finance'),
  ('Treasurer'),
  ('Accountant'),
  ('Internal Auditor'),
  ('Cashier'),
  ('Assistant Cashier'),
  ('Bookkeeper'),
  ('Accounting Clerks (2)'),
  ('Vice President for Academic Affairs'),
  ('Elementary Principal'),
  ('Elementary Registrar'),
  ('Guidance Counselor'),
  ('Librarian in charge'),
  ('Elementary Faculty Member'),
  ('High School Principal'),
  ('High School Registrar'),
  ('Encoder'),
  ('Senior High School Coordinator'),
  ('Junior High School Coordinator'),
  ('TechVoc Coordinator'),
  ('Program Coordinator'),
  ('Housekeeping Trainer'),
  ('Cookery Trainer'),
  ('FBS Trainer'),
  ('EIM Trainer'),
  ('High School Faculty Member'),
  ('Dean of College of Teacher Education'),
  ('Dean of College of Business Education'),
  ('School Librarian'),
  ('Assistant Librarian'),
  ('Research and Development Coordinator'),
  ('Alumni Affairs Coordinator'),
  ('NSTP Coordinator'),
  ('MIS Coordinator'),
  ('College Guidance Counselor'),
  ('Student Affairs Head'),
  ('Faculty Member')
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;

-- Calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type calendar_event_type NOT NULL DEFAULT 'reminder',
  description TEXT NULL,
  event_date DATE NOT NULL,
  event_time TIME NULL,
  created_by VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for calendar_events updated_at
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_event_date ON calendar_events(event_date);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NULL,
  user_name VARCHAR(120) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(50) NULL,
  resource_name VARCHAR(255) NULL,
  description TEXT NULL,
  ip_address VARCHAR(45) NULL,
  status activity_status NOT NULL DEFAULT 'success',
  metadata JSONB NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type document_type_enum NOT NULL DEFAULT 'other',
  category VARCHAR(120) NULL,
  file_path VARCHAR(500) NOT NULL,
  file_url VARCHAR(500) NULL,
  file_size BIGINT NULL,
  employee_id VARCHAR(50) NULL,
  document_type VARCHAR(50) NULL,
  uploaded_by VARCHAR(120) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for documents updated_at
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'event',
  related_id VARCHAR(50) NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(180) NOT NULL,
  date DATE NOT NULL,
  check_in TIME NULL,
  check_out TIME NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  notes TEXT NULL,
  check_in_image TEXT NULL,
  check_out_image TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_id, date)
);

-- Trigger for attendance updated_at
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for attendance
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for settings updated_at
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('siteTitle', 'Human Resource Management System'),
  ('description', 'A web-based Human Resource Management System of The Great Plebeian College.'),
  ('copyright', '© 2025 Human Resource Management System - The Great Plebeian College. All rights reserved.'),
  ('contactNumber', '+63 9600323101'),
  ('systemEmail', 'hrmsgpcalaminos@gmail.com'),
  ('address', 'Gen. Montemayor St, Alaminos City, Pangasinan'),
  ('latitude', '16.15918'),
  ('longitude', '119.98014'),
  ('logoUrl', NULL)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for password_reset_tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

