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
export const STORAGE_KEY_SUPABASE_URL = 'reapparel_supabase_url';
export const STORAGE_KEY_SUPABASE_KEY = 'reapparel_supabase_key';
export const STORAGE_KEY_ACTIVE_USER = 'reapparel_active_user_id';
export const STORAGE_KEY_ACTIVE_VIEW = 'reapparel_active_view';
export const STORAGE_KEY_MOCK_DATA = 'reapparel_prod_database_v2';

// Safe storage helper for SSR and headless execution
export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return null;
  },
  setItem: (key: string, val: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
  }
};

// Clean up legacy test database states from previous development sessions
try {
  safeStorage.removeItem('reapparel_mock_database_v1');
  safeStorage.removeItem('reapparel_mock_database_v2');
  safeStorage.removeItem('reapparel_clean_database_v3');
  safeStorage.removeItem('reapparel_clean_database_v4');
  safeStorage.removeItem('reapparel_clean_database_v5');
  safeStorage.removeItem('reapparel_clean_database_v6');
  safeStorage.removeItem('reapparel_clean_database_v7');
  safeStorage.removeItem('reapparel_prod_database_v1');
} catch (e) {
  // ignore
}

export interface SupabaseConfig {
  url: string;
  key: string;
  isConfigured: boolean;
}

const DEFAULT_FALLBACK_URL = 'https://mgkcnewvfdpjemiexptm.supabase.co';
const DEFAULT_FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na2NuZXd2ZmRwamVtaWV4cHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1ODQwNzYsImV4cCI6MjEwNjE2MDA3Nn0.vdMZDM6Nsu7xk7bdvRpWTGceYJ9fgIzQd5cJTfN73pQ';

export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || DEFAULT_FALLBACK_URL;
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_FALLBACK_KEY;
  const storedUrl = safeStorage.getItem(STORAGE_KEY_SUPABASE_URL) || envUrl;
  const storedKey = safeStorage.getItem(STORAGE_KEY_SUPABASE_KEY) || envKey;

  return {
    url: storedUrl,
    key: storedKey,
    isConfigured: Boolean(storedUrl && storedKey)
  };
}

