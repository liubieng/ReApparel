import { mockDatabase, getSupabase, toCanonicalUserId, withTimeout, isSameUser } from './supabaseClient';
import { User, FriendRequest, Borrow, ClothingItem } from '../types/database';

export const friendsService = {
  getCurrentUser(): User | null {
    return mockDatabase.getCurrentUser();
  },

  getAllUsers(): User[] {
    return mockDatabase.getAllUsers();
  },

  switchCurrentUser(userId: string) {
    mockDatabase.setCurrentUserId(toCanonicalUserId(userId));
  },

  getFriendRequests(): FriendRequest[] {
    return mockDatabase.getFriendRequests();
  },

  async sendFriendRequest(friendCode: string): Promise<{ success: boolean; message: string }> {
    const cleanCode = friendCode.trim().toUpperCase();
    const currentUser = mockDatabase.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'Please log in or register first.' };
    }

    // 1. Try local lookup first (same-device accounts)
    let targetUser = mockDatabase.getAllUsers().find(u => u.friend_code.toUpperCase() === cleanCode);

    // 2. If not found locally, query Supabase for the user by friend_code
    if (!targetUser) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .ilike('friend_code', cleanCode)
            .limit(1);

          if (!error && data && data.length > 0) {
            targetUser = data[0] as User;
            mockDatabase.upsertUser(targetUser);
          }
        } catch {
          // Network unavailable — fall through
        }
      }
    }

    // 3. Dispatch to local database engine to create pending friend request
    const res = mockDatabase.sendFriendRequest(friendCode);

    // 4. Persist the pending friend_request to Supabase
    if (res.success && targetUser) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('friend_request')
            .upsert([
              {
                sender_id: currentUser.user_id,
                receiver_id: targetUser.user_id,
                status: 'pending',
                updated_at: new Date().toISOString()
              }
            ], { onConflict: 'sender_id,receiver_id' })
            .select();

          if (error) {
            console.warn('[friendsService] Supabase friend_request error:', error.message);
          } else if (data && data[0]) {
            const reqs = mockDatabase.getFriendRequests();
            const localReq = reqs.find(
              r => r.sender_id === currentUser.user_id && targetUser && r.receiver_id === targetUser.user_id
            );
            if (localReq) {
              localReq.request_id = data[0].request_id;
              mockDatabase.upsertFriendRequest(localReq);
            }
          }
        } catch (err) {
          console.warn('[friendsService] Failed to persist friend_request:', err);
        }
      }
    }
    return res;
  },

  /**
   * Fetches incoming and outgoing friend requests from Supabase and merges them into the local store.
   */
  async fetchFriendRequestsFromSupabase(userId?: string): Promise<FriendRequest[]> {
    const supabase = getSupabase();
    const uid = userId || mockDatabase.getCurrentUser()?.user_id;
    if (!supabase || !uid) return mockDatabase.getFriendRequests();

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('friend_request')
          .select('*')
          .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`),
        4000
      );

      if (!error && data && Array.isArray(data)) {
        data.forEach((r: any) => {
          mockDatabase.upsertFriendRequest({
            request_id: r.request_id,
            sender_id: r.sender_id,
            receiver_id: r.receiver_id,
            status: r.status,
            updated_at: r.updated_at || new Date().toISOString()
          });
        });
      }
    } catch (err) {
      console.warn('[friendsService] fetchFriendRequestsFromSupabase error:', err);
    }

    return mockDatabase.getFriendRequests();
  },

  /**
   * Fetches all users from Supabase and merges them into the local store.
   * Ensures users registered on other devices are discoverable by friend code.
   */
  async fetchAndMergeUsersFromSupabase(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .select('user_id, email, first_name, last_name, friend_code, created_at'),
        3000
      );
      if (error || !data || data.length === 0) return;
      (data as User[]).forEach(u => mockDatabase.upsertUser(u));
    } catch {
      // Silently ignore network failures
    }
  },

  async respondToRequest(requestId: number, status: 'accepted' | 'rejected'): Promise<void> {
    mockDatabase.respondToFriendRequest(requestId, status);
    const supabase = getSupabase();
    if (supabase) {
      try {
        const req = mockDatabase.getFriendRequests().find(r => r.request_id === requestId);
        if (req) {
          const { error } = await supabase
            .from('friend_request')
            .update({ status: req.status, updated_at: req.updated_at })
            .or(`request_id.eq.${requestId},and(sender_id.eq.${req.sender_id},receiver_id.eq.${req.receiver_id})`);

          if (error) {
            console.warn('[friendsService] Supabase respondToRequest error:', error.message);
          }
        }
      } catch (err) {
        console.warn('[friendsService] Error in respondToRequest:', err);
      }
    }
  },

  getConnectedFriends(): User[] {
    const currentUser = mockDatabase.getCurrentUser();
    if (!currentUser) return [];
    const requests = mockDatabase.getFriendRequests();
    const allUsers = mockDatabase.getAllUsers();

    const friendIds = new Set<string>();

    requests.forEach(r => {
      if (r.status === 'accepted') {
        if (r.sender_id === currentUser.user_id) {
          friendIds.add(r.receiver_id);
        } else if (r.receiver_id === currentUser.user_id) {
          friendIds.add(r.sender_id);
        }
      }
    });

    return allUsers.filter(u => friendIds.has(u.user_id));
  },

  async removeFriend(friendId: string): Promise<void> {
    const currentUser = mockDatabase.getCurrentUser();
    if (!currentUser) return;
    const currentUid = currentUser.user_id;

    // Find any matching friend_request ids
    const matchingReqs = mockDatabase.getFriendRequests().filter(
      r => (isSameUser(r.sender_id, currentUid) && isSameUser(r.receiver_id, friendId)) ||
           (isSameUser(r.sender_id, friendId) && isSameUser(r.receiver_id, currentUid))
    );
    const requestIds = matchingReqs.map(r => r.request_id);

    // Remove locally
    mockDatabase.removeFriend(currentUid, friendId);

    // Remove from Supabase
    const supabase = getSupabase();
    if (supabase) {
      try {
        if (requestIds.length > 0) {
          await supabase
            .from('friend_request')
            .delete()
            .in('request_id', requestIds);
        }
        await supabase
          .from('friend_request')
          .delete()
          .or(`and(sender_id.eq.${currentUid},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUid})`);
      } catch (err) {
        console.warn('[friendsService] removeFriend Supabase delete error:', err);
      }
    }
  },

  getFriendCloset(friendId: string): ClothingItem[] {
    return mockDatabase.getClothingItems(friendId);
  },

  // --- BORROW REQUESTS ---
  getBorrows(): Borrow[] {
    return mockDatabase.getBorrows();
  },

  getIncomingBorrowRequests(): Borrow[] {
    const currentUser = mockDatabase.getCurrentUser();
    if (!currentUser) return [];
    const allBorrows = mockDatabase.getBorrows();
    return allBorrows.filter(b => b.lender?.user_id === currentUser.user_id);
  },

  getMyBorrowRequests(): Borrow[] {
    const currentUser = mockDatabase.getCurrentUser();
    if (!currentUser) return [];
    const allBorrows = mockDatabase.getBorrows();
    return allBorrows.filter(b => b.borrower_id === currentUser.user_id);
  },

  async requestBorrow(itemId: number, startDate: string, endDate: string): Promise<Borrow> {
    const borrow = mockDatabase.createBorrowRequest(itemId, startDate, endDate);
    const supabase = getSupabase();
    if (supabase) {
      try {
        const isBorrowerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(borrow.borrower_id);
        if (isBorrowerUuid) {
          const { data, error } = await supabase
            .from('borrow')
            .insert([{
              borrower_id: borrow.borrower_id,
              item_id: borrow.item_id,
              start_date: borrow.start_date,
              end_date: borrow.end_date,
              status: borrow.status
            }])
            .select();

          if (error) {
            console.warn('[friendsService] Supabase insert borrow error:', error.message);
          } else if (data && data[0]) {
            borrow.borrow_id = data[0].borrow_id;
            mockDatabase.upsertBorrow(borrow);
          }
        }
      } catch (err) {
        console.warn('[friendsService] Failed to insert borrow to Supabase:', err);
      }
    }
    return borrow;
  },

  /**
   * Fetches borrow records from Supabase and merges them into the local store,
   * ensuring incoming requests and status updates trigger real-time notifications for the other user.
   */
  async fetchBorrowsFromSupabase(userId?: string): Promise<Borrow[]> {
    const supabase = getSupabase();
    const uid = userId || mockDatabase.getCurrentUser()?.user_id;
    if (!supabase || !uid) return mockDatabase.getBorrows();

    try {
      let data: any[] | null = null;
      let error: any = null;

      // Try selecting with joined clothing_item
      const joinRes = await withTimeout(
        supabase
          .from('borrow')
          .select('*, clothing_item(*)'),
        4000
      );
      data = joinRes.data;
      error = joinRes.error;

      // If join fails (e.g. relationship not defined in schema cache), fallback to simple select
      if (error || !data) {
        console.warn('[friendsService] borrow join with clothing_item failed, falling back to simple select:', error?.message);
        const simpleRes = await withTimeout(
          supabase
            .from('borrow')
            .select('*'),
          4000
        );
        data = simpleRes.data;
        error = simpleRes.error;
      }

      if (!error && data && Array.isArray(data)) {
        // Find any item_ids that are not yet registered in local mockDatabase
        const knownItemIds = new Set(mockDatabase.getClothingItems().map(i => i.item_id));
        const missingItemIds = data
          .map((r: any) => r.item_id)
          .filter((id: number) => id && !knownItemIds.has(id));

        if (missingItemIds.length > 0) {
          try {
            const { data: remoteItems } = await supabase
              .from('clothing_item')
              .select('*')
              .in('item_id', missingItemIds);
            if (remoteItems && Array.isArray(remoteItems)) {
              remoteItems.forEach((it: any) => mockDatabase.upsertClothingItem(it));
            }
          } catch (e) {
            console.warn('[friendsService] error fetching missing clothing items for borrows:', e);
          }
        }

        data.forEach((r: any) => {
          if (r.clothing_item) {
            mockDatabase.upsertClothingItem(r.clothing_item);
          }
          mockDatabase.upsertBorrow({
            borrow_id: r.borrow_id,
            borrower_id: r.borrower_id,
            item_id: r.item_id,
            start_date: r.start_date,
            end_date: r.end_date,
            status: r.status,
            created_at: r.created_at || new Date().toISOString(),
            item: r.clothing_item
          });
        });
      }
    } catch (err) {
      console.warn('[friendsService] fetchBorrowsFromSupabase error:', err);
    }

    return mockDatabase.getBorrows();
  },

  async updateBorrowStatus(borrowId: number, status: Borrow['status']): Promise<void> {
    mockDatabase.updateBorrowStatus(borrowId, status);
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('borrow')
          .update({ status })
          .eq('borrow_id', borrowId);

        if (error) {
          console.warn('[friendsService] Supabase updateBorrowStatus error:', error.message);
        }
      } catch (err) {
        console.warn('[friendsService] updateBorrowStatus error:', err);
      }
    }
  },

  getNotifications(userId?: string) {
    return mockDatabase.getNotifications(userId);
  },

  clearNotifications(userId?: string) {
    mockDatabase.clearNotifications(userId);
  },

  markNotificationAsRead(notificationId: string) {
    mockDatabase.markNotificationAsRead(notificationId);
  },

  deleteNotification(notificationId: string) {
    mockDatabase.deleteNotification(notificationId);
  }
};
