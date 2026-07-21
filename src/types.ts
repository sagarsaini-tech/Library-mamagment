export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'LIBRARY_OWNER' | 'STUDENT';
  createdAt?: string;
  libraryId?: string;
}

export interface AuthResponse {
  message?: string;
  user?: User;
  error?: string;
}
