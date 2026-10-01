import React, { useState, useEffect, useCallback, useRef } from 'react';
import { mockDatabase, getStoredSupabaseConfig } from './services/supabaseClient';
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
  DonationOpportunity 
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
 *   6. Geolocation Textile Drop-off & Scraping (DonationMapSection)
 *   7. Hybrid Storage Orchestration (mockDatabase <-> Supabase PostgreSQL)
 */

export default function App() {
  // Theme State (Persisted in localStorage)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('reapparel_theme') as 'light' | 'dark') || 'light';
  });

  // Current Active Route / View
  const [view, setView] = useState<string>('login');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core Entity State
  const [currentUser, setCurrentUser] = useState<User | null>(mockDatabase.getCurrentUser());
  const [allUsers, setAllUsers] = useState<User[]>(mockDatabase.getAllUsers());
  const [garments, setGarments] = useState<ClothingItem[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
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
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
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
    localStorage.setItem('reapparel_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Master Data Refresh Callback
  const loadData = useCallback(async () => {
    const user = mockDatabase.getCurrentUser();
    setCurrentUser(user);
    setAllUsers(mockDatabase.getAllUsers());

    if (user) {
      const items = await closetService.getItems(user.user_id);
      setGarments(items);

      const userAssessments = await closetService.getAssessments(user.user_id);
      setAssessments(userAssessments);

      const log = await closetService.getTodayLog();
      setTodayLog(log);

      setFriends(friendsService.getConnectedFriends());
      setFriendRequests(friendsService.getFriendRequests());
      setBorrows(friendsService.getBorrows());
    } else {
      const items = await closetService.getItems();
      setGarments(items);
      const userAssessments = await closetService.getAssessments();
      setAssessments(userAssessments);
      const log = await closetService.getTodayLog();
      setTodayLog(log);
      setFriends([]);
      setFriendRequests([]);
      setBorrows([]);
    }
    const allLogs = await closetService.getDailyLogs();
    setDailyLogs(allLogs);
    setOpportunities(mapsService.getDonationOpportunities());
  }, []);

  // Subscribe to In-Memory / Supabase state changes
  useEffect(() => {
    loadData();
    const unsubscribe = mockDatabase.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData]);

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
      setView('closet');
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
    setCurrentUser(null);
    setView('login');
    toast('Logged out successfully.');
  };

  // BSAS Check-In Completed
  const handleCompleteBSAS = async (score: number, breakdown: NonNullable<BSASAssessment['breakdown']>) => {
    const activeUid = currentUser?.user_id || mockDatabase.getCurrentUser()?.user_id || 'a0000000-0000-0000-0000-000000000001';
    await closetService.submitAssessment(score, breakdown, activeUid);
    await loadData();
    toast(score >= 4 ? 'Check-in saved: Indicative risk identified' : 'Check-in saved: Non-Indicative risk level');
    setView('recovery');
  };

  // Garment Management: Add, Edit, Delete, Quick Wear Increment
  const handleAddGarment = async (item: Omit<ClothingItem, 'item_id' | 'wear_count' | 'date_added'>) => {
    const activeUid = item.user_id || currentUser?.user_id || mockDatabase.getCurrentUser()?.user_id || 'a0000000-0000-0000-0000-000000000001';
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
  const handleToggleGarmentInOutfit = async (garment: ClothingItem) => {
    if (todayLog.is_finalized) {
      toast("Today's outfit is already locked & finalized.");
      return;
    }
    const current = todayLog.items || [];
    const exists = current.some(i => i.item_id === garment.item_id);
    const updated = exists 
      ? current.filter(i => i.item_id !== garment.item_id)
      : [...current, garment];

    await closetService.updateTodayItems(todayLog.log_id, updated);
    await loadData();
    toast(exists ? `Removed ${garment.name} from today's outfit` : `Added ${garment.name} to today's outfit`);
  };

  const handleFinalizeDailyLog = async () => {
    await closetService.finalizeDailyLog(todayLog.log_id);
    await loadData();
    toast("Outfit finalized! Cumulative wear counts updated.");
  };

  const handleDeleteDailyLog = async () => {
    await closetService.deleteDailyLog(todayLog.log_id);
    await loadData();
    toast("Today's outfit log cleared.");
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

  // Account Deletion Safeguard with confirmation dialog
  const handleDeleteAccount = () => {
    if (!currentUser) return;
    const targetUser = currentUser;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Account & Closet Data?',
      message: 'This will permanently remove your user profile, digitized garments, outfit logs, and BSAS assessment history. This action cannot be undone. Are you sure you wish to proceed?',
      onConfirm: async () => {
        try {
          await closetService.deleteUserAccount(targetUser.user_id, targetUser.email);
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

  // Pending Counts for Nav Badges
  const pendingFriendsCount = friendRequests.filter(
    r => currentUser && r.receiver_id === currentUser.user_id && r.status === 'pending'
  ).length;

  const pendingBorrowsCount = borrows.filter(
    b => currentUser && 
      (b.lender?.user_id === currentUser.user_id || b.item?.user_id === currentUser.user_id) && 
      b.status === 'Pending'
  ).length;

  // --------------------------------------------------------------------------
  // STANDALONE / ONBOARDING SCREENS
  // --------------------------------------------------------------------------

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
          onSkipToCloset={() => setView('closet')}
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
  const latestAssessment = assessments[0];
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
        isBSASDue={isBSASDue}
        onSelectView={(viewId) => { setView(viewId); setIsMobileSidebarOpen(false); }}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onLogout={handleLogout}
        onOpenDatabase={() => setIsDatabaseModalOpen(true)}
      />

      {/* Main Viewport */}
      <div className="main">
        {/* Mobile Top Header */}
        <Header
          currentView={view}
          theme={theme}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onToggleTheme={toggleTheme}
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
              onSimulateMidnight={handleSimulateMidnight}
              onNavigateToCloset={() => setView('closet')}
              toast={toast}
            />
          )}

          {view === 'recovery' && (
            <RecoveryView
              assessments={assessments}
              garments={garments}
              simulatedDaysOffset={simulatedDaysOffset}
              onSimulateCooldownAdvance={() => {
                setSimulatedDaysOffset(prev => prev + 30);
                toast('⏩ Advanced simulation time by 30 days! Check-in unlocked.');
              }}
              onStartRetakeAssessment={() => setView('bsas')}
              onNavigateToCloset={() => setView('closet')}
              onNavigateToDailyLog={() => setView('daily-log')}
              onEditGarment={(g) => setEditingGarment(g)}
              onOpenAddGarment={() => setIsAddGarmentOpen(true)}
            />
          )}

          {view === 'requests' && (
            <LendingDashboardView
              currentUser={currentUser}
              borrows={borrows}
              onCancelBorrow={handleCancelBorrow}
              onRespondBorrow={handleRespondBorrow}
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
              onInitiateBorrow={(friend, item) => setBorrowContext({ friend, garment: item })}
              onRefreshData={loadData}
              toast={toast}
            />
          )}

          {view === 'donations' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontFamily: 'var(--font-display)' }}>
                  Donation Drop-Off Map &amp; Live Drives
                </h2>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {opportunities.length} drop-off hubs verified
                </span>
              </div>

              <DonationMapSection
                opportunities={opportunities}
                currentUserLocation={null}
                onRefreshData={loadData}
                toast={toast}
                highlightId={donHighlight}
                setHighlightId={setDonHighlight}
              />
            </div>
          )}

          {view === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              allUsers={allUsers}
              garments={garments}
              borrows={borrows}
              onSwitchUser={handleSwitchUser}
              onDeleteAccount={handleDeleteAccount}
              toast={toast}
            />
          )}

          {view === 'settings' && (
            <SettingsView
              theme={theme}
              onToggleTheme={toggleTheme}
              onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
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
    </div>
  );
}
