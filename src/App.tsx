import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  mockDatabase,
  getSupabase,
  getStoredSupabaseConfig,
  safeStorage,
  STORAGE_KEY_ACTIVE_USER,
  STORAGE_KEY_ACTIVE_VIEW,
  deduplicateAssessments,
  getLocalDateString,
  ensureUserSyncedToSupabase
} from './services/supabaseClient';
import { closetService } from './services/closetService';
import { friendsService } from './services/friendsService';
import { mapsService } from './services/mapsService';

import {
  User,
  ClothingItem,
  BSASAssessment,
  DailyClothingLog,
  FriendRequest,
  Borrow,
  DonationOpportunity,
  AppNotification
} from './types/database';

import { AuthView } from './views/AuthView';
import { ProfileView } from './views/ProfileView';
import { SettingsView } from './views/SettingsView';
import { BSASIntroView } from './views/BSASIntroView';
import { VirtualClosetView } from './views/VirtualClosetView';
import { DailyLogView } from './views/DailyLogView';
import { RecoveryView } from './views/RecoveryView';
import { ClosetStatisticsView } from './views/ClosetStatisticsView';
import { FriendsView } from './views/FriendsView';
import { LendingDashboardView } from './views/LendingDashboardView';
import { NotificationsView } from './views/NotificationsView';
import { DonationMapSection } from './views/DonationMapSection';

import { BSASAssessmentModal } from './components/modals/BSASAssessmentModal';
import { AddItemModal } from './components/modals/AddItemModal';
import { EditItemModal } from './components/modals/EditItemModal';
import { DeleteCascadeModal } from './components/modals/DeleteCascadeModal';
import { BorrowModal } from './components/modals/BorrowModal';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ConfirmModal } from './components/modals/ConfirmModal';
import { DatabaseModal } from './components/modals/DatabaseModal';
import { BrainCircuit } from 'lucide-react';

const VALID_VIEWS = new Set([
  'closet',
  'daily-log',
  'recovery',
  'closet-statistics',
  'notifications',
  'requests',
  'friends',
  'donations',
  'profile',
  'settings',
  'bsasIntro',
  'bsas'
]);

