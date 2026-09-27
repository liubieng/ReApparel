import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  INITIAL_USERS, 
  INITIAL_TAGS, 
  INITIAL_CLOTHING_ITEMS, 
  INITIAL_ASSESSMENTS, 
  INITIAL_DAILY_LOGS, 
  INITIAL_FRIEND_REQUESTS, 
  INITIAL_BORROWS, 
  INITIAL_DONATION_OPPORTUNITIES 
} from '../data/seedData';
import { 
  User, 
  ClothingItem, 
  Tag, 
  BSASAssessment, 
  DailyClothingLog, 
  FriendRequest, 
  Borrow, 
  DonationOpportunity, 
  DonationFlag,
  ItemTag,
  AppNotification
} from '../types/database';

// Configuration keys
const STORAGE_KEY_SUPABASE_URL = 'reapparel_supabase_url';
const STORAGE_KEY_SUPABASE_KEY = 'reapparel_supabase_key';
const STORAGE_KEY_ACTIVE_USER = 'reapparel_active_user_id';
const STORAGE_KEY_MOCK_DATA = 'reapparel_prod_database_v2';

// Clean up legacy test database states from previous development sessions
try {
  localStorage.removeItem('reapparel_mock_database_v1');
  localStorage.removeItem('reapparel_mock_database_v2');
  localStorage.removeItem('reapparel_clean_database_v3');
  localStorage.removeItem('reapparel_clean_database_v4');
  localStorage.removeItem('reapparel_clean_database_v5');
  localStorage.removeItem('reapparel_clean_database_v6');
  localStorage.removeItem('reapparel_clean_database_v7');
  localStorage.removeItem('reapparel_prod_database_v1');
} catch (e) {
  // ignore
}

export interface SupabaseConfig {
  url: string;
  key: string;
  isConfigured: boolean;
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const storedUrl = localStorage.getItem(STORAGE_KEY_SUPABASE_URL) || envUrl;
  const storedKey = localStorage.getItem(STORAGE_KEY_SUPABASE_KEY) || envKey;

  return {
    url: storedUrl,
    key: storedKey,
    isConfigured: Boolean(storedUrl && storedKey)
  };
}

export function saveStoredSupabaseConfig(url: string, key: string) {
  if (url && key) {
    localStorage.setItem(STORAGE_KEY_SUPABASE_URL, url);
    localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, key);
  } else {
    localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
    localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
  }
}

let realSupabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (config.isConfigured) {
    if (!realSupabaseClient) {
      try {
        realSupabaseClient = createClient(config.url, config.key, {
          auth: { persistSession: true }
        });
      } catch (err) {
        console.warn('Could not initialize real Supabase client:', err);
      }
    }
    return realSupabaseClient;
  }
  return null;
}

// -----------------------------------------------------------------------------
// IN-BROWSER PERSISTENT MOCK STORE FOR SEAMLESS DEMO & OFFLINE CAPABILITY
// -----------------------------------------------------------------------------

interface MockDatabaseState {
  users: User[];
  tags: Tag[];
  clothing_items: ClothingItem[];
  item_tags: ItemTag[];
  bsas_assessments: BSASAssessment[];
  daily_clothing_logs: DailyClothingLog[];
  friend_requests: FriendRequest[];
  borrows: Borrow[];
  donation_opportunities: DonationOpportunity[];
  donation_flags: DonationFlag[];
  notifications: AppNotification[];
}

