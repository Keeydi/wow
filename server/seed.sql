CREATE DATABASE IF NOT EXISTS hrm;
USE hrm;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  employee_id VARCHAR(50) UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
  password_hash VARCHAR(255) NOT NULL,
  password_reset_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed admin account (password: admin123)
INSERT INTO users (username, email, employee_id, full_name, role, password_hash)
VALUES ('admin', 'admin@greatplebeian.edu', NULL, 'System Administrator', 'admin', 'admin123')
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Seed employee account (password: emp123)
INSERT INTO users (username, email, employee_id, full_name, role, password_hash)
VALUES ('employee', 'employee@greatplebeian.edu', 'EMP001', 'John Doe', 'employee', 'emp123')
ON DUPLICATE KEY UPDATE email = VALUES(email), employee_id = VALUES(employee_id), role = VALUES(role);

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
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
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  archived_reason VARCHAR(255) NULL,
  archived_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO employees (employee_id, first_name, middle_name, last_name, suffix_name, full_name, department, position, email, phone, date_of_birth, address, date_hired, employment_type, status)
VALUES 
  ('EMP001', 'John', 'A.', 'Doe', 'Jr.', 'John A. Doe Jr.', 'IT Department', 'Software Developer', 'john.doe@company.com', '+1234567890', '1990-05-15', '123 Main St, City, State 12345', '2020-01-15', 'Regular', 'active'),
  ('EMP002', 'Jane', 'B.', 'Smith', '', 'Jane B. Smith', 'HR Department', 'HR Manager', 'jane.smith@company.com', '+1234567891', '1988-08-22', '456 Oak Ave, City, State 12345', '2019-03-10', 'Regular', 'active'),
  ('EMP003', 'Mike', 'C.', 'Johnson', '', 'Mike C. Johnson', 'Finance', 'Accountant', 'mike.johnson@company.com', '+1234567892', '1992-12-05', '789 Pine Rd, City, State 12345', '2021-06-20', 'Regular', 'active')
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  middle_name = VALUES(middle_name),
  last_name = VALUES(last_name),
  suffix_name = VALUES(suffix_name),
  full_name = VALUES(full_name),
  department = VALUES(department),
  position = VALUES(position),
  email = VALUES(email),
  phone = VALUES(phone),
  date_of_birth = VALUES(date_of_birth),
  address = VALUES(address),
  date_hired = VALUES(date_hired),
  employment_type = VALUES(employment_type),
  status = VALUES(status);

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS designations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed initial departments
INSERT INTO departments (name)
VALUES 
  ('Board of Directors'),
  ('Administration Department'),
  ('Finance Department'),
  ('High School Department'),
  ('College Department'),
  ('Elementary Department')
ON DUPLICATE KEY UPDATE name = VALUES(name);

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
ON DUPLICATE KEY UPDATE name = VALUES(name);

CREATE TABLE IF NOT EXISTS calendar_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type ENUM('reminder', 'event') NOT NULL DEFAULT 'reminder',
  description TEXT NULL,
  event_date DATE NOT NULL,
  event_time TIME NULL,
  created_by VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_event_date (event_date)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  user_name VARCHAR(120) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(50) NULL,
  resource_name VARCHAR(255) NULL,
  description TEXT NULL,
  ip_address VARCHAR(45) NULL,
  status ENUM('success', 'failed', 'warning') NOT NULL DEFAULT 'success',
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_action_type (action_type),
  INDEX idx_resource_type (resource_type),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('policy', 'template', 'employee-doc', 'other') NOT NULL DEFAULT 'other',
  category VARCHAR(120) NULL,
  file_path VARCHAR(500) NOT NULL,
  file_url VARCHAR(500) NULL,
  file_size BIGINT NULL,
  employee_id VARCHAR(50) NULL,
  document_type VARCHAR(50) NULL,
  uploaded_by VARCHAR(120) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_employee_id (employee_id),
  INDEX idx_category (category),
  INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'event',
  related_id VARCHAR(50) NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  INDEX idx_type (type)
);

CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(180) NOT NULL,
  date DATE NOT NULL,
  check_in TIME NULL,
  check_out TIME NULL,
  status ENUM('present', 'absent', 'late', 'half-day', 'leave') NOT NULL DEFAULT 'present',
  notes TEXT NULL,
  check_in_image TEXT NULL,
  check_out_image TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee_id (employee_id),
  INDEX idx_date (date),
  INDEX idx_status (status),
  INDEX idx_employee_date (employee_id, date),
  UNIQUE KEY unique_employee_date (employee_id, date)
);

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (`key`, `value`) VALUES
  ('siteTitle', 'Human Resource Management System'),
  ('description', 'A web-based Human Resource Management System of The Great Plebeian College.'),
  ('copyright', '© 2025 Human Resource Management System - The Great Plebeian College. All rights reserved.'),
  ('contactNumber', '+63 9600323101'),
  ('systemEmail', 'hrmsgpcalaminos@gmail.com'),
  ('address', 'Gen. Montemayor St, Alaminos City, Pangasinan'),
  ('latitude', '16.15918'),
  ('longitude', '119.98014'),
  ('logoUrl', NULL)
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);

