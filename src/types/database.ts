/**
 * ReApparel Database Types & Entity Models
 * Aligned with Normalized Supabase PostgreSQL Schema
 */

export interface User {
  user_id: string; // UUID
  email: string;
  first_name: string;
  last_name: string;
  friend_code: string;
  created_at: string;
  avatar_url?: string;
}

export type RiskLevel = 'Indicative' | 'Non-Indicative';

export interface BSASAssessment {
  assessment_id: number;
  user_id: string;
  score: number; // 0 to 7
  risk_level: RiskLevel;
  taken_at: string;
  breakdown?: {
    salience: number; // 0 or 1
    mood_modification: number;
    conflict: number;
    tolerance: number;
    relapse: number;
    withdrawal: number;
    problems: number;
  };
}

export type AdditionType = 'Old' | 'New';

export interface ClothingItem {
  item_id: number;
  user_id: string;
  name: string;
  image_url: string;
  addition_type?: AdditionType;
  wear_count: number;
  worn_count?: number;
  date_added: string;
  tags?: Tag[];
  category?: string;
  color?: string;
  type_tag?: string;
  length_tag?: string | null;
  color_tag?: string;
  images?: string[];
}

export type TagType = 'Category' | 'Color';

export interface Tag {
  tag_id: number;
  tag_name: string;
  tag_type: TagType;
  hex_color?: string; // Optional client display helper for color badges
}

export interface ItemTag {
  item_tag_id: number;
  item_id: number;
  tag_id: number;
}

export interface DailyClothingLog {
  log_id: number;
  user_id: string;
  log_date: string; // YYYY-MM-DD
  is_finalized: boolean;
  finalized_at: string | null;
  items?: ClothingItem[];
}

export interface DailyLogItem {
  daily_log_item_id: number;
  log_id: number;
  item_id: number;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  request_id: number;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  updated_at: string;
  sender?: User;
  receiver?: User;
}

export type BorrowStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Returned';

export interface Borrow {
  borrow_id: number;
  borrower_id: string;
  item_id: number;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  status: BorrowStatus;
  created_at: string;
  item?: ClothingItem;
  borrower?: User;
  lender?: User;
}

export interface DonationOpportunity {
  donation_id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  hours?: string;
  accepted_types?: string;
  distance_km?: number;
  flags_count?: number;
  flags?: DonationFlag[];
  is_live_drive?: boolean;
  organizer?: string;
  source_url?: string;
  official_page_url?: string;
  facebook_search_url?: string;
  post_url?: string;
  post_platform?: 'facebook' | 'instagram' | 'announcement' | 'community';
  post_title?: string;
  post_snippet?: string;
  post_date?: string;
  days_ago?: number;
  active_window?: string;
  is_last_30_days?: boolean;
  drive_dates?: string;
  scraped_at?: string;
  country?: string;
  province?: string;
  city?: string;
}

export type DonationFlagType = 'Inactive' | 'Inaccurate';

export interface DonationFlag {
  flag_id: number;
  donation_id: number;
  user_id: string;
  flag_type: DonationFlagType;
  notes?: string;
  flagged_at: string;
  user_name?: string;
}

export interface BSASQuestion {
  id: number;
  key: string;
  title: string;
  description: string;
  dimension: string;
}

export interface AppNotification {
  id: string;
  user_id?: string;
  title: string;
  message?: string;
  time: string;
  type: 'friend_request' | 'borrow' | 'borrow_request' | 'streak' | 'drive' | 'system';
  read?: boolean;
  sender_name?: string;
  sender_id?: string;
  receiver_id?: string;
  receiver_name?: string;
  request_id?: number;
}
