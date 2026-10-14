import { mockDatabase, getSupabase, toCanonicalUserId, withTimeout, deduplicateAssessments, getLocalDateString, getStoredAssessmentBreakdown, isSameUser, ensureUserSyncedToSupabase } from '../../shared/services/supabaseClient';
import { ClothingItem, Tag, BSASAssessment, DailyClothingLog } from '../../shared/types/database';
import { CURATED_COLOR_FAMILIES } from '../../shared/data/seedData';

export { deduplicateAssessments };

export function broadcastClosetEvent(action: 'INSERT' | 'UPDATE' | 'DELETE', payload?: any): void {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const channel = supabase.channel('realtime_app_closet');
    channel.send({
      type: 'broadcast',
      event: 'clothing_item_updated',
      payload: { action, ...payload }
    }).catch(() => {});
  } catch {}
}

export function inferCategoryFromName(name?: string): string {
  if (!name) return 'Tops';
  const lower = name.toLowerCase();
  if (lower.includes('bottom') || lower.includes('pant') || lower.includes('short') || lower.includes('skirt') || lower.includes('jean') || lower.includes('trouser') || lower.includes('legging') || lower.includes('jogger')) {
    return 'Bottoms';
  }
  if (lower.includes('outerwear') || lower.includes('jacket') || lower.includes('coat') || lower.includes('hoodie') || lower.includes('sweater') || lower.includes('blazer') || lower.includes('cardigan') || lower.includes('fleece')) {
    return 'Outerwear';
  }
  if (lower.includes('dress') || lower.includes('gown') || lower.includes('one-piece')) {
    return 'Dresses';
  }
  if (lower.includes('shoe') || lower.includes('sneaker') || lower.includes('boot') || lower.includes('sandal') || lower.includes('heel') || lower.includes('loafer') || lower.includes('footwear')) {
    return 'Shoes';
  }
  if (lower.includes('knitwear')) {
    return 'Knitwear';
  }
  if (lower.includes('top') || lower.includes('shirt') || lower.includes('tee') || lower.includes('blouse') || lower.includes('tank') || lower.includes('polo')) {
    return 'Tops';
  }
  return 'Tops';
}

export function inferColorFromName(name?: string): { name: string; hex: string } {
  if (!name) return { name: 'Curated', hex: '#64748b' };
  const lower = name.toLowerCase();

  const colorSynonyms: Record<string, string> = {
    tan: 'Beige',
    khaki: 'Beige',
    cream: 'Beige',
    charcoal: 'Gray',
    grey: 'Gray',
    maroon: 'Burgundy',
    crimson: 'Red',
    scarlet: 'Red',
    cyan: 'Blue',
    indigo: 'Navy',
    denim: 'Blue',
    emerald: 'Green',
    forest: 'Green',
    mint: 'Green',
    sage: 'Green',
    mustard: 'Yellow',
    coral: 'Pink',
    rose: 'Pink',
    lavender: 'Violet',
    purple: 'Violet'
  };

  for (const c of CURATED_COLOR_FAMILIES) {
    if (c.name.toLowerCase() === 'neutral') continue;
    const re = new RegExp(`\\b${c.name.toLowerCase()}\\b`, 'i');
    if (re.test(lower)) {
      return { name: c.name, hex: c.hex };
    }
  }

  for (const [syn, familyName] of Object.entries(colorSynonyms)) {
    const re = new RegExp(`\\b${syn}\\b`, 'i');
    if (re.test(lower)) {
      const fam = CURATED_COLOR_FAMILIES.find(c => c.name.toLowerCase() === familyName.toLowerCase());
      if (fam) return { name: fam.name, hex: fam.hex };
    }
  }

  return { name: 'Curated', hex: '#64748b' };
}

export function resolveGarmentColor(item: { name?: string; color?: string; color_tag?: string }): { name: string; hex: string } {
  const inferred = inferColorFromName(item.name);
  const hasValidColor = item.color && item.color !== 'Neutral' && item.color !== 'Curated';

  if (hasValidColor) {
    const colorFamily = CURATED_COLOR_FAMILIES.find(c => c.name.toLowerCase() === item.color!.toLowerCase());
    return {
      name: item.color!,
      hex: item.color_tag || colorFamily?.hex || '#64748b'
    };
  }

  if (inferred.name !== 'Curated') {
    return inferred;
  }

  if (item.color) {
    return {
      name: item.color,
      hex: item.color_tag || '#64748b'
    };
  }

  return { name: 'Curated', hex: '#64748b' };
}

export function resolveGarmentCategory(item: { name?: string; category?: string; type_tag?: string }): string {
  if (item.category && item.category !== 'Tops') {
    return item.category;
  }
  const inferred = inferCategoryFromName(item.name);
  if (inferred !== 'Tops') {
    return inferred;
  }
  return item.category || item.type_tag || 'Tops';
}

export interface BSASCooldownInfo {
  canTake: boolean;
  daysRemaining: number;
  lastTakenDate: string | null;
  retakeDueDate: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let dailyLogSyncChain: Promise<void> = Promise.resolve();

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

        let { data, error } = await withTimeout(query, 2500);