export function saveStoredSupabaseConfig(url: string, key: string) {
  if (url && key) {
    safeStorage.setItem(STORAGE_KEY_SUPABASE_URL, url);
    safeStorage.setItem(STORAGE_KEY_SUPABASE_KEY, key);
  } else {
    safeStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
    safeStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
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
  const stored = safeStorage.getItem(STORAGE_KEY_MOCK_DATA);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (!parsed.notifications) parsed.notifications = [];
      // Clean up any stale dummy notification items that might have been saved in localStorage
      if (Array.isArray(parsed.notifications)) {
        parsed.notifications = parsed.notifications.filter((n: AppNotification) => {
          const txt = `${n.title || ''} ${n.message || ''}`.toLowerCase();
          return !txt.includes('circular fashion partner') &&
                 !txt.includes('carbon footprint') &&
                 !txt.includes('start exploring and adding');
        });
      }
      if (!parsed.item_tags) parsed.item_tags = [];
      // Ensure tags include all seeded categories & 14 curated color families
      if (parsed.tags) {
        INITIAL_TAGS.forEach(initTag => {
          if (!parsed.tags.some((t: Tag) => t.tag_name.toLowerCase() === initTag.tag_name.toLowerCase())) {
            parsed.tags.push(initTag);
          }
        });
      }
      
      // Clean slate donation pool: Purge all seed/mock donation opportunities from localStorage
      const cleanDonationPoolKey = 'reapparel_clean_donation_pool_v2';
      if (!safeStorage.getItem(cleanDonationPoolKey)) {
        parsed.donation_opportunities = [];
        parsed.donation_flags = [];
        safeStorage.setItem(cleanDonationPoolKey, 'true');
      } else if (!parsed.donation_opportunities) {
        parsed.donation_opportunities = [];
      } else {
        parsed.donation_opportunities = parsed.donation_opportunities.filter((o: DonationOpportunity) => {
          const name = (o.name || '').toLowerCase();
          return !name.includes('in peace') &&
                 !name.includes('linksy') &&
                 !name.includes('dumaguete animal sanctuary') &&
                 !name.includes('bantayan community');
        });
      }
      parsed.donation_flags = parsed.donation_flags || [];

      // CRITICAL RECOVERY: Ensure any garments registered in daily_clothing_logs are always
      // present in clothing_items so they are never missing from the virtual closet!
      if (!parsed.clothing_items) parsed.clothing_items = [];
      if (!parsed.bsas_assessments) parsed.bsas_assessments = [];
      if (parsed.daily_clothing_logs && Array.isArray(parsed.daily_clothing_logs)) {
        parsed.daily_clothing_logs.forEach((log: DailyClothingLog) => {
          if (log.items && Array.isArray(log.items)) {
            log.items.forEach((item: ClothingItem) => {
              if (!parsed.clothing_items.some((ci: ClothingItem) => ci.item_id === item.item_id)) {
                parsed.clothing_items.unshift({
                  ...item,
                  wear_count: item.wear_count ?? item.worn_count ?? 0,
                  worn_count: item.worn_count ?? item.wear_count ?? 0
                });
              }
            });
          }
        });
      }

      // One-time cleanup for accounts deleted before the deleteUser fix was deployed
      const cleanedDeletedUsersKey = 'reapparel_cleaned_deleted_marioantoniolee_v1';
      if (!safeStorage.getItem(cleanedDeletedUsersKey)) {
        if (parsed.users && Array.isArray(parsed.users)) {
          const stuckIndex = parsed.users.findIndex((u: User) => u.email.toLowerCase() === 'marioantoniolee@gmail.com');
          if (stuckIndex !== -1) {
            const stuckUid = parsed.users[stuckIndex].user_id;
            parsed.users.splice(stuckIndex, 1);
            parsed.clothing_items = (parsed.clothing_items || []).filter((i: ClothingItem) => i.user_id !== stuckUid);
            parsed.bsas_assessments = (parsed.bsas_assessments || []).filter((a: BSASAssessment) => a.user_id !== stuckUid);
            parsed.daily_clothing_logs = (parsed.daily_clothing_logs || []).filter((l: DailyClothingLog) => l.user_id !== stuckUid);
            const activeUser = safeStorage.getItem(STORAGE_KEY_ACTIVE_USER);
            if (activeUser === stuckUid) {
              safeStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
            }
          }
        }
        safeStorage.setItem(cleanedDeletedUsersKey, 'true');
      }

      // Clean up seed demo accounts mario@example.com and liu@example.com from localStorage cache
      if (parsed.users && Array.isArray(parsed.users)) {
        parsed.users = parsed.users.filter((u: User) => {
          const email = (u.email || '').toLowerCase();
          const friendCode = (u.friend_code || '').toUpperCase();
          return email !== 'mario@example.com' && email !== 'liu@example.com' && friendCode !== 'RP-MARI-1024' && friendCode !== 'RP-LIUC-2048';
        });
        const demoUids = new Set(['a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'u-mario-01', 'u-liu-02']);
        if (parsed.clothing_items) {
          parsed.clothing_items = parsed.clothing_items.filter((i: ClothingItem) => !demoUids.has(i.user_id));
        }
        if (parsed.bsas_assessments) {
          parsed.bsas_assessments = parsed.bsas_assessments.filter((a: BSASAssessment) => !demoUids.has(a.user_id));
        }
        if (parsed.daily_clothing_logs) {
          parsed.daily_clothing_logs = parsed.daily_clothing_logs.filter((l: DailyClothingLog) => !demoUids.has(l.user_id));
        }
        const activeUser = safeStorage.getItem(STORAGE_KEY_ACTIVE_USER);
        if (activeUser && demoUids.has(activeUser)) {
          if (parsed.users.length > 0) {
            safeStorage.setItem(STORAGE_KEY_ACTIVE_USER, parsed.users[0].user_id);
          } else {
            safeStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
          }
        }
      }

      // If clothing_items has no items at all (e.g. wiped state), seed with initial items
      if (parsed.clothing_items.length === 0) {
        parsed.clothing_items = [...INITIAL_CLOTHING_ITEMS];
      }

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

  safeStorage.setItem(STORAGE_KEY_MOCK_DATA, JSON.stringify(state));
  return state;
}

// Canonical UUID & User Matching Helpers
export function toCanonicalUserId(uid: string | null | undefined): string {
  if (!uid || uid === 'guest') return '';
  return uid;
}

export function isSameUser(uidA: string | null | undefined, uidB: string | null | undefined): boolean {
  if (!uidA || !uidB) return false;
  return uidA === uidB;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class MockDatabaseEngine {
  private state: MockDatabaseState;
  private listeners: Set<() => void> = new Set();
  private currentUserId: string | null;

  constructor() {
    this.state = loadInitialMockState();
    this.currentUserId = safeStorage.getItem(STORAGE_KEY_ACTIVE_USER) || null;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    try {
      safeStorage.setItem(STORAGE_KEY_MOCK_DATA, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to persist mock database state:', e);
    }
    this.listeners.forEach(fn => fn());
  }

  public getCurrentUser(): User | null {
    if (!this.currentUserId) return null;
    const user = this.state.users.find(u => u.user_id === this.currentUserId || isSameUser(u.user_id, this.currentUserId));
    return user || null;
  }

  public upsertUser(user: User): void {
    const idx = this.state.users.findIndex(
      u => u.user_id === user.user_id || isSameUser(u.user_id, user.user_id) || u.email.toLowerCase() === user.email.toLowerCase()
    );
    if (idx !== -1) {
      this.state.users[idx] = { ...this.state.users[idx], ...user };
    } else {
      this.state.users.push(user);
    }
    this.notify();
  }

  public async syncCurrentUserWithSupabase(): Promise<User | null> {
    if (!this.currentUserId) return null;
    const local = this.getCurrentUser();
    if (local) return local;

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', this.currentUserId)
          .limit(1);
        if (!error && data && data.length > 0) {
          const remoteUser = data[0] as User;
          this.upsertUser(remoteUser);
          return remoteUser;
        }
      } catch (e) {
        console.warn('Error fetching current user from Supabase:', e);
      }
    }
    return null;
  }

  public setCurrentUserId(userId: string | null) {
    this.currentUserId = userId;
    if (userId) {
      safeStorage.setItem(STORAGE_KEY_ACTIVE_USER, userId);
    } else {
      safeStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
    }
    this.notify();
  }

  public isEmailRegistered(email: string): boolean {
    const emailClean = email.trim().toLowerCase();
    return this.state.users.some(u => u.email.toLowerCase() === emailClean);
  }

  public registerUser(userData: { email: string; first_name: string; last_name: string; password?: string }): User {
    const emailClean = userData.email.trim().toLowerCase();
    const existing = this.state.users.find(u => u.email.toLowerCase() === emailClean);
    if (existing) {
      throw new Error(`An account with the email "${emailClean}" already exists. Please sign in instead.`);
    }

    const codePart = (userData.first_name || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'USER';
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const newFriendCode = `RP-${codePart}-${randDigits}`;
    const newUserId = generateUUID();

    const newUser: User = {
      user_id: newUserId,
      email: emailClean,
      first_name: userData.first_name.trim(),
      last_name: userData.last_name.trim(),
      friend_code: newFriendCode,
      created_at: new Date().toISOString(),
      password: userData.password
    };

    this.state.users.push(newUser);
    this.setCurrentUserId(newUser.user_id);
    this.notify();

    // Sync newly registered user to Supabase users table if connected
    const supabase = getSupabase();
    if (supabase) {
      try {
        supabase.from('users').insert([{
          user_id: newUser.user_id,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          friend_code: newUser.friend_code
        }]).then(() => {}, () => {});
      } catch {}
    }

    return newUser;
  }

  public findUserByIdentifier(emailOrCode: string): User | null {
    const search = emailOrCode.trim().toLowerCase();
    return this.state.users.find(
      u => u.email.toLowerCase() === search || 
           u.friend_code.toLowerCase() === search ||
           `${u.first_name} ${u.last_name}`.toLowerCase() === search
    ) || null;
  }

  public authenticateUser(emailOrCode: string, password?: string): { user: User | null; wrongPassword?: boolean } {
    const found = this.findUserByIdentifier(emailOrCode);
    if (!found) return { user: null };
    if (found.password && password && found.password !== password) {
      return { user: null, wrongPassword: true };
    }
    if (!found.password && password) {
      found.password = password;
    }
    this.setCurrentUserId(found.user_id);
    return { user: found };
  }

  public loginUser(emailOrCode: string, password?: string): User | null {
    const res = this.authenticateUser(emailOrCode, password);
    return res.user;
  }

  public getAllUsers(): User[] {
    return [...this.state.users];
  }

  public deleteUser(userId: string): boolean {
    const userIndex = this.state.users.findIndex(
      u => u.user_id === userId || isSameUser(u.user_id, userId)
    );
    if (userIndex === -1) {
      return false;
    }

    const targetUser = this.state.users[userIndex];
    const targetUid = targetUser.user_id;

    // 1. Remove user from users array
    this.state.users.splice(userIndex, 1);

    // 2. Cascade delete clothing items belonging to this user
    const itemIdsToDelete = new Set(
      this.state.clothing_items
        .filter(i => i.user_id === targetUid || isSameUser(i.user_id, targetUid))
        .map(i => i.item_id)
    );

    this.state.clothing_items = this.state.clothing_items.filter(
      i => !itemIdsToDelete.has(i.item_id)
    );

    // 3. Cascade delete item_tags for deleted items
    if (this.state.item_tags && Array.isArray(this.state.item_tags)) {
      this.state.item_tags = this.state.item_tags.filter(
        it => !itemIdsToDelete.has(it.item_id)
      );
    }

    // 4. Cascade delete bsas assessments
    this.state.bsas_assessments = this.state.bsas_assessments.filter(
      a => a.user_id !== targetUid && !isSameUser(a.user_id, targetUid)
    );

    // 5. Cascade delete daily clothing logs
    this.state.daily_clothing_logs = this.state.daily_clothing_logs.filter(
      l => l.user_id !== targetUid && !isSameUser(l.user_id, targetUid)
    );

    // 6. Cascade delete friend requests involving this user
    this.state.friend_requests = this.state.friend_requests.filter(
      r => r.sender_id !== targetUid && 
           r.receiver_id !== targetUid && 
           !isSameUser(r.sender_id, targetUid) && 
           !isSameUser(r.receiver_id, targetUid)
    );

    // 7. Cascade delete borrows involving this user or this user's garments
    this.state.borrows = this.state.borrows.filter(
      b => b.borrower_id !== targetUid && 
           !isSameUser(b.borrower_id, targetUid) && 
           !itemIdsToDelete.has(b.item_id)
    );

    // 8. Cascade delete notifications for this user
    if (this.state.notifications && Array.isArray(this.state.notifications)) {
      this.state.notifications = this.state.notifications.filter(
        n => n.user_id !== targetUid && !isSameUser(n.user_id, targetUid)
      );
    }

    // 9. Reset session if active user was this user
    if (this.currentUserId === targetUid || isSameUser(this.currentUserId, targetUid)) {
      this.currentUserId = null;
      safeStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
    }

    this.notify();
    return true;
  }

  public deleteUserByEmail(email: string): boolean {
    const clean = email.trim().toLowerCase();
    const user = this.state.users.find(u => u.email.toLowerCase() === clean);
    if (!user) return false;
    return this.deleteUser(user.user_id);
  }

  public getTags(): Tag[] {
    return [...this.state.tags];
  }

  // --- CLOTHING ITEMS ---
  public getClothingItems(userId?: string): ClothingItem[] {
    const targetUid = userId || this.currentUserId;

    // Cross-sync: Ensure any garments in today's outfit log or past daily logs
    // are registered in clothing_items so they are NEVER missing from the virtual closet!
    if (this.state.daily_clothing_logs && Array.isArray(this.state.daily_clothing_logs)) {
      let recovered = false;
      this.state.daily_clothing_logs.forEach(log => {
        if (log.items && Array.isArray(log.items)) {
          log.items.forEach(logItem => {
            const existingIndex = this.state.clothing_items.findIndex(ci => ci.item_id === logItem.item_id);
            if (existingIndex === -1) {
              this.state.clothing_items.unshift({
                ...logItem,
                user_id: toCanonicalUserId(logItem.user_id || targetUid),
                wear_count: logItem.wear_count ?? logItem.worn_count ?? 0,
                worn_count: logItem.worn_count ?? logItem.wear_count ?? 0
              });
              recovered = true;
            }
          });
        }
      });
      if (recovered) {
        this.notify();
      }
    }

    if (!targetUid) {
      return [...this.state.clothing_items];
    }

    const matched = this.state.clothing_items.filter(item => {
      return isSameUser(item.user_id, targetUid);
    });

    return matched;
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
    const targetUid = toCanonicalUserId(item.user_id || this.currentUserId || this.state.users[0]?.user_id);
    const newItem: ClothingItem = {
      ...item,
      user_id: targetUid,
      addition_type: item.addition_type || 'Old',
      item_id: Date.now() + Math.floor(Math.random() * 1000),
      wear_count: 0,
      worn_count: 0,
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
    if (!targetUid) {
      return [...this.state.bsas_assessments].sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
    }

    const matched = this.state.bsas_assessments
      .filter(a => isSameUser(a.user_id, targetUid))
      .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());

    return matched;
  }

  public addAssessment(score: number, breakdown?: BSASAssessment['breakdown'], userId?: string): BSASAssessment {
    const risk_level = score >= 4 ? 'Indicative' : 'Non-Indicative';
    const targetUid = userId || this.currentUserId || this.state.users[0]?.user_id || '';
    const newAssessment: BSASAssessment = {
      assessment_id: Date.now(),
      user_id: targetUid,
      score,
      risk_level,
      taken_at: new Date().toISOString(),
      breakdown
    };
    this.state.bsas_assessments.unshift(newAssessment);
    
    // Add real notification for BSAS assessment
    if (!this.state.notifications) this.state.notifications = [];
    this.state.notifications.unshift({
      id: `notif-bsas-${Date.now()}`,
      user_id: targetUid,
      title: 'BSAS assessment logged',
      message: `Your BSAS assessment baseline has been logged successfully (Score: ${score}/28, ${risk_level}).`,
      time: 'Just now',
      type: 'system',
      read: false
    });

    this.notify();
    return newAssessment;
  }

  // --- DAILY CLOTHING LOGS ---
  public getDailyLogs(userId?: string): DailyClothingLog[] {
    const targetUid = userId || this.currentUserId;
    if (!targetUid) return [];
    return this.state.daily_clothing_logs
      .filter(l => isSameUser(l.user_id, targetUid))
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
              const nextCount = (closetItem.wear_count || closetItem.worn_count || 0) + 1;
              closetItem.wear_count = nextCount;
              closetItem.worn_count = nextCount;
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

    const targetUid = this.currentUserId || 'a0000000-0000-0000-0000-000000000001';
    let log = this.state.daily_clothing_logs.find(
      l => isSameUser(l.user_id, targetUid) && l.log_date === dateString
    );
    if (!log) {
      log = {
        log_id: Date.now(),
        user_id: toCanonicalUserId(targetUid),
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

  public createDailyLog(dateString: string, title?: string): DailyClothingLog {
    const targetUid = this.currentUserId || 'a0000000-0000-0000-0000-000000000001';
    const newLog: DailyClothingLog = {
      log_id: Date.now() + Math.floor(Math.random() * 1000),
      user_id: toCanonicalUserId(targetUid),
      log_date: dateString,
      title: title || 'Outfit Entry',
      is_finalized: false,
      finalized_at: null,
      items: []
    };
    this.state.daily_clothing_logs.unshift(newLog);
    this.notify();
    return newLog;
  }

  public updateTodayLogItems(logId: number, items: ClothingItem[]): DailyClothingLog | null {
    const log = this.state.daily_clothing_logs.find(l => l.log_id === logId);
    if (!log || log.is_finalized) return null;
    log.items = items;
    this.notify();
    return log;
  }

  // Unlock daily wear log for user editing
  public unlockDailyLogForEditing(logId: number): boolean {
    const log = this.state.daily_clothing_logs.find(l => l.log_id === logId);
    if (!log) return false;
    if (log.is_finalized) {
      if (log.items && log.items.length > 0) {
        log.items.forEach(logItem => {
          const closetItem = this.state.clothing_items.find(i => i.item_id === logItem.item_id);
          if (closetItem) {
            const currentCount = closetItem.wear_count || closetItem.worn_count || 0;
            const decremented = Math.max(0, currentCount - 1);
            closetItem.wear_count = decremented;
            closetItem.worn_count = decremented;
          }
        });
      }
      log.is_finalized = false;
      log.finalized_at = null;
      this.notify();
      return true;
    }
    return true;
  }

  // Delete daily wear log (3.2 Update & Delete Daily Wear Log)
  public deleteDailyLog(logId: number): boolean {
    const idx = this.state.daily_clothing_logs.findIndex(l => l.log_id === logId);
    if (idx === -1) return false;
    const log = this.state.daily_clothing_logs[idx];
    if (log.is_finalized) {
      // Re-open/unlock: revert the wear counts added during finalization
      if (log.items && log.items.length > 0) {
        log.items.forEach(logItem => {
          const closetItem = this.state.clothing_items.find(i => i.item_id === logItem.item_id);
          if (closetItem) {
            const currentCount = closetItem.wear_count || closetItem.worn_count || 0;
            const decremented = Math.max(0, currentCount - 1);
            closetItem.wear_count = decremented;
            closetItem.worn_count = decremented;
          }
        });
      }
      log.is_finalized = false;
      log.finalized_at = null;
      this.notify();
      return true;
    }
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
            const nextCount = (closetItem.wear_count || closetItem.worn_count || 0) + 1;
            closetItem.wear_count = nextCount;
            closetItem.worn_count = nextCount;
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
      status: 'accepted',
      updated_at: new Date().toISOString()
    };

    this.state.friend_requests.unshift(newReq);

    // Create notification for recipient
    if (!this.state.notifications) this.state.notifications = [];
    this.state.notifications.unshift({
      id: `notif-fr-${Date.now()}`,
      user_id: targetUser.user_id,
      title: `${currentUser.first_name} added you as a friend!`,
      message: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.friend_code}) connected with you using your friend code.`,
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
    return { success: true, message: `Connected with ${targetUser.first_name} ${targetUser.last_name}! Added to your friends list.` };
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
    return this.state.notifications.filter(n => !n.user_id || isSameUser(n.user_id, targetUid));
  }

  public clearNotifications(userId?: string) {
    const targetUid = userId || this.currentUserId;
    if (this.state.notifications) {
      this.state.notifications = this.state.notifications.filter(n => n.user_id && !isSameUser(n.user_id, targetUid));
      this.notify();
    }
  }

  public markNotificationAsRead(notificationId: string) {
    if (this.state.notifications) {
      const n = this.state.notifications.find(item => item.id === notificationId);
      if (n) {
        n.read = true;
        this.notify();
      }
    }
  }

  public deleteNotification(notificationId: string) {
    if (this.state.notifications) {
      this.state.notifications = this.state.notifications.filter(item => item.id !== notificationId);
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

    // Notify lender of incoming borrow request
    const item = this.state.clothing_items.find(i => i.item_id === itemId);
    const borrower = this.getCurrentUser();
    if (item && item.user_id) {
      if (!this.state.notifications) this.state.notifications = [];
      this.state.notifications.unshift({
        id: `notif-req-${Date.now()}`,
        user_id: item.user_id,
        title: `New borrow request!`,
        message: `${borrower?.first_name || 'A friend'} requested to borrow "${item.name}" from ${startDate} to ${endDate}.`,
        time: 'Just now',
        type: 'borrow',
        read: false
      });
    }

    this.notify();
    return newBorrow;
  }

  public updateBorrowStatus(borrowId: number, status: Borrow['status']) {
    const b = this.state.borrows.find(item => item.borrow_id === borrowId);
    if (b) {
      b.status = status;
      const item = this.state.clothing_items.find(i => i.item_id === b.item_id);
      if (item) {
        if (status === 'Accepted') {
          item.status = 'Borrowed';
        } else if (status === 'Returned' || status === 'Rejected') {
          item.status = 'Available';
        }
      }
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
      } else if (status === 'Rejected') {
        this.state.notifications.unshift({
          id: `notif-dec-${Date.now()}`,
          user_id: b.borrower_id,
          title: `Borrow request declined`,
          message: `${lender?.first_name || 'Owner'} was unable to approve your request for "${item?.name || 'clothing item'}".`,
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

  public updateClothingItemId(oldId: number, newId: number) {
    const item = this.state.clothing_items.find(i => i.item_id === oldId);
    if (item) {
      item.item_id = newId;
    }
    if (this.state.item_tags) {
      this.state.item_tags.forEach(it => {
        if (it.item_id === oldId) it.item_id = newId;
      });
    }
    if (this.state.daily_clothing_logs) {
      this.state.daily_clothing_logs.forEach(log => {
        if (log.items) {
          log.items.forEach(it => {
            if (it.item_id === oldId) it.item_id = newId;
          });
        }
      });
    }
    this.notify();
  }

  public updateAssessmentId(oldId: number, newId: number) {
    const assessment = this.state.bsas_assessments.find(a => a.assessment_id === oldId);
    if (assessment) {
      assessment.assessment_id = newId;
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
    safeStorage.removeItem(STORAGE_KEY_MOCK_DATA);
    this.state = loadInitialMockState();
    this.notify();
  }

  public getTableCounts(): Record<string, number> {
    return {
      users: this.state.users.length,
      clothing_item: this.state.clothing_items.length,
      tag: this.state.tags.length,
      item_tag: this.state.item_tags?.length || 0,
      bsas_assessment: this.state.bsas_assessments.length,
      daily_clothing_log: this.state.daily_clothing_logs.length,
      daily_log_item: this.state.daily_clothing_logs.reduce((acc, l) => acc + (l.items?.length || 0), 0),
      friend_request: this.state.friend_requests.length,
      borrow: this.state.borrows.length,
      donation_opportunity: this.state.donation_opportunities.length,
      donation_flag: this.state.donation_flags.length
    };
  }
}

export const mockDatabase = new MockDatabaseEngine();

export interface TableDiagnostic {
  name: string;
  role: string;
  fkey: string;
  status: 'ok' | 'error' | 'not_found';
  remoteRows: number;
  localRows: number;
  error?: string;
}

export interface DatabaseDiagnosticResult {
  isConnected: boolean;
  projectUrl: string;
  latencyMs: number;
  writePermission: 'allowed' | 'rls_blocked' | 'error' | 'not_configured';
  writeMessage: string;
  tables: TableDiagnostic[];
  totalRemoteRows: number;
  totalLocalRows: number;
}

export async function runDatabaseDiagnostic(): Promise<DatabaseDiagnosticResult> {
  const config = getStoredSupabaseConfig();
  const localCounts = mockDatabase.getTableCounts();

  const TABLE_METADATA = [
    { name: 'users', role: 'Primary Identity & Authentication', fkey: 'Primary Key (UUID)' },
    { name: 'clothing_item', role: 'Wardrobe Garment Catalog', fkey: 'REFERENCES users(user_id)' },
    { name: 'tag', role: 'Curated Categories & Color Families', fkey: 'Reference Table (26 items)' },
    { name: 'item_tag', role: 'Garment-to-Tag Normalization', fkey: 'clothing_item + tag (M:N)' },
    { name: 'bsas_assessment', role: 'BSAS Diagnostic History & Risk Scores', fkey: 'REFERENCES users(user_id)' },
    { name: 'daily_clothing_log', role: 'Daily Outfit Logs & Midnight Lock', fkey: 'REFERENCES users(user_id)' },
    { name: 'daily_log_item', role: 'Daily Outfit Garment Associations', fkey: 'daily_clothing_log + clothing_item' },
    { name: 'friend_request', role: 'Social Graph Peer Connections', fkey: 'sender_id + receiver_id' },
    { name: 'borrow', role: 'Peer-to-Peer Garment Loan Ledger', fkey: 'borrower_id + item_id' },
    { name: 'donation_opportunity', role: 'Active Donation Drop-Off Locations', fkey: 'Geographic Coords' },
    { name: 'donation_flag', role: 'Crowdsourced Verification Flags', fkey: 'donation_id + user_id' }
  ];

  if (!config.isConfigured) {
    return {
      isConnected: false,
      projectUrl: '',
      latencyMs: 0,
      writePermission: 'not_configured',
      writeMessage: 'Supabase credentials not configured in environment or settings.',
      tables: TABLE_METADATA.map(t => ({
        name: t.name,
        role: t.role,
        fkey: t.fkey,
        status: 'error',
        remoteRows: 0,
        localRows: localCounts[t.name] || 0,
        error: 'No Supabase connection'
      })),
      totalRemoteRows: 0,
      totalLocalRows: Object.values(localCounts).reduce((a, b) => a + b, 0)
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      isConnected: false,
      projectUrl: config.url,
      latencyMs: 0,
      writePermission: 'error',
      writeMessage: 'Failed to initialize Supabase client instance.',
      tables: TABLE_METADATA.map(t => ({
        name: t.name,
        role: t.role,
        fkey: t.fkey,
        status: 'error',
        remoteRows: 0,
        localRows: localCounts[t.name] || 0
      })),
      totalRemoteRows: 0,
      totalLocalRows: Object.values(localCounts).reduce((a, b) => a + b, 0)
    };
  }

  const startTime = Date.now();
  let totalRemote = 0;
  const tableResults: TableDiagnostic[] = [];

  for (const meta of TABLE_METADATA) {
    try {
      const { data, error, count } = await supabase.from(meta.name).select('*', { count: 'exact' });
      if (error) {
        tableResults.push({
          name: meta.name,
          role: meta.role,
          fkey: meta.fkey,
          status: 'error',
          remoteRows: 0,
          localRows: localCounts[meta.name] || 0,
          error: error.message
        });
      } else {
        const rows = count ?? (data ? data.length : 0);
        totalRemote += rows;
        tableResults.push({
          name: meta.name,
          role: meta.role,
          fkey: meta.fkey,
          status: 'ok',
          remoteRows: rows,
          localRows: localCounts[meta.name] || 0
        });
      }
    } catch (err: any) {
      tableResults.push({
        name: meta.name,
        role: meta.role,
        fkey: meta.fkey,
        status: 'error',
        remoteRows: 0,
        localRows: localCounts[meta.name] || 0,
        error: err?.message || 'Network exception'
      });
    }
  }

  // Probe write permission on clothing_item
  let writePerm: DatabaseDiagnosticResult['writePermission'] = 'allowed';
  let writeMsg = 'Cloud writes permitted.';
  try {
    const probeRes = await supabase.from('clothing_item').insert([{
      user_id: 'a0000000-0000-0000-0000-000000000001',
      name: '__probe_test_diagnostic__',
      image_url: 'silhouette',
      addition_type: 'Old'
    }]).select();

    if (probeRes.error) {
      if (probeRes.error.code === '42501') {
        writePerm = 'rls_blocked';
        writeMsg = 'PostgreSQL Row-Level Security (RLS) is active on your remote tables. Public anonymous writes are protected.';
      } else {
        writePerm = 'error';
        writeMsg = `Write probe error: ${probeRes.error.message}`;
      }
    } else {
      writePerm = 'allowed';
      writeMsg = 'Supabase allows direct anon writes! Remote cloud sync is fully active.';
      if (probeRes.data && probeRes.data[0]?.item_id) {
        await supabase.from('clothing_item').delete().eq('item_id', probeRes.data[0].item_id);
      }
    }
  } catch (probeErr: any) {
    writePerm = 'error';
    writeMsg = probeErr?.message || 'Failed write probe';
  }

  const latency = Date.now() - startTime;

  return {
    isConnected: true,
    projectUrl: config.url,
    latencyMs: latency,
    writePermission: writePerm,
    writeMessage: writeMsg,
    tables: tableResults,
    totalRemoteRows: totalRemote,
    totalLocalRows: Object.values(localCounts).reduce((a, b) => a + b, 0)
  };
}

export async function syncAllLocalDataToSupabase(): Promise<{ success: boolean; message: string; syncedCount: number }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Supabase client is not configured or offline.', syncedCount: 0 };
  }

  const localItems = mockDatabase.getClothingItems();
  const localAssessments = mockDatabase.getAssessments();

  let count = 0;
  try {
    // 1. Sync clothing items
    for (const item of localItems) {
      const canonicalUid = toCanonicalUserId(item.user_id);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(canonicalUid);
      if (isUuid) {
        const { data, error } = await supabase.from('clothing_item').insert([{
          user_id: canonicalUid,
          name: item.name,
          image_url: item.image_url,
          addition_type: item.addition_type || 'Old',
          wear_count: item.wear_count || item.worn_count || 0
        }]).select().single();

        if (error) {
          if (error.code === '42501') {
            return {
              success: false,
              message: 'Supabase rejected write due to Row-Level Security (RLS). Please run the 1-click SQL policy in the Schema tab first!',
              syncedCount: count
            };
          }
        } else if (data) {
          count++;
          if (item.tags && item.tags.length > 0) {
            const tagsPayload = item.tags.map(t => ({
              item_id: data.item_id,
              tag_id: t.tag_id
            }));
            try {
              await supabase.from('item_tag').insert(tagsPayload);
            } catch {}
          }
        }
      }
    }

    // 2. Sync BSAS assessments
    for (const a of localAssessments) {
      const canonicalUid = toCanonicalUserId(a.user_id);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(canonicalUid);
      if (isUuid) {
        const { error } = await supabase.from('bsas_assessment').insert([{
          user_id: canonicalUid,
          score: a.score,
          risk_level: a.risk_level
        }]);
        if (!error) count++;
      }
    }

    return {
      success: true,
      message: `Successfully synchronized ${count} records to Supabase PostgreSQL cloud!`,
      syncedCount: count
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Sync failed due to a network error.',
      syncedCount: count
    };
  }
}

