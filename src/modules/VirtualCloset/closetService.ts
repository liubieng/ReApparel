import { mockDatabase, getSupabase, toCanonicalUserId, withTimeout, deduplicateAssessments, getLocalDateString, getStoredAssessmentBreakdown, saveAssessmentBreakdown, createBSASBreakdownFromScore, isSameUser, ensureUserSyncedToSupabase } from '../../shared/services/supabaseClient';
import { ClothingItem, Tag, BSASAssessment, DailyClothingLog } from '../../shared/types/database';
import { CURATED_COLOR_FAMILIES } from '../../shared/data/seedData';

export { deduplicateAssessments };

export interface BSASCooldownInfo {
  canTake: boolean;
  daysRemaining: number;
  lastTakenDate: string | null;
  retakeDueDate: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let dailyLogSyncChain: Promise<void> = Promise.resolve();

async function syncItemTagsToSupabase(
  supabase: any,
  itemId: number,
  category?: string,
  color?: string,
  customTags?: Tag[]
): Promise<void> {
  if (!supabase || !itemId) return;
  try {
    const { data: allTags } = await supabase.from('tag').select('*');
    const tagsList: Tag[] = (allTags && allTags.length > 0) ? allTags : mockDatabase.getTags();

    const tagIdsToLink = new Set<number>();

    if (category) {
      const catClean = category.trim().toLowerCase();
      const matchedCat = tagsList.find(t => t.tag_type === 'Category' && t.tag_name.toLowerCase() === catClean);
      if (matchedCat) tagIdsToLink.add(matchedCat.tag_id);
    }

    if (color) {
      const colClean = color.trim().toLowerCase();
      const matchedCol = tagsList.find(t => t.tag_type === 'Color' && t.tag_name.toLowerCase() === colClean);
      if (matchedCol) tagIdsToLink.add(matchedCol.tag_id);
    }

    if (customTags && Array.isArray(customTags)) {
      customTags.forEach(t => {
        if (t.tag_id) tagIdsToLink.add(t.tag_id);
      });
    }

    if (tagIdsToLink.size > 0) {
      await supabase.from('item_tag').delete().eq('item_id', itemId);
      const payload = Array.from(tagIdsToLink).map(tid => ({
        item_id: itemId,
        tag_id: tid
      }));
      await supabase.from('item_tag').insert(payload);
    }
  } catch (err) {
    console.warn('Could not sync item_tag to Supabase:', err);
  }
}

async function pushDateToRemote(userId: string, logDate: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const canonicalUid = toCanonicalUserId(userId);
  if (!UUID_RE.test(canonicalUid)) return;

  const currentUser = mockDatabase.getCurrentUser();
  if (currentUser && isSameUser(currentUser.user_id, canonicalUid)) {
    await ensureUserSyncedToSupabase(currentUser);
  }

  try {

    const logs = mockDatabase.getDailyLogs(userId).filter(l => l.log_date === logDate);

    if (logs.length === 0) {

      const { data: existing } = await supabase
        .from('daily_clothing_log')
        .select('log_id')
        .eq('user_id', canonicalUid)
        .eq('log_date', logDate);
      const ids = (existing || []).map((r: any) => r.log_id);
      if (ids.length > 0) {
        await supabase.from('daily_log_item').delete().in('log_id', ids);
        await supabase.from('daily_clothing_log').delete().in('log_id', ids);
      }
      return;
    }

    const itemIds = new Set<number>();
    logs.forEach(l => (l.items || []).forEach(i => itemIds.add(i.item_id)));
    const allFinalized = logs.every(l => l.is_finalized);

    const { data: remoteLog } = await supabase
      .from('daily_clothing_log')
      .upsert({
        user_id: canonicalUid,
        log_date: logDate,
        is_finalized: allFinalized,
        finalized_at: allFinalized ? (logs.find(l => l.finalized_at)?.finalized_at ?? new Date().toISOString()) : null
      }, { onConflict: 'user_id,log_date' })
      .select()
      .single();

    if (remoteLog) {
      await supabase.from('daily_log_item').delete().eq('log_id', remoteLog.log_id);
      if (itemIds.size > 0) {
        try {
          await supabase.from('daily_log_item').insert(
            Array.from(itemIds).map(item_id => ({ log_id: remoteLog.log_id, item_id }))
          );
        } catch {}
      }
    }
  } catch {}
}

function queueDateSync(userId: string, logDate: string): Promise<void> {
  dailyLogSyncChain = dailyLogSyncChain
    .then(() => pushDateToRemote(userId, logDate))
    .catch(() => {});
  return dailyLogSyncChain;
}

export const closetService = {

  async getItems(userId?: string): Promise<ClothingItem[]> {

    const localItems = mockDatabase.getClothingItems(userId);

    const supabase = getSupabase();
    if (supabase) {
      try {
        const currentUser = mockDatabase.getCurrentUser();
        const targetUid = toCanonicalUserId(userId || currentUser?.user_id);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUid);

        if (!isUuid) return localItems;

        const query = supabase
          .from('clothing_item')
          .select('*, item_tag(tag(*))')
          .eq('user_id', targetUid)
          .order('date_added', { ascending: false });

        const { data, error } = await withTimeout(query, 3000);

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

            const loc = localItems.find(l => l.item_id === r.item_id);

            // If category was not in Supabase item_tag, check local item or infer from garment name
            if (!cat && loc?.category) {
              cat = loc.category;
            }
            if (!cat && r.name) {
              const nameLower = r.name.toLowerCase();
              if (nameLower.includes('bottom') || nameLower.includes('pants') || nameLower.includes('skirt') || nameLower.includes('shorts')) cat = 'Bottoms';
              else if (nameLower.includes('shoe') || nameLower.includes('sneaker') || nameLower.includes('boot') || nameLower.includes('loafer')) cat = 'Shoes';
              else if (nameLower.includes('dress')) cat = 'Dresses';
              else if (nameLower.includes('coat') || nameLower.includes('jacket') || nameLower.includes('blazer') || nameLower.includes('outerwear')) cat = 'Outerwear';
              else if (nameLower.includes('knit') || nameLower.includes('cardigan') || nameLower.includes('sweater') || nameLower.includes('turtleneck')) cat = 'Knitwear';
              else if (nameLower.includes('top') || nameLower.includes('shirt') || nameLower.includes('blouse') || nameLower.includes('tee')) cat = 'Tops';
            }

            // If color was not in Supabase item_tag, check local item or infer from garment name
            if (!col && loc?.color) {
              col = loc.color;
            }
            if (!col && r.name) {
              const nameLower = r.name.toLowerCase();
              for (const family of CURATED_COLOR_FAMILIES) {
                if (nameLower.includes(family.name.toLowerCase())) {
                  col = family.name;
                  break;
                }
              }
            }

            const finalCat = cat || 'Tops';
            const finalCol = col || 'Neutral';
            const matchedFamily = CURATED_COLOR_FAMILIES.find(f => f.name.toLowerCase() === finalCol.toLowerCase());
            const finalColorHex = matchedFamily?.hex || loc?.color_tag || '#64748b';

            // Background heal if Supabase had no tag records for this item
            if ((!r.item_tag || r.item_tag.length === 0) && (finalCat || finalCol)) {
              syncItemTagsToSupabase(supabase, r.item_id, finalCat, finalCol).catch(() => {});
            }

            return {
              ...r,
              category: finalCat,
              type_tag: finalCat,
              color: finalCol,
              color_tag: finalColorHex
            } as ClothingItem;
          });

          remoteItems.forEach(rem => mockDatabase.upsertClothingItem(rem));

          const merged = remoteItems.map(rem => {
            const loc = localItems.find(l => l.item_id === rem.item_id);
            if (loc) {
              const maxWear = Math.max(rem.wear_count || 0, loc.wear_count || 0, loc.worn_count || 0);
              return { ...loc, ...rem, wear_count: maxWear, worn_count: maxWear };
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

      }
    }
    return localItems;
  },

  async addItem(item: Omit<ClothingItem, 'item_id' | 'wear_count' | 'date_added'>): Promise<ClothingItem> {
    const canonicalUid = toCanonicalUserId(item.user_id);
    const itemWithCanonicalUser = { ...item, user_id: canonicalUid };

    const localItem = mockDatabase.addClothingItem(itemWithCanonicalUser);

    try {
      const supabase = getSupabase();
      if (supabase) {

        const currentUser = mockDatabase.getCurrentUser();
        if (currentUser && isSameUser(currentUser.user_id, canonicalUid)) {
          await ensureUserSyncedToSupabase(currentUser);
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(canonicalUid || '');
        if (isUuid) {
          const itemPayload: Record<string, any> = {
            user_id: canonicalUid,
            name: item.name,
            image_url: item.image_url,
            wear_count: 0
          };

          let { data, error } = await supabase
            .from('clothing_item')
            .insert([itemPayload])
            .select()
            .single();

          if (error && (error.code === '23502' || error.message?.includes('addition_type'))) {
            itemPayload.addition_type = 'Old';
            const retry = await supabase.from('clothing_item').insert([itemPayload]).select().single();
            data = retry.data;
            error = retry.error;
          }

          if (!error && data) {
            await syncItemTagsToSupabase(supabase, data.item_id, item.category, item.color, item.tags);
            mockDatabase.updateClothingItemId(localItem.item_id, data.item_id);
            return { ...localItem, item_id: data.item_id, ...data };
          }
        }
      }
    } catch {

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
            ...(updates.wear_count !== undefined && { wear_count: updates.wear_count })
          })
          .eq('item_id', itemId);

        if (updates.category !== undefined || updates.color !== undefined || updates.tags !== undefined) {
          const current = localUpdated || mockDatabase.getItemById(itemId);
          const cat = updates.category !== undefined ? updates.category : current?.category;
          const col = updates.color !== undefined ? updates.color : current?.color;
          await syncItemTagsToSupabase(supabase, itemId, cat, col, updates.tags || current?.tags);
        }
      } catch {

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

      }
    }
    return localResult;
  },

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

  async getAssessments(userId?: string): Promise<BSASAssessment[]> {

    const localAssessments = deduplicateAssessments(mockDatabase.getAssessments(userId));

    const supabase = getSupabase();
    if (supabase) {
      try {
        const currentUser = mockDatabase.getCurrentUser();
        const targetUid = toCanonicalUserId(userId || currentUser?.user_id);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUid);

        if (!isUuid) return deduplicateAssessments(localAssessments);

        const query = supabase
          .from('bsas_assessment')
          .select('assessment_id, user_id, score, risk_level, taken_at')
          .eq('user_id', targetUid)
          .order('taken_at', { ascending: false });

        const { data, error } = await withTimeout(query, 3000);

        if (!error && data && data.length > 0) {
          const remoteAssessments = deduplicateAssessments(data as BSASAssessment[]);

          const merged = remoteAssessments.map(rem => {
            const matchingLocal = localAssessments.find(loc =>
              loc.assessment_id === rem.assessment_id ||
              (isSameUser(loc.user_id, rem.user_id) &&
               Math.abs(new Date(loc.taken_at).getTime() - new Date(rem.taken_at).getTime()) < 60000)
            );
            let breakdown = matchingLocal?.breakdown || getStoredAssessmentBreakdown(rem.user_id, rem.assessment_id);
            if (!breakdown && typeof rem.score === 'number') {
              breakdown = createBSASBreakdownFromScore(rem.score);
              if (rem.user_id) saveAssessmentBreakdown(rem.user_id, rem.assessment_id, breakdown);
            }
            return breakdown ? { ...rem, breakdown } : rem;
          });

          mockDatabase.mergeRemoteAssessments(merged);

          localAssessments.forEach(loc => {
            const isDuplicate = merged.some(m =>
              m.assessment_id === loc.assessment_id ||
              (isSameUser(m.user_id, loc.user_id) &&
               Math.abs(new Date(m.taken_at).getTime() - new Date(loc.taken_at).getTime()) < 60000)
            );
            if (!isDuplicate) {
              merged.push(loc);
            }
          });
          return deduplicateAssessments(merged);
        }
      } catch {

      }
    }
    return deduplicateAssessments(localAssessments);
  },

  async submitAssessment(score: number, breakdown?: BSASAssessment['breakdown'], userId?: string): Promise<BSASAssessment> {
    const currentUser = mockDatabase.getCurrentUser();
    const targetUid = toCanonicalUserId(userId || currentUser?.user_id);

    const localAssessment = mockDatabase.addAssessment(score, breakdown, targetUid);

    const supabase = getSupabase();
    if (supabase) {
      if (currentUser && isSameUser(currentUser.user_id, targetUid)) {
        await ensureUserSyncedToSupabase(currentUser);
      }
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUid);
      if (isUuid) {
        const risk_level = score >= 4 ? 'Indicative' : 'Non-Indicative';

        withTimeout(
          supabase
            .from('bsas_assessment')
            .insert([{
              user_id: targetUid,
              score,
              risk_level
            }])
            .select()
            .single(),
          3500
        ).then(({ data, error }) => {
          if (!error && data) {
            mockDatabase.updateAssessmentId(localAssessment.assessment_id, data.assessment_id);
          }
        }).catch((err) => {
          console.warn('Supabase BSAS sync skipped/timed out (local copy preserved):', err?.message || err);
        });
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
    const cooldownMs = 30 * 24 * 60 * 60 * 1000;
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

  async getTodayLog(): Promise<DailyClothingLog> {
    const today = getLocalDateString();
    return mockDatabase.getTodayLog(today);
  },

  async getDailyLogs(userId?: string): Promise<DailyClothingLog[]> {
    const localLogs = mockDatabase.getDailyLogs(userId);

    const supabase = getSupabase();
    if (supabase) {
      try {
        const currentUser = mockDatabase.getCurrentUser();
        const targetUid = toCanonicalUserId(userId || currentUser?.user_id);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUid);
        if (!isUuid) return localLogs;

        const query = supabase
          .from('daily_clothing_log')
          .select(`
            log_id,
            user_id,
            log_date,
            is_finalized,
            finalized_at,
            daily_log_item (
              item_id,
              clothing_item (*)
            )
          `)
          .eq('user_id', targetUid)
          .order('log_date', { ascending: false });

        const { data, error } = await withTimeout(query, 4000);

        if (!error && data && data.length > 0) {
          const remoteLogs: DailyClothingLog[] = (data as any[]).map(r => {
            const items: ClothingItem[] = (r.daily_log_item || [])
              .map((dli: any) => {
                const ci = dli.clothing_item;
                if (!ci) return null;
                return {
                  ...ci,
                  category: ci.category || 'Tops',
                  color: ci.color || 'Neutral'
                };
              })
              .filter(Boolean);

            return {
              log_id: r.log_id,
              user_id: r.user_id,
              log_date: r.log_date,
              is_finalized: Boolean(r.is_finalized),
              finalized_at: r.finalized_at,
              items: items
            };
          });

          mockDatabase.mergeRemoteDailyLogs(remoteLogs);

          return mockDatabase.getDailyLogs(targetUid);
        }
      } catch (err) {
        console.warn('Error fetching daily logs from Supabase:', err);
      }
    }

    return localLogs;
  },

  async createDailyLog(dateString: string, title?: string, userId?: string): Promise<DailyClothingLog> {
    return mockDatabase.createDailyLog(dateString, title, userId);
  },

  async updateTodayItems(logId: number, items: ClothingItem[]): Promise<DailyClothingLog | null> {

    const localLog = mockDatabase.updateTodayLogItems(logId, items);

    if (localLog) {
      void queueDateSync(localLog.user_id, localLog.log_date);
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

  async unlockDailyLogForEditing(logId: number): Promise<boolean> {
    const logBefore = mockDatabase.getDailyLogs().find(l => l.log_id === logId) || mockDatabase.getTodayLog(getLocalDateString());
    const wasFinalized = logBefore?.is_finalized;
    const items = logBefore?.items || [];

    const result = mockDatabase.unlockDailyLogForEditing(logId);
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
        const currentUser = mockDatabase.getCurrentUser();
        const canonicalUid = toCanonicalUserId(currentUser?.user_id);
        if (logBefore) {
          await supabase
            .from('daily_clothing_log')
            .update({ is_finalized: false, finalized_at: null })
            .match({ user_id: canonicalUid, log_date: logBefore.log_date });
        }
      } catch {}
    }
    return result;
  },

  async deleteDailyLog(logId: number): Promise<boolean> {
    const logBefore = mockDatabase.getDailyLogs().find(l => l.log_id === logId) || mockDatabase.getTodayLog(getLocalDateString());
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

    if (logBefore) {
      void queueDateSync(logBefore.user_id, logBefore.log_date);
    }
    return result;
  },

  async simulateMidnightFinalization(): Promise<DailyClothingLog | null> {
    const today = getLocalDateString();
    const log = mockDatabase.getTodayLog(today);
    if (log && !log.is_finalized) {
      return this.finalizeDailyLog(log.log_id);
    }
    return log;
  },

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

    const sortedByWearDesc = [...items]
      .filter(i => (i.wear_count || 0) > 0)
      .sort((a, b) => (b.wear_count || 0) - (a.wear_count || 0));
    const mostWorn = sortedByWearDesc.slice(0, 5);
    const leastWorn = [...items].sort((a, b) => (a.wear_count || 0) - (b.wear_count || 0)).slice(0, 5);
    const unwornList = items.filter(i => (i.wear_count || 0) === 0);

    const co2AvertedKg = Math.round(totalWears * 2.8);
    const waterAvertedLiters = Math.round(totalWears * 1250);

    return {
      totalItems,
      wornItems,
      unwornItems,
      utilizationRate,
      totalWears,
      averageWears,
      mostWorn,
      leastWorn,
      unwornList,
      co2AvertedKg,
      waterAvertedLiters
    };
  },

  async deleteUserAccount(userId: string, email?: string): Promise<boolean> {

    let deleted = mockDatabase.deleteUser(userId);
    if (!deleted && email) {
      deleted = mockDatabase.deleteUserByEmail(email);
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        try {
          await supabase.rpc('delete_user_account');
        } catch {}

        const canonicalUid = toCanonicalUserId(userId);

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

        await Promise.allSettled([
          supabase.from('daily_clothing_log').delete().eq('user_id', canonicalUid),
          supabase.from('bsas_assessment').delete().eq('user_id', canonicalUid),
          supabase.from('friend_request').delete().eq('sender_id', canonicalUid),
          supabase.from('friend_request').delete().eq('receiver_id', canonicalUid),
          supabase.from('borrow').delete().eq('borrower_id', canonicalUid),
          supabase.from('clothing_item').delete().eq('user_id', canonicalUid)
        ]);

        await supabase.from('users').delete().eq('user_id', canonicalUid);
        if (email) {
          await supabase.from('users').delete().ilike('email', email.trim().toLowerCase());
        }
      } catch (err) {
        console.warn('Supabase remote account deletion notice:', err);
      }
    }

    return true;
  },

  async syncLocalDataToSupabase(userId?: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;
    const currentUser = mockDatabase.getCurrentUser();
    const targetUid = toCanonicalUserId(userId || currentUser?.user_id);
    if (!UUID_RE.test(targetUid)) return;

    try {
      if (currentUser && isSameUser(currentUser.user_id, targetUid)) {
        await ensureUserSyncedToSupabase(currentUser);
      }

      const localItems = mockDatabase.getClothingItems(targetUid);
      if (localItems.length > 0) {
        const { data: remoteItems } = await supabase
          .from('clothing_item')
          .select('item_id, name')
          .eq('user_id', targetUid);

        const existingNames = new Set((remoteItems || []).map((r: any) => (r.name || '').trim().toLowerCase()));
        const missingItems = localItems.filter(l => !existingNames.has((l.name || '').trim().toLowerCase()));

        for (const item of missingItems) {
          try {
            const itemPayload: Record<string, any> = {
              user_id: targetUid,
              name: item.name,
              image_url: item.image_url,
              wear_count: item.wear_count || item.worn_count || 0
            };

            let { data: inserted, error: insErr } = await supabase
              .from('clothing_item')
              .insert([itemPayload])
              .select()
              .single();

            if (insErr && (insErr.code === '23502' || insErr.message?.includes('addition_type'))) {
              itemPayload.addition_type = 'Old';
              const retry = await supabase.from('clothing_item').insert([itemPayload]).select().single();
              inserted = retry.data;
              insErr = retry.error;
            }

            if (!insErr && inserted) {
              if (item.tags && item.tags.length > 0) {
                const tagsPayload = item.tags.map(t => ({
                  item_id: inserted.item_id,
                  tag_id: t.tag_id
                }));
                try {
                  await supabase.from('item_tag').insert(tagsPayload);
                } catch {}
              }
              mockDatabase.updateClothingItemId(item.item_id, inserted.item_id);
            }
          } catch (itemErr) {
            console.warn('[syncLocalDataToSupabase] Clothing item sync error:', itemErr);
          }
        }
      }

      const localAssessments = mockDatabase.getAssessments(targetUid);
      if (localAssessments.length > 0) {
        const { data: remoteAssessments } = await supabase
          .from('bsas_assessment')
          .select('assessment_id, taken_at')
          .eq('user_id', targetUid);

        if (!remoteAssessments || remoteAssessments.length === 0) {
          for (const a of localAssessments) {
            try {
              const { data: insertedA } = await supabase
                .from('bsas_assessment')
                .insert([{
                  user_id: targetUid,
                  score: a.score,
                  risk_level: a.risk_level,
                  taken_at: a.taken_at || new Date().toISOString()
                }])
                .select()
                .single();
              if (insertedA) {
                mockDatabase.updateAssessmentId(a.assessment_id, insertedA.assessment_id);
              }
            } catch {}
          }
        }
      }

      const localLogs = mockDatabase.getDailyLogs(targetUid);
      for (const log of localLogs) {
        if (log.items && log.items.length > 0) {
          await pushDateToRemote(targetUid, log.log_date);
        }
      }
    } catch (err) {
      console.warn('[syncLocalDataToSupabase] Sync error:', err);
    }
  }
};
