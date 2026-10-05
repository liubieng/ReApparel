import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  mockDatabase, 
  getSupabase,
  getStoredSupabaseConfig, 
  safeStorage, 
  STORAGE_KEY_ACTIVE_USER, 
  STORAGE_KEY_ACTIVE_VIEW 
} from './services/supabaseClient';
import { closetService } from './services/closetService';
import { friendsService } from './services/friendsService';
import { mapsService } from './services/mapsService';

// Data models
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

// Modular view components
import { AuthView } from './views/AuthView';
import { BSASIntroView } from './views/BSASIntroView';
import { VirtualClosetView } from './views/VirtualClosetView';
import { DailyLogView } from './views/DailyLogView';
import { RecoveryView } from './views/RecoveryView';
import { FriendsView } from './views/FriendsView';
import { LendingDashboardView } from './views/LendingDashboardView';
import { ProfileView } from './views/ProfileView';
import { SettingsView } from './views/SettingsView';
import { DonationMapSection } from './views/DonationMapSection';
import { NotificationsView } from './views/NotificationsView';
import { ClosetStatisticsView } from './views/ClosetStatisticsView';

// Layout & Modal dialog components
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { BSASAssessmentModal } from './components/modals/BSASAssessmentModal';
import { AddItemModal } from './components/modals/AddItemModal';
import { EditItemModal } from './components/modals/EditItemModal';
import { BorrowModal } from './components/modals/BorrowModal';
import { DeleteCascadeModal } from './components/modals/DeleteCascadeModal';
import { ConfirmModal } from './components/modals/ConfirmModal';
import { DatabaseModal } from './components/modals/DatabaseModal';
import { BrainCircuit } from 'lucide-react';

/**
 * ============================================================================
 * REAPPAREL ROOT APPLICATION CONTROLLER (App.tsx)
 * ============================================================================
 * 
 * CAPSTONE DEFENSE ARCHITECTURE:
 * - Implements a Modular Single Page Architecture (SPA) in React 19 + TypeScript.
 * - Coordinates global state, data synchronization, and view routing across:
 *   1. Auth & Onboarding (AuthView, BSASIntroView, BSASAssessmentModal)
 *   2. Virtual Wardrobe & Wear Maximization (VirtualClosetView, AddItemModal, EditItemModal)
 *   3. Daily Outfit Tracking & Midnight Cron Finalization (DailyLogView)
 *   4. Longitudinal BSAS Recovery Tracking & Analytics (RecoveryView)
 *   5. Peer-to-Peer Garment Lending with Conflict Guard (FriendsView, BorrowModal, LendingDashboardView)
 *   6. Community Clothing Donation Drives & Geolocation (DonationMapSection)
 *   7. Hybrid Storage Orchestration (mockDatabase <-> Supabase PostgreSQL)
 */

