export type UserRole = 'Admin' | 'User';

export type LeadStatus =
  | 'New'
  | 'Disconnected'
  | 'DNP'
  | 'Unreachable'
  | 'Scheduled'
  | 'In discussion'
  | 'Interested'
  | 'Follow Up'
  | 'Not Interested'
  | 'PO';

export const LEAD_STATUS_OPTIONS: LeadStatus[] = [
  'New',
  'Disconnected',
  'DNP',
  'Unreachable',
  'Scheduled',
  'In discussion',
  'Interested',
  'Follow Up',
  'Not Interested',
  'PO',
];

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
  email: string | null;
  address: string | null;
  industry: string;
  status: LeadStatus;
  source: string;
  source_url: string | null;
  created_on: string;
}

export interface Comment {
  id: string;
  lead_id: string;
  user_id: string | null;
  full_name?: string | null;
  username?: string | null;
  status: LeadStatus;
  comment_text: string;
  created_at: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  exp?: number;
}

export interface DiscoveredLead {
  temp_id?: string;
  company_name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  industry: string;
  source: string;
  source_url: string | null;
  status: LeadStatus;
  isSaved?: boolean;
}

export interface LeadDiscoveryResult {
  totalFound: number;
  leads: DiscoveredLead[];
}
