import { mockDatabase, getSupabase, toCanonicalUserId } from './supabaseClient';
import { ClothingItem, Tag, BSASAssessment, DailyClothingLog } from '../types/database';

export interface BSASCooldownInfo {
  canTake: boolean;
  daysRemaining: number;
  lastTakenDate: string | null;
  retakeDueDate: string | null;
}

export const closetService = {
  // --- CLOTHING ITEMS ---
  async getItems(userId?: string): Promise<ClothingItem[]> {
    // 1. Always retrieve local items from mockDatabase
    const localItems = mockDatabase.getClothingItems(userId);

    // 2. Query Supabase if configured and merge any remote items for this user
    const supabase = getSupabase();
    if (supabase) {
      try {
        const currentUser = mockDatabase.getCurrentUser();
        const targetUid = toCanonicalUserId(userId || currentUser?.user_id);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUid);

        let query = supabase
          .from('clothing_item')
          .select('*, item_tag(tag(*))')
          .order('date_added', { ascending: false });

        if (isUuid) {
          query = query.eq('user_id', targetUid);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          const remoteItems = (data as any[]).map(r => {
            let cat = r.category;
            let col = r.color;
            if (r.item_tag && Array.isArray(r.item_tag)) {
              r.item_tag.forEach((it: any) => {
                if (it.tag?.tag_type === 'Category' && !cat) cat = it.tag.tag_name;
                if (it.tag?.tag_type === 'Color' && !col) col = it.tag.tag_name;
              });
            }
            return {
              ...r,
              category: cat || r.category || 'Tops',
              color: col || r.color || 'Neutral'
            } as ClothingItem;
          });

          // Deduplicate and merge remote items with local items, preserving higher wear counts
          const merged = remoteItems.map(rem => {
            const loc = localItems.find(l => l.item_id === rem.item_id);
            if (loc) {
              const maxWear = Math.max(rem.wear_count || 0, loc.wear_count || 0, loc.worn_count || 0);
              return { ...rem, ...loc, wear_count: maxWear, worn_count: maxWear };
            }
            return rem;
          });

          localItems.forEach(loc => {
            if (!merged.some(m => m.item_id === loc.item_id)) {
              merged.push(loc);
            }
          });
          return merged;
        }
      } catch (err) {
        // Silently fall back to persistent local store
      }
    }
    return localItems;
  },

  async addItem(item: Omit<ClothingItem, 'item_id' | 'wear_count' | 'date_added'>): Promise<ClothingItem> {
    const canonicalUid = toCanonicalUserId(item.user_id);
    const itemWithCanonicalUser = { ...item, user_id: canonicalUid };

    // Always persist to local mockDatabase first so the UI updates instantaneously
    const localItem = mockDatabase.addClothingItem(itemWithCanonicalUser);

    try {
      const supabase = getSupabase();
      if (supabase) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(canonicalUid || '');
        if (isUuid) {
          const { data, error } = await supabase
            .from('clothing_item')
            .insert([{
              user_id: canonicalUid,
              name: item.name,
              image_url: item.image_url,
              addition_type: item.addition_type || 'Old',
              wear_count: 0
            }])
            .select()
            .single();

          if (!error && data) {
            // Also insert normalized tags in item_tag
            if (item.tags && item.tags.length > 0) {
              const tagsPayload = item.tags.map(t => ({
                item_id: data.item_id,
                tag_id: t.tag_id
              }));
              await supabase.from('item_tag').insert(tagsPayload).catch(() => {});
            }
            // Keep local ID in sync with PostgreSQL sequence
            mockDatabase.updateClothingItemId(localItem.item_id, data.item_id);
            return { ...localItem, item_id: data.item_id, ...data };
          }
        }
      }
    } catch {
      // Local database is already updated
    }
    return localItem;
  },

  async updateItem(itemId: number, updates: Partial<ClothingItem>): Promise<ClothingItem | null> {
    const localUpdated = mockDatabase.updateClothingItem(itemId, updates);
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('clothing_item')
          .update({
            ...(updates.name && { name: updates.name }),
            ...(updates.image_url && { image_url: updates.image_url }),
            ...(updates.addition_type && { addition_type: updates.addition_type }),
            ...(updates.wear_count !== undefined && { wear_count: updates.wear_count })
          })
          .eq('item_id', itemId);
      } catch {
        // Silently preserve local update
      }
    }
    return localUpdated;
  },

  async deleteItem(itemId: number): Promise<boolean> {
    const localResult = mockDatabase.deleteClothingItem(itemId);
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('clothing_item')
          .delete()
          .eq('item_id', itemId);
      } catch {
        // Silently preserve local deletion
      }
    }
    return localResult;
  },

  // --- TAGS ---
  async getTags(): Promise<Tag[]> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('tag').select('*');
        if (!error && data && data.length > 0) return data as Tag[];
      } catch {}
    }
    return mockDatabase.getTags();
  },

  // --- BSAS ASSESSMENTS ---
  async getAssessments(userId?: string): Promise<BSASAssessment[]> {
    // 1. Always load local assessments from mockDatabase
    const localAssessments = mockDatabase.getAssessments(userId);

    // 2. Query Supabase if configured and merge any remote assessments for this user
    const supabase = getSupabase();
    if (supabase) {
      try {
        const currentUser = mockDatabase.getCurrentUser();
        const targetUid = toCanonicalUserId(userId || currentUser?.user_id);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUid);

        let query = supabase
          .from('bsas_assessment')
          .select('*')
          .order('taken_at', { ascending: false });

        if (isUuid) {
          query = query.eq('user_id', targetUid);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          const remoteAssessments = data as BSASAssessment[];
          const merged = [...remoteAssessments];

          localAssessments.forEach(loc => {
            const isDuplicate = merged.some(m =>
              m.assessment_id === loc.assessment_id ||
              Math.abs(new Date(m.taken_at).getTime() - new Date(loc.taken_at).getTime()) < 10000
            );
            if (!isDuplicate) {
              merged.push(loc);
            }
          });
          return merged.sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
        }
      } catch {
        // Silently preserve local assessments
      }
    }
    return localAssessments;
  },

  async submitAssessment(score: number, breakdown?: BSASAssessment['breakdown'], userId?: string): Promise<BSASAssessment> {
    const currentUser = mockDatabase.getCurrentUser();
    const targetUid = toCanonicalUserId(userId || currentUser?.user_id);
    // Always persist to local mockDatabase first so the UI updates instantaneously
    const localAssessment = mockDatabase.addAssessment(score, breakdown, targetUid);

    const supabase = getSupabase();
    if (supabase) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUid);
        if (isUuid) {
          const risk_level = score >= 4 ? 'Indicative' : 'Non-Indicative';
          const { data, error } = await supabase
            .from('bsas_assessment')
            .insert([{
              user_id: targetUid,
              score,
              risk_level
            }])
            .select()
            .single();
          if (!error && data) {
            mockDatabase.updateAssessmentId(localAssessment.assessment_id, data.assessment_id);
            return { ...localAssessment, ...data };
          }
        }
      } catch {
        // Local assessment already preserved
      }
    }
    return localAssessment;
  },

  getBSASCooldown(assessments: BSASAssessment[]): BSASCooldownInfo {
    if (!assessments || assessments.length === 0) {
      return {
        canTake: true,
        daysRemaining: 0,
        lastTakenDate: null,
        retakeDueDate: null
      };
    }

    const latest = assessments[0];
    const takenTime = new Date(latest.taken_at).getTime();
    const now = Date.now();
    const cooldownMs = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
    const timeSinceTaken = now - takenTime;
    const remainingMs = cooldownMs - timeSinceTaken;

    if (remainingMs <= 0) {
      return {
        canTake: true,
        daysRemaining: 0,
        lastTakenDate: latest.taken_at,
        retakeDueDate: new Date(takenTime + cooldownMs).toISOString()
      };
    }

    const daysRemaining = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    return {
      canTake: false,
      daysRemaining,
      lastTakenDate: latest.taken_at,
      retakeDueDate: new Date(takenTime + cooldownMs).toISOString()
    };
  },

  // --- DAILY LOGS ---
  async getTodayLog(): Promise<DailyClothingLog> {
    const today = new Date().toISOString().split('T')[0];
    return mockDatabase.getTodayLog(today);
  },

  async getDailyLogs(): Promise<DailyClothingLog[]> {
    return mockDatabase.getDailyLogs();
  },

  async updateTodayItems(logId: number, items: ClothingItem[]): Promise<DailyClothingLog | null> {
    const localLog = mockDatabase.updateTodayLogItems(logId, items);

    // Sync to Supabase if configured
    const supabase = getSupabase();
    if (supabase && localLog) {
      try {
        const canonicalUid = toCanonicalUserId(localLog.user_id);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(canonicalUid);
        if (isUuid) {
          const { data: remoteLog } = await supabase
            .from('daily_clothing_log')
            .upsert({
              user_id: canonicalUid,
              log_date: localLog.log_date,
              is_finalized: localLog.is_finalized,
              finalized_at: localLog.finalized_at
            }, { onConflict: 'user_id,log_date' })
            .select()
            .single();

          if (remoteLog) {
            await supabase.from('daily_log_item').delete().eq('log_id', remoteLog.log_id);
            if (items.length > 0) {
              const logItems = items.map(i => ({
                log_id: remoteLog.log_id,
                item_id: i.item_id
              }));
              await supabase.from('daily_log_item').insert(logItems).catch(() => {});
            }
          }
        }
      } catch {}
    }

    return localLog;
  },

  async finalizeDailyLog(logId: number): Promise<DailyClothingLog | null> {
    const localLog = mockDatabase.finalizeDailyLog(logId);
    const supabase = getSupabase();
    if (supabase && localLog) {
      try {
        const canonicalUid = toCanonicalUserId(localLog.user_id);
        await supabase
          .from('daily_clothing_log')
          .update({
            is_finalized: true,
            finalized_at: localLog.finalized_at || new Date().toISOString()
          })
          .match({ user_id: canonicalUid, log_date: localLog.log_date });

        // Synchronize updated wear counts to clothing_item table in Supabase
        if (localLog.items && localLog.items.length > 0) {
          await Promise.allSettled(
            localLog.items.map(async (item) => {
              const currentGarment = mockDatabase.getItemById(item.item_id);
              const count = currentGarment?.wear_count ?? item.wear_count ?? 1;
              return supabase
                .from('clothing_item')
                .update({ wear_count: count })
                .eq('item_id', item.item_id);
            })
          );
        }
      } catch {}
    }
    return localLog;
  },

  async deleteDailyLog(logId: number): Promise<boolean> {
    const logBefore = mockDatabase.getDailyLogs().find(l => l.log_id === logId) || mockDatabase.getTodayLog(new Date().toISOString().slice(0, 10));
    const wasFinalized = logBefore?.is_finalized;
    const items = logBefore?.items || [];

    const result = mockDatabase.deleteDailyLog(logId);
    const supabase = getSupabase();
    if (supabase && wasFinalized && items.length > 0) {
      try {
        await Promise.allSettled(
          items.map(async (item) => {
            const closetItem = mockDatabase.getItemById(item.item_id);
            const count = closetItem?.wear_count ?? 0;
            return supabase.from('clothing_item').update({ wear_count: count }).eq('item_id', item.item_id);
          })
        );
      } catch {}
    }
    return result;
  },

  async simulateMidnightFinalization(): Promise<DailyClothingLog | null> {
    const today = new Date().toISOString().split('T')[0];
    const log = mockDatabase.getTodayLog(today);
    if (log && !log.is_finalized) {
      return this.finalizeDailyLog(log.log_id);
    }
    return log;
  },

  // --- WARDROBE ANALYTICS ---
  calculateClosetAnalytics(items: ClothingItem[]) {
    const totalItems = items.length;
    if (totalItems === 0) {
      return {
        totalItems: 0,
        wornItems: 0,
        unwornItems: 0,
        utilizationRate: 0,
        totalWears: 0,
        averageWears: 0,
        oldItemsCount: 0,
        newItemsCount: 0,
        mostWorn: [],
        leastWorn: [],
        unwornList: [],
        co2AvertedKg: 0,
        waterAvertedLiters: 0
      };
    }

    const wornItems = items.filter(i => i.wear_count > 0).length;
    const unwornItems = items.filter(i => i.wear_count === 0).length;
    const utilizationRate = Math.round((wornItems / totalItems) * 100);
    const totalWears = items.reduce((acc, i) => acc + (i.wear_count || 0), 0);
    const averageWears = Math.round((totalWears / totalItems) * 10) / 10;

    const oldItemsCount = items.filter(i => i.addition_type === 'Old').length;
    const newItemsCount = items.filter(i => i.addition_type === 'New').length;

    // Leaderboards
    const sortedByWearDesc = [...items]
      .filter(i => (i.wear_count || 0) > 0)
      .sort((a, b) => (b.wear_count || 0) - (a.wear_count || 0));
    const mostWorn = sortedByWearDesc.slice(0, 5);
    const leastWorn = [...items].sort((a, b) => (a.wear_count || 0) - (b.wear_count || 0)).slice(0, 5);
    const unwornList = items.filter(i => (i.wear_count || 0) === 0);

    // Environmental impact formulas:
    // Extending the life of an existing garment by 9 months reduces carbon, waste and water footprints by ~20-30%
    // Each reworn garment averted purchase saves ~6.5kg CO2 and ~2,700 liters of water
    const co2AvertedKg = Math.round(totalWears * 2.8);
    const waterAvertedLiters = Math.round(totalWears * 1250);

    return {
      totalItems,
      wornItems,
      unwornItems,
      utilizationRate,
      totalWears,
      averageWears,
      oldItemsCount,
      newItemsCount,
      mostWorn,
      leastWorn,
      unwornList,
      co2AvertedKg,
      waterAvertedLiters
    };
  },

  // --- USER ACCOUNT DELETION ---
  async deleteUserAccount(userId: string, email?: string): Promise<boolean> {
    // 1. Permanently delete from local storage mockDatabase
    let deleted = mockDatabase.deleteUser(userId);
    if (!deleted && email) {
      deleted = mockDatabase.deleteUserByEmail(email);
    }

    // 2. Permanently delete from remote Supabase if connected
    const supabase = getSupabase();
    if (supabase) {
      try {
        const canonicalUid = toCanonicalUserId(userId);
        
        // Find user's items to delete relational dependent item_tags and daily_log_items
        const { data: userItems } = await supabase
          .from('clothing_item')
          .select('item_id')
          .eq('user_id', canonicalUid);

        if (userItems && userItems.length > 0) {
          const itemIds = userItems.map((i: any) => i.item_id);
          await Promise.allSettled([
            supabase.from('item_tag').delete().in('item_id', itemIds),
            supabase.from('daily_log_item').delete().in('item_id', itemIds),
            supabase.from('borrow').delete().in('item_id', itemIds)
          ]);
        }

        // Cascade delete child records belonging to user
        await Promise.allSettled([
          supabase.from('daily_clothing_log').delete().eq('user_id', canonicalUid),
          supabase.from('bsas_assessment').delete().eq('user_id', canonicalUid),
          supabase.from('friend_request').delete().eq('sender_id', canonicalUid),
          supabase.from('friend_request').delete().eq('receiver_id', canonicalUid),
          supabase.from('borrow').delete().eq('borrower_id', canonicalUid),
          supabase.from('clothing_item').delete().eq('user_id', canonicalUid)
        ]);

        // Delete user record from Supabase
        await supabase.from('users').delete().eq('user_id', canonicalUid);
        if (email) {
          await supabase.from('users').delete().ilike('email', email.trim().toLowerCase());
        }
      } catch (err) {
        console.warn('Supabase remote account deletion notice:', err);
      }
    }

    return true;
  }
};