// Valid authenticated view routes
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
  // Theme State (Persisted in localStorage)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (safeStorage.getItem('reapparel_theme') as 'light' | 'dark') || 'light';
  });

  // Current Active Route / View (Persisted in localStorage across page reloads)
  const [view, setView] = useState<string>(() => {
    const user = mockDatabase.getCurrentUser();
    const hasActiveId = Boolean(safeStorage.getItem(STORAGE_KEY_ACTIVE_USER));
    // If no user is logged in, start on login view
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

  // Core Entity State
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
    log_date: new Date().toISOString().slice(0, 10),
    is_finalized: false,
    finalized_at: null,
    items: []
  });
  const [dailyLogs, setDailyLogs] = useState<DailyClothingLog[]>([]);

  // Presentation Simulation State (Allows defense panel to advance 30 days instantly)
  const [simulatedDaysOffset, setSimulatedDaysOffset] = useState<number>(0);

  // Modal Dialog States
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
    onConfirm: () => {}
  });

  // Lightweight Toast Notification System
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Synchronize CSS Theme Variable
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    safeStorage.setItem('reapparel_theme', theme);
  }, [theme]);

  // Synchronize Active View State in LocalStorage
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

  // Synchronous Local State Hydration (0ms, 0 Supabase network queries)
  const syncLocalState = useCallback(() => {
    const user = mockDatabase.getCurrentUser();
    setCurrentUser(user);
    setAllUsers(mockDatabase.getAllUsers());

    if (user) {
      setGarments(mockDatabase.getClothingItems(user.user_id));
      setAssessments(mockDatabase.getAssessments(user.user_id));
      setTodayLog(mockDatabase.getTodayLog(new Date().toISOString().slice(0, 10)));
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

  // Master Data Refresh Callback (targeted remote sync to minimize Supabase API usage)
  const loadData = useCallback(async (options?: { forceDonations?: boolean }) => {
    let user = mockDatabase.getCurrentUser();
    if (!user && safeStorage.getItem(STORAGE_KEY_ACTIVE_USER)) {
      user = await mockDatabase.syncCurrentUserWithSupabase();
    }
    setCurrentUser(user);
    setIsAuthInitializing(false);
    setAllUsers(mockDatabase.getAllUsers());

    if (user) {
      // 1. Immediate synchronous local hydration (0ms UI latency)
      syncLocalState();

      // Ensure authenticated users are transitioned away from the login screen
      setView(prev => {
        if (prev === 'login') {
          const saved = safeStorage.getItem(STORAGE_KEY_ACTIVE_VIEW);
          const safeSaved = (saved === 'bsas' || saved === 'bsasIntro') ? 'closet' : saved;
          return (safeSaved && VALID_VIEWS.has(safeSaved)) ? safeSaved : 'closet';
        }
        return prev;
      });

      // 2. Targeted background remote fetch with strict timeouts (does not freeze local UI)
      try {
        const fetchPromises: Promise<any>[] = [
          closetService.getItems(user.user_id).catch(() => mockDatabase.getClothingItems(user.user_id)),
          closetService.getAssessments(user.user_id).catch(() => mockDatabase.getAssessments(user.user_id)),
          friendsService.fetchAndMergeUsersFromSupabase().catch(() => {})
        ];

        // DEMO-SAFE DONATION FETCHING:
        // Only fetch donation drives from Supabase when explicitly requested,
        // or on initial boot / when on donations view to save ~80% of unnecessary map queries
        if (options?.forceDonations || view === 'donations') {
          fetchPromises.push(mapsService.fetchAndMergeFromSupabase().catch(() => {}));
        }

        const [items, userAssessments] = await Promise.all(fetchPromises);

        if (items) setGarments(items);
        if (userAssessments) setAssessments(userAssessments);
        setAllUsers(mockDatabase.getAllUsers());
        setFriends(friendsService.getConnectedFriends());
        setOpportunities(mapsService.getDonationOpportunities());
      } catch {
        // Local data is already fully rendered
      }
    } else {
      if (safeStorage.getItem(STORAGE_KEY_ACTIVE_USER)) {
        mockDatabase.setCurrentUserId(null);
      }
      safeStorage.removeItem(STORAGE_KEY_ACTIVE_VIEW);
      setView('login');
      setGarments(mockDatabase.getClothingItems());
      setAssessments(mockDatabase.getAssessments());
      setTodayLog(mockDatabase.getTodayLog(new Date().toISOString().slice(0, 10)));
      setFriends([]);
      setFriendRequests([]);
      setBorrows([]);
      setNotifications([]);
    }
  }, [syncLocalState, view]);

  // Subscribe to In-Memory state changes (updates UI with 0 network overhead)
  useEffect(() => {
    loadData();
    const unsubscribe = mockDatabase.subscribe(() => {
      syncLocalState();
    });
    return () => unsubscribe();
  }, [loadData, syncLocalState]);

  // Always fetch fresh donation drives directly from Supabase when opening the Donations view
  useEffect(() => {
    if (view === 'donations') {
      mapsService.fetchAndMergeFromSupabase().then(() => {
        setOpportunities(mapsService.getDonationOpportunities());
      }).catch(() => {});

      // Auto-poll every 10 seconds so new community drives appear automatically without page refresh
      const pollTimer = setInterval(() => {
        mapsService.fetchAndMergeFromSupabase().then(() => {
          setOpportunities(mapsService.getDonationOpportunities());
        }).catch(() => {});
      }, 10000);

      return () => clearInterval(pollTimer);
    }
  }, [view]);

  // Supabase Realtime Listener for Live Capstone Demonstration:
  // When any device adds a donation opportunity, other devices update their map automatically
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const channel = supabase
        .channel('realtime_community_donations')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'donation_opportunity' },
          async () => {
            await mapsService.fetchAndMergeFromSupabase();
            setOpportunities(mapsService.getDonationOpportunities());
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {}
  }, []);

  // --------------------------------------------------------------------------
  // USER ACTIONS & HANDLERS
  // --------------------------------------------------------------------------

  // Authentication Success
  const handleLoginSuccess = (user: User, isNewUser: boolean) => {
    setCurrentUser(user);
    loadData();
    if (isNewUser) {
      setView('bsasIntro'); // New users complete baseline check-in
    } else {
      const saved = safeStorage.getItem(STORAGE_KEY_ACTIVE_VIEW);
      const safeSaved = (saved === 'bsas' || saved === 'bsasIntro') ? 'closet' : saved;
      const targetView = (safeSaved && VALID_VIEWS.has(safeSaved) && safeSaved !== 'login') ? safeSaved : 'closet';
      setView(targetView);
    }
  };

  // Switch Active User (Fast toggle for panel demonstration)
  const handleSwitchUser = async (userId: string) => {
    mockDatabase.setCurrentUserId(userId);
    await loadData();
    const user = mockDatabase.getCurrentUser();
    toast(`Active profile switched to ${user?.first_name} ${user?.last_name}`);
  };

  // Logout Flow
  const handleLogout = () => {
    mockDatabase.setCurrentUserId(null);
    safeStorage.removeItem(STORAGE_KEY_ACTIVE_VIEW);
    setCurrentUser(null);
    setView('login');
    toast('Logged out successfully.');
  };

  // BSAS Check-In Completed
  const handleCompleteBSAS = async (score: number, breakdown: NonNullable<BSASAssessment['breakdown']>, targetView: 'closet' | 'recovery' = 'closet') => {
    const activeUid = currentUser?.user_id || mockDatabase.getCurrentUser()?.user_id || mockDatabase.getAllUsers()[0]?.user_id || '';
    
    // 1. Immediately transition the view so user NEVER gets stuck on BSAS page
    safeStorage.setItem(STORAGE_KEY_ACTIVE_VIEW, targetView);
    setView(targetView);

    // 2. Submit assessment to database (synchronous local update + non-blocking background sync)
    await closetService.submitAssessment(score, breakdown, activeUid);

    // 3. Immediately update assessments in React state so latestAssessment & isBSASDue are fresh
    const freshAssessments = mockDatabase.getAssessments(activeUid);
    setAssessments(freshAssessments);

    toast(score >= 4 ? 'Check-in saved: Indicative risk identified' : 'Check-in saved: Non-Indicative risk level');

    // 4. Background refresh of any other collections without blocking
    loadData().catch(() => {});
  };

  // Garment Management: Add, Edit, Delete, Quick Wear Increment
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

  // Daily Outfit Log Handlers
  const handleToggleGarmentInOutfit = async (garment: ClothingItem, targetLogId?: number) => {
    const targetId = targetLogId || todayLog.log_id;
    const targetLog = dailyLogs.find(l => l.log_id === targetId) || todayLog;
    if (targetLog.is_finalized) {
      toast("This outfit record is already locked & finalized.");
      return;
    }
    const current = targetLog.items || [];
    const exists = current.some(i => i.item_id === garment.item_id);
    const updated = exists 
      ? current.filter(i => i.item_id !== garment.item_id)
      : [...current, garment];

    await closetService.updateTodayItems(targetId, updated);
    await loadData();
    toast(exists ? `Removed ${garment.name} from outfit` : `Added ${garment.name} to outfit`);
  };

  const handleFinalizeDailyLog = async (targetLogId?: number) => {
    const targetId = targetLogId || todayLog.log_id;
    await closetService.finalizeDailyLog(targetId);
    await loadData();
    toast("Outfit finalized! Cumulative wear counts updated.");
  };

  const handleEditDailyLog = async (targetLogId?: number) => {
    const targetId = targetLogId || todayLog.log_id;
    await closetService.unlockDailyLogForEditing(targetId);
    await loadData();
    toast("Outfit opened for editing. You can adjust your garments and re-finalize.");
  };

  const handleDeleteDailyLog = async (targetLogId?: number) => {
    const targetId = targetLogId || todayLog.log_id;
    await closetService.deleteDailyLog(targetId);
    await loadData();
    toast("Outfit record cleared.");
  };

  const handleCreateDailyLog = async (dateStr: string, title: string) => {
    const newLog = await closetService.createDailyLog(dateStr, title);
    await loadData();
    toast(`Created new outfit record: ${title}`);
    return newLog;
  };

  const handleSimulateMidnight = async () => {
    await closetService.simulateMidnightFinalization();
    await loadData();
    toast("🕛 00:00 Midnight Job Simulated: Outfit locked & wear counts incremented!");
  };

  // Friend Request Actions
  const handleAcceptFriendRequest = async (requestId: number, senderName?: string) => {
    friendsService.respondToRequest(requestId, 'accepted');
    toast(`Connected with ${senderName || 'friend'}!`);
    await loadData();
  };

  const handleRejectFriendRequest = async (requestId: number) => {
    friendsService.respondToRequest(requestId, 'rejected');
    toast('Friend request declined.');
    await loadData();
  };

  // Borrow Request & Lending Actions
  const handleSubmitBorrow = (itemId: number, fromDate: string, toDate: string) => {
    friendsService.requestBorrow(itemId, fromDate, toDate);
    setBorrowContext(null);
    setView('requests');
    loadData();
  };

  const handleCancelBorrow = (borrowId: number, startDate: string) => {
    const doCancel = () => {
      friendsService.updateBorrowStatus(borrowId, 'Rejected');
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      toast('Borrow request cancelled.');
      loadData();
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

  const handleRespondBorrow = (borrowId: number, newStatus: 'Accepted' | 'Rejected' | 'Returned') => {
    friendsService.updateBorrowStatus(borrowId, newStatus);
    if (newStatus === 'Accepted') {
      toast('Borrow request accepted! Loan schedule active.');
    } else if (newStatus === 'Returned') {
      toast('Item marked as returned! Garment is back in your closet.');
    } else {
      toast('Borrow request declined.');
    }
    loadData();
  };

  // Account Deletion Safeguard with confirmation dialog (TC_ACCDEL_02, TC_ACCDEL_03, Figure 34.4)
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
          mockDatabase.setCurrentUserId(null);
          safeStorage.removeItem(STORAGE_KEY_ACTIVE_VIEW);
          setCurrentUser(null);
          setView('login');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          toast('Account and wardrobe data permanently erased. You may register again anytime.');
        } catch (err) {
          console.error('Account deletion error:', err);
          toast('Error deleting account: ' + (err instanceof Error ? err.message : 'Please try again.'));
        }
      }
    });
  };

  // Notification Management Handlers
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

  // Pending Counts for Nav Badges
  const pendingFriendsCount = friendRequests.filter(
    r => currentUser && r.receiver_id === currentUser.user_id && r.status === 'pending'
  ).length;

  const pendingBorrowsCount = borrows.filter(
    b => currentUser && 
      (b.lender?.user_id === currentUser.user_id || b.item?.user_id === currentUser.user_id) && 
      b.status === 'Pending'
  ).length;

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // --------------------------------------------------------------------------
  // STANDALONE / ONBOARDING SCREENS
  // --------------------------------------------------------------------------

  // 0. Session Initializing Screen (prevents flicker of login view during active session hydration)
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

  // 1. Auth View
  if (view === 'login' || !currentUser) {
    return (
      <>
        {toastMessage && <div className="toast">{toastMessage}</div>}
        <AuthView onLoginSuccess={handleLoginSuccess} toast={toast} />
      </>
    );
  }

  // 2. BSAS Onboarding Intro View
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

  // 3. BSAS 7-Item Diagnostic Stepper Modal
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

  // 30-Day BSAS Assessment Cooldown & Notification Status
  // Sort to get the most-recently taken assessment (highest taken_at date)
  const latestAssessment = assessments.length > 0
    ? [...assessments].sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime())[0]
    : null;
  const isBSASDue = !latestAssessment || (
    Math.floor((Date.now() - new Date(latestAssessment.taken_at).getTime() + simulatedDaysOffset * 86400000) / 86400000) >= 30
  );

  // --------------------------------------------------------------------------
  // MAIN APPLICATION LAYOUT (SIDEBAR + ACTIVE VIEW ROUTER)
  // --------------------------------------------------------------------------
  return (
    <div className="shell">
      {/* Toast Notification */}
      {toastMessage && <div className="toast">{toastMessage}</div>}

      {/* Desktop / Mobile Sidebar */}
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

      {/* Main Viewport */}
      <div className="main">
        {/* Mobile & Desktop Top Header with User Chip */}
        <Header
          currentView={view}
          theme={theme}
          currentUser={currentUser}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onToggleTheme={toggleTheme}
          onNavigateToProfile={() => setView('profile')}
        />

        {/* View Router */}
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

        {/* Global Footer */}
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

      {/* ================= MODAL DIALOGS ================= */}

      {/* 1. Add Clothing Item Modal */}
      <AddItemModal
        isOpen={isAddGarmentOpen}
        onClose={() => setIsAddGarmentOpen(false)}
        userId={currentUser?.user_id || ''}
        onAddItem={handleAddGarment}
        toast={toast}
      />

      {/* 2. Edit Clothing Item Modal */}
      <EditItemModal
        garment={editingGarment}
        isOpen={Boolean(editingGarment)}
        onClose={() => setEditingGarment(null)}
        onUpdateItem={handleUpdateGarment}
        toast={toast}
      />

      {/* 3. Delete Cascade Confirmation Modal */}
      <DeleteCascadeModal
        garment={deletingGarment}
        isOpen={Boolean(deletingGarment)}
        onClose={() => setDeletingGarment(null)}
        onConfirmDelete={handleConfirmDeleteGarment}
      />

      {/* 4. Peer-to-Peer Borrow Modal */}
      <BorrowModal
        isOpen={Boolean(borrowContext)}
        onClose={() => setBorrowContext(null)}
        garment={borrowContext?.garment || null}
        friend={borrowContext?.friend || null}
        existingBorrows={borrows}
        onSubmitBorrow={handleSubmitBorrow}
        toast={toast}
      />

      {/* 5. General Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        requiredConfirmText={confirmDialog.requiredConfirmText}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* 6. Database / Supabase Schema Modal */}
      <DatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        onConfigUpdated={loadData}
        toast={toast}
      />

      {/* Mandatory Monthly BSAS Retake Overlay / Restriction (TC_RET_01, TC_RET_02) */}
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
