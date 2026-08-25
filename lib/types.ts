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
  company_name?: string;
  email?: string;
  email_password?: string;
  smtp_host?: string;
  smtp_port?: number;
  incoming_server_host?: string;
  incoming_server_port?: number;
  custom_places_api_key?: string;
  created_on: string;
}

export interface SafeUser {
  id: string;
  full_name: string;
  username: string;
  role_name: UserRole;
  company_name?: string;
  email?: string;
  smtp_host?: string;
  smtp_port?: number;
  incoming_server_host?: string;
  incoming_server_port?: number;
  custom_places_api_key?: string;
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
  additional_emails?: string[];
  additional_phones?: string[];
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

export interface EmailFormat {
  id: string;
  format_name: string;
  user_id: string;
  subject: string;
  format_large_text: string;
  created_at: string;
}

export type CampaignStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'STOPPED' | 'FAILED' | 'SCHEDULED';

export interface StateItem {
  id: string;
  state_name: string;
  cities_json: { city: string; order: number }[];
}

export interface Campaign {
  id: string;
  campaign_name: string;
  keywords: string[];
  locations: string[];
  target_emails: number;
  daily_email_limit?: number;
  daily_email_count?: number;
  last_daily_reset?: string | null;
  credits_used?: number;
  is_state_campaign?: boolean;
  selected_states?: string[];
  city_progress_order?: number;
  email_format_id: string | null;
  email_format_name?: string | null;
  searches_count: number;
  leads_found_count: number;
  leads_enhanced_count: number;
  email_sent_count: number;
  status: CampaignStatus;
  started_at?: string | null;
  time_taken_seconds?: number;
  current_combination?: string | null;
  last_update?: string | null;
  created_by_user_id: string;
  created_by_username?: string;
  created_by_full_name?: string;
  created_at: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  exp?: number;
}

export interface LeadDiscoveryResult {
  totalFound: number;
  leads: DiscoveredLead[];
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
