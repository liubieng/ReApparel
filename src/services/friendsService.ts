import { mockDatabase, getSupabase, toCanonicalUserId } from './supabaseClient';
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

  sendFriendRequest(friendCode: string): { success: boolean; message: string } {
    const res = mockDatabase.sendFriendRequest(friendCode);
    if (res.success) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const reqs = mockDatabase.getFriendRequests();
          const latest = reqs[0];
          if (latest) {
            const isSenderUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(latest.sender_id);
            const isReceiverUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(latest.receiver_id);
            if (isSenderUuid && isReceiverUuid) {
              supabase.from('friend_request').insert([{
                sender_id: latest.sender_id,
                receiver_id: latest.receiver_id,
                status: latest.status
              }]).then(() => {}, () => {});
            }
          }
        } catch {}
      }
    }
    return res;
  },

  respondToRequest(requestId: number, status: 'accepted' | 'rejected') {
    mockDatabase.respondToFriendRequest(requestId, status);
    const supabase = getSupabase();
    if (supabase) {
      try {
        const req = mockDatabase.getFriendRequests().find(r => r.request_id === requestId);
        if (req) {
          supabase
            .from('friend_request')
            .update({ status: req.status, updated_at: req.updated_at })
            .match({ sender_id: req.sender_id, receiver_id: req.receiver_id })
            .then(() => {}, () => {});
        }
      } catch {}
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

  requestBorrow(itemId: number, startDate: string, endDate: string): Borrow {
    const borrow = mockDatabase.createBorrowRequest(itemId, startDate, endDate);
    const supabase = getSupabase();
    if (supabase) {
      try {
        const isBorrowerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(borrow.borrower_id);
        if (isBorrowerUuid) {
          supabase.from('borrow').insert([{
            borrower_id: borrow.borrower_id,
            item_id: borrow.item_id,
            start_date: borrow.start_date,
            end_date: borrow.end_date,
            status: borrow.status
          }]).then(() => {}, () => {});
        }
      } catch {}
    }
    return borrow;
  },

  updateBorrowStatus(borrowId: number, status: Borrow['status']) {
    mockDatabase.updateBorrowStatus(borrowId, status);
    const supabase = getSupabase();
    if (supabase) {
      try {
        supabase
          .from('borrow')
          .update({ status })
          .eq('borrow_id', borrowId)
          .then(() => {}, () => {});
      } catch {}
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
