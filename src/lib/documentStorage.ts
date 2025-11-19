export interface Document {
  id: string;
  name: string;
  type: 'policy' | 'template' | 'employee-doc' | 'other';
  category: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  description?: string;
}

const STORAGE_KEY = 'hrms_documents';

const MOCK_DOCUMENTS: Document[] = [
  {
    id: '1',
    name: 'Employee Handbook.pdf',
    type: 'policy',
    category: 'HR Policies',
    fileUrl: '#',
    uploadedBy: 'admin',
    uploadedAt: new Date().toISOString(),
    size: '2.5 MB',
    description: 'Company employee handbook',
  },
];

export const documentStorage = {
  getAll(): Document[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_DOCUMENTS));
      return MOCK_DOCUMENTS;
    }
    return JSON.parse(stored);
  },

  getByType(type: string): Document[] {
    return this.getAll().filter(doc => doc.type === type);
  },

  add(document: Omit<Document, 'id'>): Document {
    const documents = this.getAll();
    const newDoc: Document = {
      ...document,
      id: Date.now().toString(),
    };
    documents.push(newDoc);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    return newDoc;
  },

  delete(id: string): boolean {
    const documents = this.getAll();
    const filtered = documents.filter(doc => doc.id !== id);
    if (filtered.length === documents.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },
};
