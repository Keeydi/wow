import { Employee } from '@/types/employee';

const formatDate = (date?: string | null): string => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return date;
  }
};

const baseStyles = `
  @page { size: letter; margin: 1in; }
  body { font-family: 'Times New Roman', serif; line-height: 1.6; color: #0f172a; }
  h1, h2, h3 { text-align: center; margin: 0; }
  .section { margin-top: 24px; }
  .section h3 { text-transform: uppercase; font-size: 14px; letter-spacing: 1px; border-bottom: 1px solid #94a3b8; padding-bottom: 4px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #cbd5f5; padding: 6px 10px; text-align: left; }
  th { background: #e2e8f0; font-weight: 600; }
  .signature { margin-top: 48px; display: flex; justify-content: space-between; }
  .signature div { width: 45%; text-align: center; }
  .signature-line { border-top: 1px solid #0f172a; margin-top: 60px; padding-top: 4px; font-size: 12px; }
`;

export const generateCertificateOfEmployment = (employee: Employee): string => {
  const currentDate = formatDate(new Date().toISOString());

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Certificate of Employment - ${employee.fullName}</title>
    <style>
      ${baseStyles}
      .header { text-align: center; margin-bottom: 30px; }
      .header h1 { font-size: 22px; letter-spacing: 2px; }
      .content { text-align: justify; line-height: 1.9; margin-top: 24px; }
      .content p { margin: 0 0 18px; text-indent: 36px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>THE GREAT PLEBEIAN COLLEGE</h1>
      <p>General Pedro Corpus, San Vicente, Palawan</p>
      <p>Email: info@gpcc.edu.ph | Tel: (048) 123-4567</p>
    </div>

    <h2 style="margin-top: 16px; letter-spacing: 1px;">CERTIFICATE OF EMPLOYMENT</h2>

    <div class="content">
      <p>
        This is to certify that <strong>${employee.fullName}</strong>, with Employee ID
        <strong>${employee.employeeId}</strong>, is presently employed at The Great Plebeian College
        ${employee.position ? `as ${employee.position}` : ''} ${employee.department ? `under the ${employee.department} Department` : ''}.
      </p>
      <p>
        ${employee.dateHired ? `He/She has been serving the institution since ${formatDate(employee.dateHired)}.` : 'He/She is in good standing with the institution.'}
      </p>
      <p>
        This certificate is issued upon the request of the employee for whatever legal purpose it may serve.
      </p>
      <p>
        Issued this ${currentDate}.
      </p>
    </div>

    <div class="signature">
      <div>
        <div class="signature-line">
          <strong>HR Manager</strong>
        </div>
      </div>
      <div>
        <div class="signature-line">
          <strong>School Administrator</strong>
        </div>
      </div>
    </div>
  </body>
</html>
`;
};

export const generatePersonalDataSheet = (employee: Employee): string => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>PDS - ${employee.fullName}</title>
    <style>
      ${baseStyles}
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; }
      .grid div { font-size: 13px; }
      .grid span { font-weight: 600; color: #0f172a; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; display: block; }
    </style>
  </head>
  <body>
    <h2>PERSONAL DATA SHEET</h2>

    <div class="section">
      <h3>Personal Information</h3>
      <div class="grid">
        <div><span>FULL NAME</span>${employee.fullName}</div>
        <div><span>EMPLOYEE ID</span>${employee.employeeId}</div>
        <div><span>DATE OF BIRTH</span>${formatDate(employee.dateOfBirth)}</div>
        <div><span>GENDER</span>${employee.gender || 'N/A'}</div>
        <div><span>CIVIL STATUS</span>${employee.civilStatus || 'N/A'}</div>
        <div><span>ADDRESS</span>${employee.address}</div>
        <div><span>EMAIL</span>${employee.email}</div>
        <div><span>CONTACT NUMBER</span>${employee.phone}</div>
      </div>
    </div>

    <div class="section">
      <h3>Employment Details</h3>
      <div class="grid">
        <div><span>DEPARTMENT</span>${employee.department}</div>
        <div><span>POSITION</span>${employee.position}</div>
        <div><span>DATE HIRED</span>${formatDate(employee.dateHired)}</div>
        <div><span>EMPLOYMENT TYPE</span>${employee.employmentType || 'N/A'}</div>
      </div>
    </div>

    <div class="section">
      <h3>ID NUMBERS</h3>
      <div class="grid">
        <div><span>SSS NUMBER</span>${employee.sssNumber || 'N/A'}</div>
        <div><span>PAG-IBIG NUMBER</span>${employee.pagibigNumber || 'N/A'}</div>
        <div><span>TIN NUMBER</span>${employee.tinNumber || 'N/A'}</div>
      </div>
    </div>
  </body>
</html>
`;

export const generateServiceRecord = (employee: Employee): string => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Service Record - ${employee.fullName}</title>
    <style>
      ${baseStyles}
      .note { font-size: 12px; color: #475569; margin-top: 8px; }
    </style>
  </head>
  <body>
    <h2>SERVICE RECORD</h2>
    <p>Employee Name: <strong>${employee.fullName}</strong></p>
    <p>Employee ID: <strong>${employee.employeeId}</strong></p>

    <div class="section">
      <table>
        <thead>
          <tr>
            <th>Inclusive Dates</th>
            <th>Designation</th>
            <th>Status</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${formatDate(employee.dateHired)} - ${employee.dateOfLeaving ? formatDate(employee.dateOfLeaving) : 'Present'}</td>
            <td>${employee.position}</td>
            <td>${employee.employmentType || 'Regular'}</td>
            <td>${employee.department}</td>
          </tr>
        </tbody>
      </table>
      <p class="note">Generated automatically by HR Hub.</p>
    </div>

    <div class="signature">
      <div>
        <div class="signature-line">
          <strong>Certified Correct</strong>
        </div>
      </div>
    </div>
  </body>
</html>
`;

export const generateFile201Document = (employee: Employee): string => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>201 File - ${employee.fullName}</title>
    <style>
      ${baseStyles}
    </style>
  </head>
  <body>
    <h2>201 FILE SUMMARY</h2>

    <div class="section">
      <h3>Employee Snapshot</h3>
      <table>
        <tbody>
          <tr>
            <th>Employee Name</th>
            <td>${employee.fullName}</td>
          </tr>
          <tr>
            <th>Employee ID</th>
            <td>${employee.employeeId}</td>
          </tr>
          <tr>
            <th>Position</th>
            <td>${employee.position}</td>
          </tr>
          <tr>
            <th>Department</th>
            <td>${employee.department}</td>
          </tr>
          <tr>
            <th>Date Hired</th>
            <td>${formatDate(employee.dateHired)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h3>Compliance</h3>
      <table>
        <thead>
          <tr>
            <th>Document</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Personal Data Sheet</td>
            <td>${employee.pdsFile ? 'On file' : 'Pending'}</td>
          </tr>
          <tr>
            <td>Service Records</td>
            <td>${employee.serviceRecordFile ? 'On file' : 'Pending'}</td>
          </tr>
          <tr>
            <td>Signature & Face Registration</td>
            <td>${employee.registeredFaceFile ? 'Completed' : 'Pending'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </body>
</html>
`;

export type DocumentTemplateKey = 'pds' | 'file201' | 'coe' | 'serviceRecord';

export const generateDocumentByTemplate = (key: DocumentTemplateKey, employee: Employee): string => {
  switch (key) {
    case 'pds':
      return generatePersonalDataSheet(employee);
    case 'file201':
      return generateFile201Document(employee);
    case 'serviceRecord':
      return generateServiceRecord(employee);
    case 'coe':
    default:
      return generateCertificateOfEmployment(employee);
  }
};