        // Fallback to direct select('*') if 3-way join failed or timed out
        if (error || !data || data.length === 0) {
          try {
            const directRes = await withTimeout(
              supabase
                .from('clothing_item')
                .select('*')
                .eq('user_id', targetUid)
                .order('date_added', { ascending: false }),
              2000
            );
            if (directRes.data && directRes.data.length > 0) {
              data = directRes.data;
              error = null;
            }
          } catch {}
        }

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

            const itemForResolution = { ...r, category: cat || r.category, color: col || r.color };
            const finalCat = resolveGarmentCategory(itemForResolution);
            const finalColInfo = resolveGarmentColor(itemForResolution);

            return {
              ...r,
              category: finalCat,
              type_tag: finalCat,
              color: finalColInfo.name,
              color_tag: finalColInfo.hex
            } as ClothingItem;
          });

          remoteItems.forEach(rem => mockDatabase.upsertClothingItem(rem));

          const merged = remoteItems.map(rem => {
            const loc = localItems.find(l => l.item_id === rem.item_id);
            if (loc) {
              const maxWear = Math.max(rem.wear_count || 0, loc.wear_count || 0, loc.worn_count || 0);
              const resolvedCat = (loc.category && loc.category !== 'Tops') ? loc.category : rem.category;
              const resolvedCol = (loc.color && loc.color !== 'Neutral' && loc.color !== 'Curated') ? loc.color : rem.color;
              const resolvedHex = (resolvedCol === rem.color) ? rem.color_tag : (loc.color_tag || rem.color_tag);
              return {
                ...rem,
                ...loc,
                category: resolvedCat,
                type_tag: resolvedCat,
                color: resolvedCol,
                color_tag: resolvedHex,
                wear_count: maxWear,
                worn_count: maxWear
              };
            }
            return rem;
          });

          localItems.forEach(loc => {
            if (!merged.some(m => m.item_id === loc.item_id)) {
              merged.push({
                ...loc,
                category: resolveGarmentCategory(loc),
                type_tag: resolveGarmentCategory(loc),
                color: resolveGarmentColor(loc).name,
                color_tag: resolveGarmentColor(loc).hex
              });
            }
          });
          return merged;
        }
      } catch (err) {

      }
    }
    return localItems.map(loc => ({
      ...loc,
      category: resolveGarmentCategory(loc),
      type_tag: resolveGarmentCategory(loc),
      color: resolveGarmentColor(loc).name,
      color_tag: resolveGarmentColor(loc).hex
    }));
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

          let { data, error } = await withTimeout(
            supabase
              .from('clothing_item')
              .insert([itemPayload])
              .select()
              .single(),
            2500
          );

          if (error && (error.code === '23502' || error.message?.includes('addition_type'))) {
            itemPayload.addition_type = 'Old';
            const retry = await withTimeout(
              supabase.from('clothing_item').insert([itemPayload]).select().single(),
              2500
            );
            data = retry.data;
            error = retry.error;
          }

          if (!error && data) {
            try {
              const { data: allTags } = await withTimeout(supabase.from('tag').select('*'), 2000);
              const catName = item.category || inferCategoryFromName(item.name);
              const colName = item.color || inferColorFromName(item.name).name;

              const tagIdsToInsert: number[] = [];
              if (allTags && Array.isArray(allTags)) {
                const catTag = allTags.find((t: any) => t.tag_name?.toLowerCase() === catName?.toLowerCase());
                if (catTag) tagIdsToInsert.push(catTag.tag_id);
                const colTag = allTags.find((t: any) => t.tag_name?.toLowerCase() === colName?.toLowerCase());
                if (colTag) tagIdsToInsert.push(colTag.tag_id);
              }
              if (item.tags && item.tags.length > 0) {
                item.tags.forEach(t => {
                  if (t.tag_id && !tagIdsToInsert.includes(t.tag_id)) {
                    tagIdsToInsert.push(t.tag_id);
                  }
                });
              }
              if (tagIdsToInsert.length > 0) {
                await withTimeout(
                  supabase.from('item_tag').upsert(
                    tagIdsToInsert.map(tag_id => ({ item_id: data.item_id, tag_id })),
                    { onConflict: 'item_id,tag_id' }
                  ),
                  2000
                );
              }
            } catch {}

            mockDatabase.updateClothingItemId(localItem.item_id, data.item_id);
            broadcastClosetEvent('INSERT', { user_id: canonicalUid, item_id: data.item_id });
            return { ...localItem, item_id: data.item_id, ...data };
          }
        }
      }
    } catch {

    }
    broadcastClosetEvent('INSERT', { user_id: canonicalUid, item_id: localItem.item_id });
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
        broadcastClosetEvent('UPDATE', { item_id: itemId, updates });
      } catch {

      }
    } else {
      broadcastClosetEvent('UPDATE', { item_id: itemId, updates });
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
        broadcastClosetEvent('DELETE', { item_id: itemId });
      } catch {

      }
    } else {
      broadcastClosetEvent('DELETE', { item_id: itemId });
    }
    return localResult;
  },

  async getTags(): Promise<Tag[]> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await withTimeout(supabase.from('tag').select('*'), 2000);
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
            const breakdown = matchingLocal?.breakdown || getStoredAssessmentBreakdown(rem.user_id, rem.assessment_id);
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

        const { data, error } = await withTimeout(query, 2500);

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