function loadInitialMockState(): MockDatabaseState {
  const stored = localStorage.getItem(STORAGE_KEY_MOCK_DATA);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (!parsed.notifications) parsed.notifications = [];
      if (!parsed.item_tags) parsed.item_tags = [];
      // Ensure tags include all seeded categories & 14 curated color families
      if (parsed.tags) {
        INITIAL_TAGS.forEach(initTag => {
          if (!parsed.tags.some((t: Tag) => t.tag_name.toLowerCase() === initTag.tag_name.toLowerCase())) {
            parsed.tags.push(initTag);
          }
        });
      }
      // Strictly purge any legacy seeded or mock donation opportunities from stored database state
      parsed.donation_opportunities = [];
      parsed.donation_flags = [];
      return parsed;
    } catch {
      // fallback
    }
  }

  const initialFlags: DonationFlag[] = [];
  INITIAL_DONATION_OPPORTUNITIES.forEach(opp => {
    if (opp.flags && opp.flags.length > 0) {
      initialFlags.push(...opp.flags);
    }
  });

  const initialItemTags: ItemTag[] = [];
  let itemTagIdCounter = 1;
  INITIAL_CLOTHING_ITEMS.forEach(item => {
    if (item.tags) {
      item.tags.forEach(t => {
        initialItemTags.push({
          item_tag_id: itemTagIdCounter++,
          item_id: item.item_id,
          tag_id: t.tag_id
        });
      });
    }
  });

  const state: MockDatabaseState = {
    users: INITIAL_USERS,
    tags: INITIAL_TAGS,
    clothing_items: INITIAL_CLOTHING_ITEMS,
    item_tags: initialItemTags,
    bsas_assessments: INITIAL_ASSESSMENTS,
    daily_clothing_logs: INITIAL_DAILY_LOGS,
    friend_requests: INITIAL_FRIEND_REQUESTS,
    borrows: INITIAL_BORROWS,
    donation_opportunities: INITIAL_DONATION_OPPORTUNITIES,
    donation_flags: initialFlags,
    notifications: []
  };

  localStorage.setItem(STORAGE_KEY_MOCK_DATA, JSON.stringify(state));
  return state;
}

class MockDatabaseEngine {
  private state: MockDatabaseState;
  private listeners: Set<() => void> = new Set();
  private currentUserId: string | null;

  constructor() {
    this.state = loadInitialMockState();
    this.currentUserId = localStorage.getItem(STORAGE_KEY_ACTIVE_USER) || null;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    localStorage.setItem(STORAGE_KEY_MOCK_DATA, JSON.stringify(this.state));
    this.listeners.forEach(fn => fn());
  }

  public getCurrentUser(): User | null {
    if (!this.currentUserId) return null;
    const user = this.state.users.find(u => u.user_id === this.currentUserId);
    return user || null;
  }

