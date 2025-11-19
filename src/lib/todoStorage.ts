export interface Todo {
  id: string;
  task: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'hrms_todos';

export const todoStorage = {
  getAll(): Todo[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  },

  add(task: string): Todo {
    const todos = this.getAll();
    const newTodo: Todo = {
      id: Date.now().toString(),
      task: task.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    todos.push(newTodo);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    return newTodo;
  },

  update(id: string, updates: Partial<Todo>): Todo | null {
    const todos = this.getAll();
    const index = todos.findIndex(todo => todo.id === id);
    if (index === -1) return null;
    todos[index] = { ...todos[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    return todos[index];
  },

  toggle(id: string): Todo | null {
    const todo = this.getAll().find(t => t.id === id);
    if (!todo) return null;
    return this.update(id, { completed: !todo.completed });
  },

  delete(id: string): boolean {
    const todos = this.getAll();
    const filtered = todos.filter(todo => todo.id !== id);
    if (filtered.length === todos.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },
};