export default function App() {

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (safeStorage.getItem('reapparel_theme') as 'light' | 'dark') || 'light';
  });

  const [view, setView] = useState<string>(() => {
    const user = mockDatabase.getCurrentUser();
    const hasActiveId = Boolean(safeStorage.getItem(STORAGE_KEY_ACTIVE_USER));

    if (!user && !hasActiveId) {
      return 'login';
    }
    const saved = safeStorage.getItem(STORAGE_KEY_ACTIVE_VIEW);
    if (saved && VALID_VIEWS.has(saved)) {
      if (saved === 'bsas' || saved === 'bsasIntro') {
        const uid = user?.user_id || safeStorage.getItem(STORAGE_KEY_ACTIVE_USER);
        const userAssessments = uid ? mockDatabase.getAssessments(uid) : [];
        if (userAssessments.length > 0) {
          return 'closet';
        }
      }
      return saved;
    }
    return 'closet';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(mockDatabase.getCurrentUser());
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(() => {
    const activeId = safeStorage.getItem(STORAGE_KEY_ACTIVE_USER);
    const user = mockDatabase.getCurrentUser();
    return Boolean(activeId && !user);
  });
  const [allUsers, setAllUsers] = useState<User[]>(mockDatabase.getAllUsers());
  const [garments, setGarments] = useState<ClothingItem[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [opportunities, setOpportunities] = useState<DonationOpportunity[]>([]);
  const [assessments, setAssessments] = useState<BSASAssessment[]>([]);
  const [todayLog, setTodayLog] = useState<DailyClothingLog>({
    log_id: 0,
    user_id: '',
    log_date: getLocalDateString(),
    is_finalized: false,
    finalized_at: null,
    items: []
  });
  const [dailyLogs, setDailyLogs] = useState<DailyClothingLog[]>([]);

  const [simulatedDaysOffset, setSimulatedDaysOffset] = useState<number>(0);

  const [isAddGarmentOpen, setIsAddGarmentOpen] = useState(false);
  const [editingGarment, setEditingGarment] = useState<ClothingItem | null>(null);
  const [deletingGarment, setDeletingGarment] = useState<ClothingItem | null>(null);
  const [borrowContext, setBorrowContext] = useState<{ friend: User; garment: ClothingItem } | null>(null);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [donHighlight, setDonHighlight] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    requiredConfirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Proceed',
    requiredConfirmText: undefined,
    onConfirm: () => { }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    safeStorage.setItem('reapparel_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (currentUser && view && view !== 'login') {
      safeStorage.setItem(STORAGE_KEY_ACTIVE_VIEW, view);
    } else if (!currentUser || view === 'login') {
      safeStorage.removeItem(STORAGE_KEY_ACTIVE_VIEW);
    }
  }, [view, currentUser]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const syncLocalState = useCallback(() => {
    const user = mockDatabase.getCurrentUser();
    setCurrentUser(user);
    setAllUsers(mockDatabase.getAllUsers());

    if (user) {
      setGarments(mockDatabase.getClothingItems(user.user_id));
      setAssessments(mockDatabase.getAssessments(user.user_id));
      setTodayLog(mockDatabase.getTodayLog(getLocalDateString()));
      setFriends(friendsService.getConnectedFriends());
      setFriendRequests(friendsService.getFriendRequests());
      setBorrows(friendsService.getBorrows());
      setNotifications(friendsService.getNotifications(user.user_id));
      setDailyLogs(mockDatabase.getDailyLogs(user.user_id));
      setOpportunities(mapsService.getDonationOpportunities());
    } else {
      setFriends([]);
      setFriendRequests([]);
      setBorrows([]);
      setNotifications([]);
    }
  }, []);

  const loadData = useCallback(async (options?: { forceDonations?: boolean }) => {
    let user = mockDatabase.getCurrentUser();
    if (!user && safeStorage.getItem(STORAGE_KEY_ACTIVE_USER)) {
      user = await mockDatabase.syncCurrentUserWithSupabase();
    }
    if (user) {
      try {
        user = await ensureUserSyncedToSupabase(user);
        closetService.syncLocalDataToSupabase(user.user_id).catch(() => {});
      } catch {}
    }
    setCurrentUser(user);
    setIsAuthInitializing(false);
    setAllUsers(mockDatabase.getAllUsers());

    if (user) {

      syncLocalState();

      setView(prev => {
        if (prev === 'login') {
          const saved = safeStorage.getItem(STORAGE_KEY_ACTIVE_VIEW);
          const safeSaved = (saved === 'bsas' || saved === 'bsasIntro') ? 'closet' : saved;
          return (safeSaved && VALID_VIEWS.has(safeSaved)) ? safeSaved : 'closet';
        }
        return prev;
      });

      try {
        const fetchPromises: Promise<any>[] = [
          closetService.getItems(user.user_id).catch(() => mockDatabase.getClothingItems(user.user_id)),
          closetService.getAssessments(user.user_id).catch(() => mockDatabase.getAssessments(user.user_id)),
          closetService.getDailyLogs(user.user_id).catch(() => mockDatabase.getDailyLogs(user.user_id)),
          friendsService.fetchAndMergeUsersFromSupabase().catch(() => { }),
          friendsService.fetchFriendRequestsFromSupabase(user.user_id).catch(() => []),
          friendsService.fetchBorrowsFromSupabase(user.user_id).catch(() => [])
        ];

        if (options?.forceDonations || view === 'donations') {
          fetchPromises.push(mapsService.fetchAndMergeFromSupabase().catch(() => { }));
        }

        const [items, userAssessments, userLogs] = await Promise.all(fetchPromises);

        if (items) setGarments(items);

        if (userAssessments) {
          setAssessments(deduplicateAssessments([
            ...mockDatabase.getAssessments(user.user_id),
            ...userAssessments
          ]));
        }
        if (userLogs) setDailyLogs(userLogs);
        setAllUsers(mockDatabase.getAllUsers());
        setFriends(friendsService.getConnectedFriends());
        setFriendRequests(friendsService.getFriendRequests());
        setBorrows(friendsService.getBorrows());
        setNotifications(friendsService.getNotifications(user.user_id));
        setOpportunities(mapsService.getDonationOpportunities());
      } catch {

      }
    } else {
      if (safeStorage.getItem(STORAGE_KEY_ACTIVE_USER)) {
        mockDatabase.setCurrentUserId(null);
      }
      safeStorage.removeItem(STORAGE_KEY_ACTIVE_VIEW);
      setView('login');
      setGarments(mockDatabase.getClothingItems());
      setAssessments(mockDatabase.getAssessments());
      setTodayLog(mockDatabase.getTodayLog(getLocalDateString()));
      setFriends([]);
      setFriendRequests([]);
      setBorrows([]);
      setNotifications([]);
    }
  }, [syncLocalState, view]);

  useEffect(() => {
    loadData();
    const unsubscribe = mockDatabase.subscribe(() => {
      syncLocalState();
    });
    return () => unsubscribe();
  }, [loadData, syncLocalState]);

  useEffect(() => {
    if (view !== 'donations') return;

    const refresh = () => {
      mapsService.fetchAndMergeFromSupabase().then(() => {
        setOpportunities(mapsService.getDonationOpportunities());
      }).catch(() => { });
    };
    refresh();

    const pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 120000);

    return () => clearInterval(pollTimer);
  }, [view]);

  useEffect(() => {
    if (view !== 'daily-log') return;
    const uid = currentUser?.user_id;
    if (!uid) return;
    closetService.getDailyLogs(uid).then(logs => {
      if (logs) setDailyLogs(logs);
    }).catch(() => { });
  }, [view, currentUser]);

  useEffect(() => {
    if (view !== 'friends' && view !== 'notifications' && view !== 'requests' && view !== 'recovery') return;
    const uid = currentUser?.user_id;
    if (!uid) return;

    const refresh = () => {
      Promise.all([
        friendsService.fetchFriendRequestsFromSupabase(uid).catch(() => []),
        friendsService.fetchBorrowsFromSupabase(uid).catch(() => [])
      ]).then(() => {
        setFriendRequests(friendsService.getFriendRequests());
        setFriends(friendsService.getConnectedFriends());
        setBorrows(friendsService.getBorrows());
        setNotifications(friendsService.getNotifications(uid));
      }).catch(() => { });
    };

    refresh();
    const pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 10000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('focus', onFocus);
    };
  }, [view, currentUser?.user_id]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const channel = supabase
        .channel('realtime_app_friend_requests')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friend_request' },
          (payload: any) => {
            const uid = mockDatabase.getCurrentUser()?.user_id;
            if (!uid) return;
            if (payload?.eventType === 'DELETE') {
              if (payload.old?.request_id) {
                mockDatabase.deleteFriendRequest(payload.old.request_id);
              }
              friendsService.fetchFriendRequestsFromSupabase(uid).then(() => {
                setFriendRequests(friendsService.getFriendRequests());
                setFriends(friendsService.getConnectedFriends());
                setNotifications(friendsService.getNotifications(uid));
              }).catch(() => { });
            } else if (payload?.new) {
              const r = payload.new;
              if (r.sender_id === uid || r.receiver_id === uid) {
                mockDatabase.upsertFriendRequest({
                  request_id: r.request_id,
                  sender_id: r.sender_id,
                  receiver_id: r.receiver_id,
                  status: r.status,
                  updated_at: r.updated_at || new Date().toISOString()
                });
                setFriendRequests(friendsService.getFriendRequests());
                setFriends(friendsService.getConnectedFriends());
                setNotifications(friendsService.getNotifications(uid));
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch { }
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const channel = supabase
        .channel('realtime_app_borrows')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'borrow' },
          async (payload: any) => {
            const uid = mockDatabase.getCurrentUser()?.user_id;
            if (!uid) return;
            await friendsService.fetchBorrowsFromSupabase(uid);
            setBorrows(friendsService.getBorrows());
            setNotifications(friendsService.getNotifications(uid));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch { }
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const channel = supabase
        .channel('realtime_community_donations')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'donation_opportunity' },
          (payload: any) => {
            if (payload?.eventType === 'DELETE' && payload.old?.donation_id) {
              mapsService.removeDonationOpportunity(payload.old.donation_id);
            } else if (payload?.new?.donation_id) {
              mapsService.mergeRemoteRows([payload.new]);
            }
            setOpportunities(mapsService.getDonationOpportunities());
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch { }
  }, []);

  useEffect(() => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {

        const isAuthCallback = typeof window !== 'undefined' && (
          window.location.hash.includes('access_token') ||
          window.location.hash.includes('type=') ||
          window.location.search.includes('code=')
        );

        if (!isAuthCallback) {
          return;
        }

        if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
          const authUser = session.user;
          const currentActiveId = mockDatabase.getCurrentUser()?.user_id;

          if (!currentActiveId || currentActiveId !== authUser.id) {
            let appUser = mockDatabase.findUserByIdentifier(authUser.email || authUser.id);
            if (appUser && appUser.user_id !== authUser.id) {
              mockDatabase.realignUserId(appUser.user_id, authUser.id);
              appUser = mockDatabase.getUser(authUser.id);
            }

            if (!appUser) {
              try {
                const { data } = await supabase.from('users').select('*').eq('user_id', authUser.id).limit(1);
                if (data && data.length > 0) {
                  appUser = data[0] as User;
                } else if (authUser.email) {
                  const { data: byEmail } = await supabase.from('users').select('*').ilike('email', authUser.email).limit(1);
                  if (byEmail && byEmail.length > 0) {
                    appUser = byEmail[0] as User;
                  }
                }
              } catch { }
            }

            if (!appUser && authUser.email) {
              const fName = authUser.user_metadata?.first_name || authUser.email.split('@')[0] || 'Member';
              const lName = authUser.user_metadata?.last_name || '';
              appUser = mockDatabase.registerUser({
                user_id: authUser.id,
                email: authUser.email,
                first_name: fName,
                last_name: lName
              });
            }

            if (appUser) {
              appUser = await ensureUserSyncedToSupabase(appUser);
              mockDatabase.upsertUser(appUser);
              mockDatabase.setCurrentUserId(appUser.user_id);
              setCurrentUser(appUser);
              closetService.syncLocalDataToSupabase(appUser.user_id).catch(() => {});
              if (window.location.hash || window.location.search) {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
              toast(`Email verified! Welcome to ReApparel, ${appUser.first_name}.`);
              await loadData();
            }
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch { }
  }, [loadData, toast]);

  const handleLoginSuccess = (user: User, isNewUser: boolean) => {
    setCurrentUser(user);
    loadData();
    if (isNewUser) {
      setView('bsasIntro');
    } else {
      const saved = safeStorage.getItem(STORAGE_KEY_ACTIVE_VIEW);
      const safeSaved = (saved === 'bsas' || saved === 'bsasIntro') ? 'closet' : saved;
      const targetView = (safeSaved && VALID_VIEWS.has(safeSaved) && safeSaved !== 'login') ? safeSaved : 'closet';
      setView(targetView);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    mockDatabase.setCurrentUserId(userId);
    await loadData();
    const user = mockDatabase.getCurrentUser();
    toast(`Active profile switched to ${user?.first_name} ${user?.last_name}`);
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.auth.signOut().catch(() => { });
      }
    } catch { }
    mockDatabase.setCurrentUserId(null);
    safeStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
    safeStorage.removeItem(STORAGE_KEY_ACTIVE_VIEW);
    safeStorage.removeItem('reapparel_user_id');
    setCurrentUser(null);
    setView('login');
    setGarments([]);
    setAssessments([]);
    setFriends([]);
    setFriendRequests([]);
    setBorrows([]);
    setNotifications([]);
    toast('Logged out successfully.');
  };

  const handleCompleteBSAS = async (score: number, breakdown: NonNullable<BSASAssessment['breakdown']>, targetView: 'closet' | 'recovery' = 'closet') => {
    const activeUid = currentUser?.user_id || mockDatabase.getCurrentUser()?.user_id || mockDatabase.getAllUsers()[0]?.user_id || '';

    safeStorage.setItem(STORAGE_KEY_ACTIVE_VIEW, targetView);
    setView(targetView);

    await closetService.submitAssessment(score, breakdown, activeUid);

    const freshAssessments = mockDatabase.getAssessments(activeUid);
    setAssessments(freshAssessments);

    toast(score >= 4 ? 'Check-in saved: Indicative risk identified' : 'Check-in saved: Non-Indicative risk level');

    loadData().catch(() => { });
  };

  const handleAddGarment = async (item: Omit<ClothingItem, 'item_id' | 'wear_count' | 'date_added'>) => {
    const activeUid = item.user_id || currentUser?.user_id || mockDatabase.getCurrentUser()?.user_id || mockDatabase.getAllUsers()[0]?.user_id || '';
    await closetService.addItem({
      ...item,
      user_id: activeUid
    });
    await loadData();
  };

  const handleUpdateGarment = async (itemId: number, updates: Partial<ClothingItem>) => {
    await closetService.updateItem(itemId, updates);
    await loadData();
  };

  const handleConfirmDeleteGarment = async (itemId: number) => {
    await closetService.deleteItem(itemId);
    setDeletingGarment(null);
    await loadData();
    toast('Clothing item deleted from your closet.');
  };

  const handleToggleGarmentInOutfit = async (garment: ClothingItem, targetLogId?: number) => {
    const targetId = targetLogId || todayLog.log_id;

    const targetLog = mockDatabase.getDailyLogById(targetId)
      || mockDatabase.getDailyLogs(currentUser?.user_id).find(l => l.log_id === targetId)
      || dailyLogs.find(l => l.log_id === targetId)
      || (targetId === todayLog.log_id ? todayLog : null);

    if (!targetLog) {
      console.warn('Target outfit not found for toggle:', targetId);
      return;
    }

    if (targetLog.is_finalized) {
      toast("This outfit record is already locked & finalized.");
      return;
    }
    const current = targetLog.items || [];
    const exists = current.some(i => i.item_id === garment.item_id);
    const updated = exists
      ? current.filter(i => i.item_id !== garment.item_id)
      : [...current, garment];

    toast(exists ? `Removed ${garment.name} from outfit` : `Added ${garment.name} to outfit`);
    await closetService.updateTodayItems(targetId, updated);
    setDailyLogs(prev => prev.map(l => l.log_id === targetId ? { ...l, items: updated } : l));
    if (todayLog.log_id === targetId) {
      setTodayLog(prev => ({ ...prev, items: updated }));
    }
  };

  const handleFinalizeDailyLog = async (targetLogId?: number) => {
    const targetId = targetLogId || todayLog.log_id;
    const res = await closetService.finalizeDailyLog(targetId);
    if (res) {
      setDailyLogs(prev => prev.map(l => l.log_id === targetId ? { ...l, is_finalized: true, finalized_at: res.finalized_at } : l));
      if (todayLog.log_id === targetId) {
        setTodayLog(prev => ({ ...prev, is_finalized: true, finalized_at: res.finalized_at }));
      }
    }
    toast("Outfit finalized! Cumulative wear counts updated.");
  };

  const handleEditDailyLog = async (targetLogId?: number) => {
    const targetId = targetLogId || todayLog.log_id;
    await closetService.unlockDailyLogForEditing(targetId);
    setDailyLogs(prev => prev.map(l => l.log_id === targetId ? { ...l, is_finalized: false, finalized_at: null } : l));
    if (todayLog.log_id === targetId) {
      setTodayLog(prev => ({ ...prev, is_finalized: false, finalized_at: null }));
    }
    toast("Outfit opened for editing. You can adjust your garments and re-finalize.");
  };

  const handleDeleteDailyLog = async (targetLogId?: number) => {
    const targetId = targetLogId || todayLog.log_id;
    await closetService.deleteDailyLog(targetId);
    setDailyLogs(prev => prev.filter(l => l.log_id !== targetId));
    toast("Outfit record cleared.");
  };

  const handleCreateDailyLog = async (dateStr: string, title: string) => {
    const activeUid = currentUser?.user_id;
    const newLog = await closetService.createDailyLog(dateStr, title, activeUid);
    setDailyLogs(prev => [newLog, ...prev.filter(l => l.log_id !== newLog.log_id)]);
    toast(`Created new outfit record: ${title}`);
    return newLog;
  };

  const handleSimulateMidnight = async () => {
    await closetService.simulateMidnightFinalization();
    toast("🕛 00:00 Midnight Job Simulated: Outfit locked & wear counts incremented!");
  };

  const handleAcceptFriendRequest = async (requestId: number, senderName?: string) => {
    await friendsService.respondToRequest(requestId, 'accepted');
    toast(`Connected with ${senderName || 'friend'}!`);
    await loadData();
  };

  const handleRejectFriendRequest = async (requestId: number) => {
    await friendsService.respondToRequest(requestId, 'rejected');
    toast('Friend request declined.');
    await loadData();
  };

  const handleRemoveFriend = (friendId: string, friendName?: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Friend?',
      message: `Are you sure you want to remove ${friendName || 'this friend'} from your friends list? You will no longer be able to view their closet or borrow their clothes.`,
      confirmLabel: 'Remove Friend',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        await friendsService.removeFriend(friendId);
        toast(`Removed ${friendName || 'friend'} from your friends list.`);
        await loadData();
      }
    });
  };

  const handleSubmitBorrow = async (itemId: number, fromDate: string, toDate: string) => {
    if (borrowContext?.garment) {
      mockDatabase.upsertClothingItem(borrowContext.garment);
    }
    await friendsService.requestBorrow(itemId, fromDate, toDate);
    setBorrowContext(null);
    setView('requests');
    await loadData();
    toast('Borrow request sent to lender!');
  };

  const handleCancelBorrow = (borrowId: number, startDate: string) => {
    const doCancel = async () => {
      await friendsService.updateBorrowStatus(borrowId, 'Rejected');
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      toast('Borrow request cancelled.');
      await loadData();
    };

    if (new Date(startDate) > new Date()) {
      setConfirmDialog({
        isOpen: true,
        title: 'Cancel Borrow Request?',
        message: 'Your upcoming borrow reservation will be cancelled. Continue?',
        onConfirm: doCancel
      });
    } else {
      doCancel();
    }
  };

  const handleRespondBorrow = async (borrowId: number, newStatus: 'Accepted' | 'Rejected' | 'Returned') => {
    await friendsService.updateBorrowStatus(borrowId, newStatus);
    if (newStatus === 'Accepted') {
      toast('Borrow request accepted! Garment is now marked as borrowed.');
    } else if (newStatus === 'Returned') {
      toast('Item marked as returned! Garment is back in your closet.');
    } else {
      toast('Borrow request declined.');
    }
    await loadData();
  };

  const handleDeleteAccount = () => {
    if (!currentUser) return;
    const targetUser = currentUser;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Account & Closet Data?',
      message: 'This will permanently remove your user profile, digitized garments, outfit logs, and BSAS assessment history. This action cannot be undone. To confirm, please type "DELETE" below.',
      confirmLabel: 'Delete Account',
      requiredConfirmText: 'DELETE',
      onConfirm: async () => {
        try {

          await closetService.deleteUserAccount(targetUser.user_id, targetUser.email);

          const supabase = getSupabase();
          if (supabase) {
            await supabase.auth.signOut().catch(() => { });
          }

          mockDatabase.setCurrentUserId(null);
          safeStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
          safeStorage.removeItem(STORAGE_KEY_ACTIVE_VIEW);
          safeStorage.removeItem('reapparel_user_id');

          setCurrentUser(null);
          setView('login');
          setGarments([]);
          setAssessments([]);
          setFriends([]);
          setFriendRequests([]);
          setBorrows([]);
          setNotifications([]);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          toast('Account and wardrobe data permanently erased. You may register again anytime.');
        } catch (err) {
          console.error('Account deletion error:', err);
          toast('Error deleting account: ' + (err instanceof Error ? err.message : 'Please try again.'));
        }
      }
    });
  };

  const handleClearNotifications = () => {
    if (currentUser) {
      friendsService.clearNotifications(currentUser.user_id);
      setNotifications([]);
      toast('Notifications cleared');
    }
  };

  const handleDeleteNotification = (notifId: string) => {
    friendsService.deleteNotification(notifId);
    if (currentUser) {
      setNotifications(friendsService.getNotifications(currentUser.user_id));
    }
  };

  const handleMarkNotificationRead = (notifId: string) => {
    friendsService.markNotificationAsRead(notifId);
    if (currentUser) {
      setNotifications(friendsService.getNotifications(currentUser.user_id));
    }
  };

  const pendingFriendsCount = friendRequests.filter(
    r => currentUser && r.receiver_id === currentUser.user_id && r.status === 'pending'
  ).length;

  const pendingBorrowsCount = borrows.filter(
    b => currentUser &&
      (b.lender?.user_id === currentUser.user_id || b.item?.user_id === currentUser.user_id) &&
      b.status === 'Pending'
  ).length;

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  if (isAuthInitializing) {
    return (
      <div className="center-shell" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{
            width: 32,
            height: 32,
            border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            margin: '0 auto 12px',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ margin: 0, fontSize: 13 }}>Restoring your wardrobe...</p>
        </div>
      </div>
    );
  }

  if (view === 'login' || !currentUser) {
    return (
      <>
        {toastMessage && <div className="toast">{toastMessage}</div>}
        <AuthView onLoginSuccess={handleLoginSuccess} toast={toast} />
      </>
    );
  }

  if (view === 'bsasIntro') {
    return (
      <>
        {toastMessage && <div className="toast">{toastMessage}</div>}
        <BSASIntroView
          onStartAssessment={() => setView('bsas')}
        />
      </>
    );
  }

  if (view === 'bsas') {
    return (
      <>
        {toastMessage && <div className="toast">{toastMessage}</div>}
        <BSASAssessmentModal
          onComplete={handleCompleteBSAS}
          onCancel={() => setView('closet')}
        />
      </>
    );
  }

  const latestAssessment = assessments.length > 0
    ? [...assessments].sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime())[0]
    : null;
  const isBSASDue = !latestAssessment || (
    Math.floor((Date.now() - new Date(latestAssessment.taken_at).getTime() + simulatedDaysOffset * 86400000) / 86400000) >= 30
  );

  return (
    <div className="shell">

      {toastMessage && <div className="toast">{toastMessage}</div>}

      <Sidebar
        currentView={view}
        isOpen={isMobileSidebarOpen}
        currentUser={currentUser}
        pendingBorrowsCount={pendingBorrowsCount}
        pendingFriendsCount={pendingFriendsCount}
        unreadNotificationsCount={unreadNotificationsCount}
        isBSASDue={isBSASDue}
        onSelectView={(viewId) => { setView(viewId); setIsMobileSidebarOpen(false); }}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onLogout={handleLogout}
        onOpenDatabase={() => setIsDatabaseModalOpen(true)}
      />

      <div className="main">

        <Header
          currentView={view}
          theme={theme}
          currentUser={currentUser}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onToggleTheme={toggleTheme}
          onNavigateToProfile={() => setView('profile')}
        />

        <div className="content">
          {view === 'closet' && (
            <VirtualClosetView
              garments={garments}
              onOpenAddModal={() => setIsAddGarmentOpen(true)}
              onEditGarment={(g) => setEditingGarment(g)}
              onDeleteGarment={(g) => setDeletingGarment(g)}
              onNavigateToRecovery={() => setView('recovery')}
              toast={toast}
            />
          )}

          {view === 'daily-log' && (
            <DailyLogView
              todayLog={todayLog}
              dailyLogs={dailyLogs}
              closetGarments={garments}
              onToggleGarmentInOutfit={handleToggleGarmentInOutfit}
              onFinalizeLog={handleFinalizeDailyLog}
              onDeleteLog={handleDeleteDailyLog}
              onEditLog={handleEditDailyLog}
              onCreateNewOutfit={handleCreateDailyLog}
              onNavigateToCloset={() => setView('closet')}
              toast={toast}
            />
          )}

          {view === 'recovery' && (
            <RecoveryView
              currentUser={currentUser}
              assessments={assessments}
              garments={garments}
              borrows={borrows}
              simulatedDaysOffset={simulatedDaysOffset}
              onSimulateCooldownAdvance={() => {
                setSimulatedDaysOffset(prev => prev + 30);
                toast('⏩ Advanced simulation time by 30 days! Check-in unlocked.');
              }}
              onStartRetakeAssessment={() => setView('bsas')}
              onNavigateToCloset={() => setView('closet')}
              onNavigateToDailyLog={() => setView('daily-log')}
              onNavigateToStatistics={() => setView('closet-statistics')}
              onEditGarment={(g) => setEditingGarment(g)}
              onOpenAddGarment={() => setIsAddGarmentOpen(true)}
            />
          )}

          {view === 'closet-statistics' && (
            <ClosetStatisticsView
              garments={garments}
              onNavigateToRecovery={() => setView('recovery')}
              onNavigateToCloset={() => setView('closet')}
            />
          )}

          {view === 'notifications' && currentUser && (
            <NotificationsView
              currentUser={currentUser}
              borrows={borrows}
              friendRequests={friendRequests}
              notifications={notifications}
              onAcceptBorrow={(borrowId) => handleRespondBorrow(borrowId, 'Accepted')}
              onDenyBorrow={(borrowId) => handleRespondBorrow(borrowId, 'Rejected')}
              onAcceptFriend={(requestId) => handleAcceptFriendRequest(requestId)}
              onDenyFriend={(requestId) => handleRejectFriendRequest(requestId)}
              onNavigateToRequests={() => setView('requests')}
              onClearNotifications={handleClearNotifications}
              onDeleteNotification={handleDeleteNotification}
              onMarkNotificationRead={handleMarkNotificationRead}
            />
          )}

          {view === 'requests' && (
            <LendingDashboardView
              currentUser={currentUser}
              borrows={borrows}
              onCancelBorrow={handleCancelBorrow}
              onRespondBorrow={handleRespondBorrow}
              onNavigateToFriends={() => setView('friends')}
              toast={toast}
            />
          )}

          {view === 'friends' && (
            <FriendsView
              currentUser={currentUser}
              friends={friends}
              friendRequests={friendRequests}
              onAcceptFriendRequest={handleAcceptFriendRequest}
              onRejectFriendRequest={handleRejectFriendRequest}
              onRemoveFriend={handleRemoveFriend}
              onInitiateBorrow={(friend, item) => {
                const isBorrowed = item.status === 'Borrowed' ||
                  item.is_active === false ||
                  item.tags?.some(t => (typeof t === 'string' ? t : t.tag_name) === 'Borrowed');
                if (isBorrowed) {
                  toast('This garment is currently borrowed or inactive and cannot be requested.');
                  return;
                }
                setBorrowContext({ friend, garment: item });
              }}
              onRefreshData={loadData}
              toast={toast}
            />
          )}

          {view === 'donations' && (
            <div>
              <DonationMapSection
                opportunities={opportunities}
                currentUserLocation={null}
                onRefreshData={() => loadData({ forceDonations: true })}
                toast={toast}
                highlightId={donHighlight}
                setHighlightId={setDonHighlight}
                currentUser={currentUser}
              />
            </div>
          )}

          {view === 'profile' && currentUser && (
            <ProfileView
              currentUser={currentUser}
              allUsers={allUsers}
              garments={garments}
              borrows={borrows}
              assessments={assessments}
              friendsCount={friends.length}
              onSwitchUser={handleSwitchUser}
              onDeleteAccount={handleDeleteAccount}
              onLogout={handleLogout}
              onNavigateToView={(v) => setView(v)}
              onStartRetakeAssessment={() => setView('bsas')}
              toast={toast}
            />
          )}

          {view === 'settings' && (
            <SettingsView
              theme={theme}
              onToggleTheme={toggleTheme}
              onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
              onDeleteAccount={handleDeleteAccount}
              toast={toast}
            />
          )}
        </div>

        <footer className="app-footer">
          <div>
            <strong style={{ fontFamily: 'var(--font-display)' }}>ReApparel</strong>
            <div style={{ marginTop: 2 }}>
              A mindful home for your closet &middot; Responsible consumption &amp; circular fashion.
            </div>
          </div>
          <span style={{ color: 'var(--text-muted)' }}>
            Mindful Wardrobe &middot; Shopping Recovery
          </span>
        </footer>
      </div>

      <AddItemModal
        isOpen={isAddGarmentOpen}
        onClose={() => setIsAddGarmentOpen(false)}
        userId={currentUser?.user_id || ''}
        onAddItem={handleAddGarment}
        toast={toast}
      />

      <EditItemModal
        garment={editingGarment}
        isOpen={Boolean(editingGarment)}
        onClose={() => setEditingGarment(null)}
        onUpdateItem={handleUpdateGarment}
        toast={toast}
      />

      <DeleteCascadeModal
        garment={deletingGarment}
        isOpen={Boolean(deletingGarment)}
        onClose={() => setDeletingGarment(null)}
        onConfirmDelete={handleConfirmDeleteGarment}
      />

      <BorrowModal
        isOpen={Boolean(borrowContext)}
        onClose={() => setBorrowContext(null)}
        garment={borrowContext?.garment || null}
        friend={borrowContext?.friend || null}
        existingBorrows={borrows}
        onSubmitBorrow={handleSubmitBorrow}
        toast={toast}
      />

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        requiredConfirmText={confirmDialog.requiredConfirmText}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      <DatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        onConfigUpdated={loadData}
        toast={toast}
      />

      {isBSASDue && assessments.length > 0 && view !== 'bsas' && (
        <div className="modalScrim" style={{ zIndex: 1100, background: 'rgba(0, 0, 0, 0.75)' }}>
          <div className="modal" style={{ maxWidth: 520, width: '100%', textAlign: 'center', padding: 28, borderRadius: 16 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--primary-soft, rgba(5, 150, 105, 0.15))',
              color: 'var(--primary, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <BrainCircuit style={{ width: 32, height: 32 }} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontFamily: 'var(--font-display)' }}>
              Mandatory Monthly BSAS Retake Due
            </h3>

            <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>
              Your previous BSAS assessment was completed over <strong>30 days ago</strong>. A mandatory monthly retake is required to assess your current shopping habits before normal access is granted.
            </p>

            <div style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              fontSize: 12.5,
              color: 'var(--text-muted)',
              marginBottom: 20,
              textAlign: 'left'
            }}>
              <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Notice:</strong>
              The BSAS assessment is required to be retaken before normal access to your virtual closet, friend sharing, and logging is granted.
            </div>

            <button
              type="button"
              className="btn btn-p"
              style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 600, justifyContent: 'center', borderRadius: 24 }}
              onClick={() => setView('bsas')}
            >
              Take Mandatory BSAS Assessment Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