  public setCurrentUserId(userId: string | null) {
    this.currentUserId = userId;
    if (userId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_USER, userId);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
    }
    this.notify();
  }

  public registerUser(userData: { email: string; first_name: string; last_name: string }): User {
    const emailClean = userData.email.trim().toLowerCase();
    const existing = this.state.users.find(u => u.email.toLowerCase() === emailClean);
    if (existing) {
      this.setCurrentUserId(existing.user_id);
      return existing;
    }

    const codePart = (userData.first_name || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'USER';
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const newFriendCode = `RP-${codePart}-${randDigits}`;

    const newUser: User = {
      user_id: `u-${Date.now()}`,
      email: emailClean,
      first_name: userData.first_name.trim(),
      last_name: userData.last_name.trim(),
      friend_code: newFriendCode,
      created_at: new Date().toISOString()
    };

    this.state.users.push(newUser);
    this.setCurrentUserId(newUser.user_id);
    this.notify();
    return newUser;
  }

  public loginUser(emailOrCode: string): User | null {
    const search = emailOrCode.trim().toLowerCase();
    const found = this.state.users.find(
      u => u.email.toLowerCase() === search || 
           u.friend_code.toLowerCase() === search ||
           `${u.first_name} ${u.last_name}`.toLowerCase() === search
    );
    if (found) {
      this.setCurrentUserId(found.user_id);
      return found;
    }
    return null;
  }

  public getAllUsers(): User[] {
    return [...this.state.users];
  }

  public getTags(): Tag[] {
    return [...this.state.tags];
  }

  // --- CLOTHING ITEMS ---
  public getClothingItems(userId?: string): ClothingItem[] {
    const targetUid = userId || this.currentUserId;
    return this.state.clothing_items.filter(item => item.user_id === targetUid);
  }

  public getItemById(itemId: number): ClothingItem | undefined {
    return this.state.clothing_items.find(i => i.item_id === itemId);
  }

  public getItemTags(itemId?: number): ItemTag[] {
    if (!this.state.item_tags) return [];
    if (itemId) {
      return this.state.item_tags.filter(it => it.item_id === itemId);
    }
    return [...this.state.item_tags];
  }

  public addClothingItem(item: Omit<ClothingItem, 'item_id' | 'wear_count' | 'date_added'>): ClothingItem {
    const newItem: ClothingItem = {
      ...item,
      addition_type: item.addition_type || 'Old',
      item_id: Date.now() + Math.floor(Math.random() * 1000),
      wear_count: 0,
      date_added: new Date().toISOString()
    };
    this.state.clothing_items.unshift(newItem);

    // Save item_tags
    if (newItem.tags && newItem.tags.length > 0) {
      if (!this.state.item_tags) this.state.item_tags = [];
      newItem.tags.forEach(tag => {
        this.state.item_tags.push({
          item_tag_id: Date.now() + Math.floor(Math.random() * 10000),
          item_id: newItem.item_id,
          tag_id: tag.tag_id
        });
      });
    }

    this.notify();
    return newItem;
  }

  public updateClothingItem(itemId: number, updates: Partial<ClothingItem>): ClothingItem | null {
    const idx = this.state.clothing_items.findIndex(i => i.item_id === itemId);
    if (idx === -1) return null;
    this.state.clothing_items[idx] = { ...this.state.clothing_items[idx], ...updates };

    // Update item_tags if tags were modified
    if (updates.tags) {
      if (!this.state.item_tags) this.state.item_tags = [];
      this.state.item_tags = this.state.item_tags.filter(it => it.item_id !== itemId);
      updates.tags.forEach(tag => {
        this.state.item_tags.push({
          item_tag_id: Date.now() + Math.floor(Math.random() * 10000),
          item_id: itemId,
          tag_id: tag.tag_id
        });
      });
    }

    this.notify();
    return this.state.clothing_items[idx];
  }

  public deleteClothingItem(itemId: number): boolean {
    this.state.clothing_items = this.state.clothing_items.filter(i => i.item_id !== itemId);
    // Cascade remove from item_tags (ItemTag.item_id ON DELETE CASCADE)
    if (this.state.item_tags) {
      this.state.item_tags = this.state.item_tags.filter(it => it.item_id !== itemId);
    }
    // Cascade remove from daily logs and borrows
    this.state.daily_clothing_logs.forEach(log => {
      if (log.items) {
        log.items = log.items.filter(item => item.item_id !== itemId);
      }
    });
    this.state.borrows = this.state.borrows.filter(b => b.item_id !== itemId);
    this.notify();
    return true;
  }

  // --- BSAS ASSESSMENTS ---
  public getAssessments(userId?: string): BSASAssessment[] {
    const targetUid = userId || this.currentUserId;
    return this.state.bsas_assessments
      .filter(a => a.user_id === targetUid)
      .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
  }

  public addAssessment(score: number, breakdown?: BSASAssessment['breakdown']): BSASAssessment {
    const risk_level = score >= 4 ? 'Indicative' : 'Non-Indicative';
    const newAssessment: BSASAssessment = {
      assessment_id: Date.now(),
      user_id: this.currentUserId || 'guest',
      score,
      risk_level,
      taken_at: new Date().toISOString(),
      breakdown
    };
    this.state.bsas_assessments.unshift(newAssessment);
    this.notify();
    return newAssessment;
  }

  // --- DAILY CLOTHING LOGS ---
  public getDailyLogs(userId?: string): DailyClothingLog[] {
    const targetUid = userId || this.currentUserId;
    if (!targetUid) return [];
    return this.state.daily_clothing_logs
      .filter(l => l.user_id === targetUid)
      .sort((a, b) => b.log_date.localeCompare(a.log_date));
  }

  // Automated locking (scheduled Supabase pg_cron job / edge trigger at 00:00 midnight)
  public autoFinalizePastLogs(currentDateString: string) {
    let changed = false;
    this.state.daily_clothing_logs.forEach(log => {
      if (log.log_date < currentDateString && !log.is_finalized) {
        log.is_finalized = true;
        log.finalized_at = `${log.log_date}T23:59:59.000Z`;
        if (log.items) {
          log.items.forEach(logItem => {
            const closetItem = this.state.clothing_items.find(i => i.item_id === logItem.item_id);
            if (closetItem) {
              closetItem.wear_count = (closetItem.wear_count || 0) + 1;
            }
          });
        }
        changed = true;
      }
    });
    if (changed) {
      this.notify();
    }
  }

  public getTodayLog(dateString: string): DailyClothingLog {
    this.autoFinalizePastLogs(dateString);

    const targetUid = this.currentUserId || 'guest';
    let log = this.state.daily_clothing_logs.find(
      l => l.user_id === targetUid && l.log_date === dateString
    );
    if (!log) {
      log = {
        log_id: Date.now(),
        user_id: targetUid,
        log_date: dateString,
        is_finalized: false,
        finalized_at: null,
        items: []
      };
      this.state.daily_clothing_logs.unshift(log);
      this.notify();
    }
    return log;
  }

  public updateTodayLogItems(logId: number, items: ClothingItem[]): DailyClothingLog | null {
    const log = this.state.daily_clothing_logs.find(l => l.log_id === logId);
    if (!log || log.is_finalized) return null;
    log.items = items;
    this.notify();
    return log;
  }

  // Delete daily wear log (3.2 Update & Delete Daily Wear Log)
  public deleteDailyLog(logId: number): boolean {
    const idx = this.state.daily_clothing_logs.findIndex(l => l.log_id === logId);
    if (idx === -1) return false;
    const log = this.state.daily_clothing_logs[idx];
    if (log.is_finalized) return false; // Edits frozen once locked
    this.state.daily_clothing_logs.splice(idx, 1);
    this.notify();
    return true;
  }

  // Simulate automated midnight finalization (3.3 Midnight Finalization)
  public simulateMidnightFinalization(dateString?: string): DailyClothingLog | null {
    const todayStr = dateString || new Date().toISOString().split('T')[0];
    const log = this.getTodayLog(todayStr);
    if (log && !log.is_finalized) {
      return this.finalizeDailyLog(log.log_id);
    }
    return log;
  }

  public finalizeDailyLog(logId: number): DailyClothingLog | null {
    const log = this.state.daily_clothing_logs.find(l => l.log_id === logId);
    if (!log) return null;

    if (!log.is_finalized) {
      log.is_finalized = true;
      log.finalized_at = new Date().toISOString();

      // Increment wear counts for all logged items
      if (log.items) {
        log.items.forEach(logItem => {
          const closetItem = this.state.clothing_items.find(i => i.item_id === logItem.item_id);
          if (closetItem) {
            closetItem.wear_count = (closetItem.wear_count || 0) + 1;
          }
        });
      }
      this.notify();
    }
    return log;
  }

  // --- FRIENDS & BORROW REQUESTS ---
  public getFriendRequests(): FriendRequest[] {
    return this.state.friend_requests.map(req => {
      const sender = this.state.users.find(u => u.user_id === req.sender_id);
      const receiver = this.state.users.find(u => u.user_id === req.receiver_id);
      return { ...req, sender, receiver };
    });
  }

  public sendFriendRequest(targetFriendCode: string): { success: boolean; message: string } {
    const cleanCode = targetFriendCode.trim().toUpperCase();
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'Please log in or register first.' };
    }

    if (currentUser.friend_code.toUpperCase() === cleanCode) {
      return { success: false, message: 'You cannot add yourself as a friend.' };
    }

    const targetUser = this.state.users.find(u => u.friend_code.toUpperCase() === cleanCode);
    if (!targetUser) {
      return { success: false, message: 'Friend code not found. Please verify the code.' };
    }

    // Check existing request
    const existing = this.state.friend_requests.find(
      r => (r.sender_id === currentUser.user_id && r.receiver_id === targetUser.user_id) ||
           (r.sender_id === targetUser.user_id && r.receiver_id === currentUser.user_id)
    );

    if (existing) {
      if (existing.status === 'accepted') {
        return { success: false, message: 'You are already friends with this person!' };
      }
      return { success: false, message: 'A pending request already exists between you.' };
    }

    const newReq: FriendRequest = {
      request_id: Date.now(),
      sender_id: currentUser.user_id,
      receiver_id: targetUser.user_id,
      status: 'pending',
      updated_at: new Date().toISOString()
    };

    this.state.friend_requests.unshift(newReq);

    // Create notification for recipient (e.g. Mario gets notified that Liu sent a friend request)
    if (!this.state.notifications) this.state.notifications = [];
    this.state.notifications.unshift({
      id: `notif-fr-${Date.now()}`,
      user_id: targetUser.user_id,
      title: `${currentUser.first_name} sent a friend request to ${targetUser.first_name}`,
      message: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.friend_code}) sent you a friend request.`,
      time: 'Just now',
      type: 'friend_request',
      read: false,
      sender_name: `${currentUser.first_name} ${currentUser.last_name}`,
      sender_id: currentUser.user_id,
      receiver_id: targetUser.user_id,
      receiver_name: `${targetUser.first_name} ${targetUser.last_name}`,
      request_id: newReq.request_id
    });

    this.notify();
    return { success: true, message: `Friend request sent to ${targetUser.first_name} ${targetUser.last_name}!` };
  }

  public respondToFriendRequest(requestId: number, newStatus: 'accepted' | 'rejected') {
    const req = this.state.friend_requests.find(r => r.request_id === requestId);
    if (req) {
      req.status = newStatus;
      req.updated_at = new Date().toISOString();

      const sender = this.state.users.find(u => u.user_id === req.sender_id);
      const receiver = this.state.users.find(u => u.user_id === req.receiver_id);

      if (newStatus === 'accepted' && sender && receiver) {
        if (!this.state.notifications) this.state.notifications = [];
        this.state.notifications.unshift({
          id: `notif-acc-${Date.now()}`,
          user_id: sender.user_id,
          title: `${receiver.first_name} accepted your friend request!`,
          message: `You and ${receiver.first_name} ${receiver.last_name} are now connected friends. You can view their closet and borrow clothes!`,
          time: 'Just now',
          type: 'friend_request',
          read: false,
          sender_name: `${receiver.first_name} ${receiver.last_name}`,
          sender_id: receiver.user_id,
          receiver_id: sender.user_id,
          receiver_name: `${sender.first_name} ${sender.last_name}`,
          request_id: requestId
        });
      }
      this.notify();
    }
  }

  // --- NOTIFICATIONS SYSTEM ---
  public getNotifications(userId?: string): AppNotification[] {
    const targetUid = userId || this.currentUserId;
    if (!targetUid) return [];
    if (!this.state.notifications) this.state.notifications = [];
    return this.state.notifications.filter(n => !n.user_id || n.user_id === targetUid);
  }

  public clearNotifications(userId?: string) {
    const targetUid = userId || this.currentUserId;
    if (this.state.notifications) {
      this.state.notifications = this.state.notifications.filter(n => n.user_id && n.user_id !== targetUid);
      this.notify();
    }
  }

  public getBorrows(): Borrow[] {
    return this.state.borrows.map(b => {
      const item = this.state.clothing_items.find(i => i.item_id === b.item_id);
      const borrower = this.state.users.find(u => u.user_id === b.borrower_id);
      const lender = item ? this.state.users.find(u => u.user_id === item.user_id) : undefined;
      return { ...b, item, borrower, lender };
    });
  }

  public createBorrowRequest(itemId: number, startDate: string, endDate: string): Borrow {
    const newBorrow: Borrow = {
      borrow_id: Date.now(),
      borrower_id: this.currentUserId || '',
      item_id: itemId,
      start_date: startDate,
      end_date: endDate,
      status: 'Pending',
      created_at: new Date().toISOString()
    };
    this.state.borrows.unshift(newBorrow);
    this.notify();
    return newBorrow;
  }

  public updateBorrowStatus(borrowId: number, status: Borrow['status']) {
    const b = this.state.borrows.find(item => item.borrow_id === borrowId);
    if (b) {
      b.status = status;
      const item = this.state.clothing_items.find(i => i.item_id === b.item_id);
      const lender = this.getCurrentUser();
      if (!this.state.notifications) this.state.notifications = [];
      if (status === 'Accepted') {
        this.state.notifications.unshift({
          id: `notif-bw-${Date.now()}`,
          user_id: b.borrower_id,
          title: `Borrow request approved!`,
          message: `${lender?.first_name || 'Your friend'} approved your request to borrow "${item?.name || 'clothing item'}" from ${b.start_date} to ${b.end_date}.`,
          time: 'Just now',
          type: 'borrow',
          read: false
        });
      } else if (status === 'Returned') {
        this.state.notifications.unshift({
          id: `notif-rt-${Date.now()}`,
          user_id: b.borrower_id,
          title: `Item marked as returned`,
          message: `"${item?.name || 'clothing item'}" has been marked as returned to ${lender?.first_name || 'owner'}. Thank you for mindful borrowing!`,
          time: 'Just now',
          type: 'borrow',
          read: false
        });
      }
      this.notify();
    }
  }

  // --- DONATIONS & COMMUNITY FLAGS ---
  public getDonationOpportunities(): DonationOpportunity[] {
    return this.state.donation_opportunities.map(opp => {
      const flags = this.state.donation_flags.filter(f => f.donation_id === opp.donation_id);
      return {
        ...opp,
        flags,
        flags_count: flags.length
      };
    });
  }

  public addDonationFlag(donationId: number, flagType: DonationFlag['flag_type'], notes?: string): DonationFlag {
    const user = this.getCurrentUser();
    const newFlag: DonationFlag = {
      flag_id: Date.now(),
      donation_id: donationId,
      user_id: user ? user.user_id : 'guest',
      flag_type: flagType,
      notes,
      flagged_at: new Date().toISOString(),
      user_name: user ? `${user.first_name} ${user.last_name}` : 'Community Member'
    };
    this.state.donation_flags.unshift(newFlag);
    this.notify();
    return newFlag;
  }

  public addDonationOpportunity(opp: Omit<DonationOpportunity, 'donation_id'>): DonationOpportunity {
    const newOpp: DonationOpportunity = {
      ...opp,
      donation_id: Date.now(),
      flags: [],
      flags_count: 0
    };
    this.state.donation_opportunities.push(newOpp);
    this.notify();
    return newOpp;
  }

  public setDonationOpportunities(opportunities: DonationOpportunity[]) {
    this.state.donation_opportunities = opportunities;
    this.notify();
  }

  public addMultipleDonationOpportunities(newOpps: DonationOpportunity[]) {
    for (const opp of newOpps) {
      const exists = this.state.donation_opportunities.some(
        o => o.name.toLowerCase() === opp.name.toLowerCase() ||
             (Math.abs(o.latitude - opp.latitude) < 0.001 && Math.abs(o.longitude - opp.longitude) < 0.001)
      );
      if (!exists) {
        this.state.donation_opportunities.unshift(opp);
      }
    }
    this.notify();
  }

  public clearDonationOpportunities() {
    this.state.donation_opportunities = [];
    this.state.donation_flags = [];
    this.notify();
  }

  public clearAllData() {
    this.state.clothing_items = [];
    this.state.bsas_assessments = [];
    this.state.daily_clothing_logs = [];
    this.state.friend_requests = [];
    this.state.borrows = [];
    this.state.donation_opportunities = [];
    this.state.donation_flags = [];
    this.notify();
  }

  public resetToFactorySeeds() {
    localStorage.removeItem(STORAGE_KEY_MOCK_DATA);
    this.state = loadInitialMockState();
    this.notify();
  }
}

export const mockDatabase = new MockDatabaseEngine();
