import { mockDatabase } from './supabaseClient';
import { User, FriendRequest, Borrow, ClothingItem } from '../types/database';

export const friendsService = {
  getCurrentUser(): User | null {
    return mockDatabase.getCurrentUser();
  },

  getAllUsers(): User[] {
    return mockDatabase.getAllUsers();
  },

  switchCurrentUser(userId: string) {
    mockDatabase.setCurrentUserId(userId);
  },

  getFriendRequests(): FriendRequest[] {
    return mockDatabase.getFriendRequests();
  },

  sendFriendRequest(friendCode: string): { success: boolean; message: string } {
    return mockDatabase.sendFriendRequest(friendCode);
  },

  respondToRequest(requestId: number, status: 'accepted' | 'rejected') {
    mockDatabase.respondToFriendRequest(requestId, status);
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
    return mockDatabase.createBorrowRequest(itemId, startDate, endDate);
  },

  updateBorrowStatus(borrowId: number, status: Borrow['status']) {
    mockDatabase.updateBorrowStatus(borrowId, status);
  },

  getNotifications(userId?: string) {
    return mockDatabase.getNotifications(userId);
  },

  clearNotifications(userId?: string) {
    mockDatabase.clearNotifications(userId);
  }
};
