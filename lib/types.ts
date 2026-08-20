export type UserRole = 'Admin' | 'User';

export interface Role {
  id: string;
  role_name: UserRole;
}

export interface User {
  id: string;
  full_name: string;
  username: string;
  password_hash?: string;
  role_id: string;
  role_name?: UserRole;
  created_on: string;
}

export interface SafeUser {
  id: string;
  full_name: string;
  username: string;
  role_name: UserRole;
  created_on: string;
}

export interface Lead {
  id: string;
  company_name: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  industry: string;
  source: string;
  source_url: string | null;
  created_on: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  exp?: number;
}

export interface LeadGenerationInput {
  niche: string;
  location: string;
  limit: number;
}

export interface LeadGenerationResult {
  totalFound: number;
  insertedCount: number;
  duplicatesCount: number;
  leads: Lead[];
}
