
export interface AdminUser {
  id: string;
  role: 'admin' | 'user';
  permissions: string[];
}
