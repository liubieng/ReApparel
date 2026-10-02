import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  UserPlus, 
  Shirt, 
  ArrowLeft, 
  Search, 
  Plus, 
  SlidersHorizontal, 
  ArrowUpDown,
  UserCheck,
  Inbox
} from 'lucide-react';
import { User, FriendRequest, ClothingItem } from '../types/database';
import { friendsService } from '../services/friendsService';
import { closetService } from '../services/closetService';

/**
 * ============================================================================
 * FRIENDS & CIRCULAR CLOSET SHARING VIEW (FriendsView.tsx)
 * ============================================================================
 * 
 * Implements wireframe layouts from SDD Section III:
 * - Figure .10.1: Friends Page (Search input, Add '+', 'View All Closets', friend rows with 'View Closet')
 * - Figure .11.1: <Name of Friend>'s Closet (Filter bar, garment cards with tag pills & wide Borrow button)
 * - Figure .12.1: Friends Closets (All friends' garments with friend avatar badge in top right & Borrow button)
 */

interface FriendsViewProps {
  currentUser: User;
  friends: User[];
  friendRequests: FriendRequest[];
  onAcceptFriendRequest: (requestId: number, senderName?: string) => Promise<void>;
  onRejectFriendRequest: (requestId: number) => Promise<void>;
  onInitiateBorrow: (friend: User, garment: ClothingItem) => void;
  onRefreshData: () => Promise<void>;
  toast: (msg: string) => void;
}

interface ItemWithFriend extends ClothingItem {
  ownerFriend: User;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentUser,
  friends,
  friendRequests,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  onInitiateBorrow,
  onRefreshData,
  toast
}) => {
  // Navigation sub-view: 'list' (Fig 10.1), 'single-closet' (Fig 11.1), 'all-closets' (Fig 12.1)
  const [subView, setSubView] = useState<'list' | 'single-closet' | 'all-closets'>('list');
  const [viewingFriend, setViewingFriend] = useState<User | null>(null);

  // Search query for Friends list (Fig 10.1)
  const [searchFriendsQuery, setSearchFriendsQuery] = useState('');

  // Add friend dialog/modal
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Single friend closet state
  const [friendGarments, setFriendGarments] = useState<ClothingItem[]>([]);
  const [isLoadingSingleCloset, setIsLoadingSingleCloset] = useState(false);

  // All friends closets state
  const [allFriendsGarments, setAllFriendsGarments] = useState<ItemWithFriend[]>([]);
  const [isLoadingAllClosets, setIsLoadingAllClosets] = useState(false);

  // Closet filtering & sorting state (Fig 11.1 & 12.1)
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLength, setFilterLength] = useState<string>('all');
  const [filterColor, setFilterColor] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Friends items counts cache: friend_id -> count
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

  // Detail item modal state (TC_FCLOSET_03)
  const [detailItem, setDetailItem] = useState<{ item: ClothingItem; owner: User } | null>(null);

  // Preload garment counts for friend rows (only public items TC_FCLOSET_03)
  useEffect(() => {
    let isMounted = true;
    const loadCounts = async () => {
      const counts: Record<string, number> = {};
      for (const friend of friends) {
        try {
          const items = await closetService.getItems(friend.user_id);
          const publicItems = items.filter(i => i.is_public !== false);
          counts[friend.user_id] = publicItems.length;
        } catch {
          counts[friend.user_id] = 0;
        }
      }
      if (isMounted) setItemCounts(counts);
    };
    if (friends.length > 0) {
      loadCounts();
    }
    return () => { isMounted = false; };
  }, [friends]);

  // Copy Friend Code
  const handleCopyCode = () => {
    if (currentUser.friend_code) {
      navigator.clipboard.writeText(currentUser.friend_code);
      setCopiedCode(true);
      toast('Friend code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2200);
    }
  };

  // Send friend request
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = friendCodeInput.trim();
    if (!code) {
      toast('Please enter a friend code.');
      return;
    }
    if (code === currentUser.friend_code) {
      toast('You cannot add yourself as a friend.');
      return;
    }
    setIsSendingRequest(true);
    try {
      const res = await friendsService.sendFriendRequest(code);
      toast(res.message);
      if (res.success) {
        setFriendCodeInput('');
        setIsAddFriendModalOpen(false);
        await onRefreshData();
      }
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Open single friend's virtual closet (Figure .11.1 - only public items TC_FCLOSET_03)
  const handleOpenFriendCloset = async (friend: User) => {
    setViewingFriend(friend);
    setSubView('single-closet');
    setFilterType('all');
    setFilterLength('all');
    setFilterColor('all');
    setIsLoadingSingleCloset(true);
    try {
      const items = await closetService.getItems(friend.user_id);
      const publicItems = items.filter(i => i.is_public !== false);
      setFriendGarments(publicItems);
    } finally {
      setIsLoadingSingleCloset(false);
    }
  };

  // Open All Friends Closets view (Figure .12.1 - only public items TC_FCLOSET_03)
  const handleOpenAllClosets = async () => {
    setSubView('all-closets');
    setFilterType('all');
    setFilterLength('all');
    setFilterColor('all');
    setIsLoadingAllClosets(true);
    try {
      const combined: ItemWithFriend[] = [];
      for (const friend of friends) {
        const items = await closetService.getItems(friend.user_id);
        const publicItems = items.filter(i => i.is_public !== false);
        for (const item of publicItems) {
          combined.push({
            ...item,
            ownerFriend: friend
          });
        }
      }
      setAllFriendsGarments(combined);
    } finally {
      setIsLoadingAllClosets(false);
    }
  };

  // Filter & sort single friend's garments
  const filteredSingleGarments = useMemo(() => {
    let result = [...friendGarments];
    if (filterType !== 'all') {
      result = result.filter(item => 
        item.category?.toLowerCase() === filterType.toLowerCase() ||
        item.type_tag?.toLowerCase() === filterType.toLowerCase()
      );
    }
    if (filterColor !== 'all') {
      result = result.filter(item => item.color?.toLowerCase() === filterColor.toLowerCase());
    }
    result.sort((a, b) => {
      const nameA = a.name || a.category || '';
      const nameB = b.name || b.category || '';
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    return result;
  }, [friendGarments, filterType, filterColor, sortOrder]);

  // Filter & sort all friends' garments
  const filteredAllGarments = useMemo(() => {
    let result = [...allFriendsGarments];
    if (filterType !== 'all') {
      result = result.filter(item => 
        item.category?.toLowerCase() === filterType.toLowerCase() ||
        item.type_tag?.toLowerCase() === filterType.toLowerCase()
      );
    }
    if (filterColor !== 'all') {
      result = result.filter(item => item.color?.toLowerCase() === filterColor.toLowerCase());
    }
    result.sort((a, b) => {
      const nameA = a.name || a.category || '';
      const nameB = b.name || b.category || '';
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    return result;
  }, [allFriendsGarments, filterType, filterColor, sortOrder]);

  // Filtered friends list for Figure .10.1
  const filteredFriends = useMemo(() => {
    const q = searchFriendsQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(f => 
      f.first_name.toLowerCase().includes(q) ||
      f.last_name.toLowerCase().includes(q) ||
      f.friend_code.toLowerCase().includes(q)
    );
  }, [friends, searchFriendsQuery]);

  // Pending incoming requests
  const incomingRequests = friendRequests.filter(
    r => r.receiver_id === currentUser.user_id && r.status === 'pending'
  );

  // Helper to render filter pills matching wireframe [All] [Type] [Length] [Color] + Sort
  const renderFilterBar = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      flexWrap: 'wrap',
      marginBottom: 20
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {['All', 'Tops', 'Bottoms', 'Dresses', 'Shoes'].map(cat => {
          const isActive = (cat === 'All' && filterType === 'all') || filterType.toLowerCase() === cat.toLowerCase();
          return (
            <button
              key={cat}
              type="button"
              className={`pill-btn ${isActive ? 'active' : ''}`}
              onClick={() => setFilterType(cat === 'All' ? 'all' : cat.toLowerCase())}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                background: isActive ? 'var(--primary)' : 'var(--surface-2)',
                color: isActive ? '#FFFFFF' : 'var(--text)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {cat}
            </button>
          );
        })}

        {/* Color filter dropdown */}
        <select
          value={filterColor}
          onChange={(e) => setFilterColor(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 20,
            fontSize: 12,
            background: 'var(--surface-2)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            cursor: 'pointer'
          }}
        >
          <option value="all">Color: All</option>
          <option value="black">Black</option>
          <option value="white">White</option>
          <option value="blue">Blue</option>
          <option value="grey">Grey</option>
          <option value="yellow">Yellow</option>
          <option value="red">Red</option>
          <option value="green">Green</option>
        </select>
      </div>

      {/* Sort button */}
      <button
        type="button"
        className="btn btn-g"
        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
        style={{ fontSize: 12, padding: '6px 12px', borderRadius: 20 }}
      >
        <ArrowUpDown className="ico" style={{ width: 14, height: 14 }} />
        <span>Sort {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
      </button>
    </div>
  );

  // Helper to render expanded garment detail view (TC_FCLOSET_03 & TC_BORROW_05)
  const renderGarmentDetailModal = () => {
    if (!detailItem) return null;
    const isUnavailable = detailItem.item.status === 'Borrowed' || 
                          detailItem.item.is_active === false || 
                          detailItem.item.tags?.some((t: any) => (typeof t === 'string' ? t : t.tag_name) === 'Borrowed');
    const isHex = detailItem.item.image_url?.startsWith('#');

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="garment-detail-modal-title"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}
        onClick={() => setDetailItem(null)}
      >
        <div
          className="card"
          style={{
            maxWidth: 460,
            width: '100%',
            padding: 24,
            borderRadius: 16,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 id="garment-detail-modal-title" style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-display)' }}>
              Garment Details
            </h3>
            <button
              type="button"
              className="icobtn"
              onClick={() => setDetailItem(null)}
            >
              ✕
            </button>
          </div>

          {/* Large Garment Image */}
          <div style={{
            height: 220,
            width: '100%',
            borderRadius: 12,
            marginBottom: 16,
            backgroundColor: isHex ? detailItem.item.image_url : 'var(--surface-2)',
            backgroundImage: isHex ? undefined : `url("${detailItem.item.image_url}")`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            border: '1px solid var(--border)'
          }} />

          <h4 style={{ margin: '0 0 6px', fontSize: 18, color: 'var(--text)' }}>
            {detailItem.item.name}
          </h4>

          {/* Owner details */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13
            }}>
              {`${detailItem.owner.first_name[0] || ''}${detailItem.owner.last_name[0] || ''}`.toUpperCase()}
            </div>
            <div>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'block' }}>Garment Owner</span>
              <strong style={{ fontSize: 13.5, color: 'var(--text)' }}>
                Owned by: {detailItem.owner.first_name} {detailItem.owner.last_name}
              </strong>
            </div>
          </div>

          {/* Tag Pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            <span className="pill on" style={{ fontSize: 11 }}>
              {detailItem.item.category || detailItem.item.type_tag || 'Garment'}
            </span>
            <span className="pill" style={{ fontSize: 11 }}>
              Color: {detailItem.item.color || 'Curated'}
            </span>
            {detailItem.item.size && (
              <span className="pill" style={{ fontSize: 11 }}>
                Size: {detailItem.item.size}
              </span>
            )}
            {isUnavailable ? (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 700 }}>
                Currently Borrowed / Unavailable
              </span>
            ) : (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.2)', fontWeight: 700 }}>
                Available to Borrow
              </span>
            )}
          </div>

          {/* Borrow button with unavailable handling (TC_BORROW_05) */}
          {isUnavailable ? (
            <div>
              <button
                type="button"
                disabled
                className="btn btn-g"
                style={{ width: '100%', justifyContent: 'center', opacity: 0.6, cursor: 'not-allowed', padding: '10px 16px', fontSize: 13 }}
              >
                Borrow Request Unavailable
              </button>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--danger)', textAlign: 'center' }}>
                This garment is currently active on loan or marked unavailable.
              </p>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-p"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: 14 }}
              onClick={() => {
                const owner = detailItem.owner;
                const item = detailItem.item;
                setDetailItem(null);
                onInitiateBorrow(owner, item);
              }}
            >
              Borrow This Garment
            </button>
          )}
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // SUBVIEW 1: FIGURE .11.1 - <Name of Friend>'s Closet Page (Pages 54 & 55)
  // --------------------------------------------------------------------------
  if (subView === 'single-closet' && viewingFriend) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        {/* Top Header / Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-g"
            style={{ fontSize: 12 }}
            onClick={() => setSubView('list')}
          >
            <ArrowLeft className="ico" style={{ width: 14, height: 14 }} /> Back to Friends
          </button>
          
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-display)' }}>
            {viewingFriend.first_name}'s Closet
          </h2>

          <div style={{ width: 90 }} />
        </div>

        {/* Filter & Sort Bar (All, Type, Length, Color, Sort) */}
        {renderFilterBar()}

        {/* Garment Grid */}
        {isLoadingSingleCloset ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading {viewingFriend.first_name}'s closet...
          </div>
        ) : filteredSingleGarments.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <Shirt style={{ width: 40, height: 40, opacity: 0.3, margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              No garments matching your filters in {viewingFriend.first_name}'s closet.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16
          }}>
            {filteredSingleGarments.map(item => {
              const isHex = item.image_url?.startsWith('#');
              const categoryTag = item.category || item.type_tag || 'Garment';
              const colorTag = item.color || 'Curated';
              const isUnavailable = item.status === 'Borrowed' || 
                                    item.is_active === false || 
                                    item.tags?.some((t: any) => (typeof t === 'string' ? t : t.tag_name) === 'Borrowed');

              return (
                <div 
                  key={item.item_id} 
                  className="card" 
                  onClick={() => setDetailItem({ item, owner: viewingFriend })}
                  style={{ 
                    padding: 12, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    borderRadius: 14,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  title="Click to view garment details"
                >
                  {/* Garment Image Box */}
                  <div style={{
                    height: 160,
                    width: '100%',
                    borderRadius: 10,
                    marginBottom: 10,
                    backgroundColor: isHex ? item.image_url : 'var(--surface-2)',
                    backgroundImage: isHex ? undefined : `url("${item.image_url}")`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }} />

                  <strong style={{ fontSize: 13, marginBottom: 4, color: 'var(--text)' }}>
                    {item.name}
                  </strong>

                  {/* 2 Tag Pills (e.g. dress, red / white) */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10.5,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: 'var(--surface-2)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)'
                    }}>
                      {categoryTag}
                    </span>
                    <span style={{
                      fontSize: 10.5,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: 'var(--surface-2)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)'
                    }}>
                      {colorTag}
                    </span>
                    {isUnavailable && (
                      <span style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 10,
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        fontWeight: 700
                      }}>
                        Borrowed
                      </span>
                    )}
                  </div>

                  {/* Wide 'Borrow' button (TC_BORROW_05: disabled if unavailable) */}
                  {isUnavailable ? (
                    <button
                      type="button"
                      disabled
                      className="btn btn-g"
                      style={{ 
                        width: '100%', 
                        justifyContent: 'center', 
                        fontSize: 12, 
                        fontWeight: 600,
                        padding: '8px 12px',
                        borderRadius: 20,
                        marginTop: 'auto',
                        opacity: 0.6,
                        cursor: 'not-allowed'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Currently Unavailable
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-p"
                      style={{ 
                        width: '100%', 
                        justifyContent: 'center', 
                        fontSize: 13, 
                        fontWeight: 600,
                        padding: '8px 12px',
                        borderRadius: 20,
                        marginTop: 'auto'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onInitiateBorrow(viewingFriend, item);
                      }}
                    >
                      Borrow
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {renderGarmentDetailModal()}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // SUBVIEW 2: FIGURE .12.1 - Friends Closets Page (All Friends, Pages 56 & 57)
  // --------------------------------------------------------------------------
  if (subView === 'all-closets') {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        {/* Top Header / Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-g"
            style={{ fontSize: 12 }}
            onClick={() => setSubView('list')}
          >
            <ArrowLeft className="ico" style={{ width: 14, height: 14 }} /> Back to Friends
          </button>
          
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-display)' }}>
            Friends Closets
          </h2>

          <div style={{ width: 90 }} />
        </div>

        {/* Filter & Sort Bar */}
        {renderFilterBar()}

        {/* Garment Grid with Friend Avatar badge in upper-right */}
        {isLoadingAllClosets ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading all friends' closets...
          </div>
        ) : filteredAllGarments.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <Shirt style={{ width: 40, height: 40, opacity: 0.3, margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              No items found across your friends' closets.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16
          }}>
            {filteredAllGarments.map(item => {
              const isHex = item.image_url?.startsWith('#');
              const categoryTag = item.category || item.type_tag || 'Garment';
              const colorTag = item.color || 'Curated';
              const ownerInitials = `${item.ownerFriend.first_name[0] || ''}${item.ownerFriend.last_name[0] || ''}`.toUpperCase();
              const isUnavailable = item.status === 'Borrowed' || 
                                    item.is_active === false || 
                                    item.tags?.some((t: any) => (typeof t === 'string' ? t : t.tag_name) === 'Borrowed');

              return (
                <div 
                  key={`${item.ownerFriend.user_id}-${item.item_id}`} 
                  className="card" 
                  onClick={() => setDetailItem({ item, owner: item.ownerFriend })}
                  style={{ 
                    padding: 12, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    borderRadius: 14,
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  title="Click to view garment details"
                >
                  {/* Top-Right Friend Avatar Badge (Figure .12.1) */}
                  <div 
                    title={`Owned by ${item.ownerFriend.first_name} ${item.ownerFriend.last_name}`}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--surface)',
                      border: '2px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--primary)',
                      zIndex: 3,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {ownerInitials}
                  </div>

                  {/* Garment Image Box */}
                  <div style={{
                    height: 160,
                    width: '100%',
                    borderRadius: 10,
                    marginBottom: 10,
                    backgroundColor: isHex ? item.image_url : 'var(--surface-2)',
                    backgroundImage: isHex ? undefined : `url("${item.image_url}")`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }} />

                  <strong style={{ fontSize: 13, marginBottom: 4, color: 'var(--text)' }}>
                    {item.name}
                  </strong>

                  {/* 2 Tag Pills */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10.5,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: 'var(--surface-2)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)'
                    }}>
                      {categoryTag}
                    </span>
                    <span style={{
                      fontSize: 10.5,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: 'var(--surface-2)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)'
                    }}>
                      {colorTag}
                    </span>
                    {isUnavailable && (
                      <span style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 10,
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        fontWeight: 700
                      }}>
                        Borrowed
                      </span>
                    )}
                  </div>

                  {/* Wide 'Borrow' button (TC_BORROW_05) */}
                  {isUnavailable ? (
                    <button
                      type="button"
                      disabled
                      className="btn btn-g"
                      style={{ 
                        width: '100%', 
                        justifyContent: 'center', 
                        fontSize: 12, 
                        fontWeight: 600,
                        padding: '8px 12px',
                        borderRadius: 20,
                        marginTop: 'auto',
                        opacity: 0.6,
                        cursor: 'not-allowed'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Currently Unavailable
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-p"
                      style={{ 
                        width: '100%', 
                        justifyContent: 'center', 
                        fontSize: 13, 
                        fontWeight: 600,
                        padding: '8px 12px',
                        borderRadius: 20,
                        marginTop: 'auto'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onInitiateBorrow(item.ownerFriend, item);
                      }}
                    >
                      Borrow
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {renderGarmentDetailModal()}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // SUBVIEW 3: FIGURE .10.1 - Friends Main Page (Page 53)
  // --------------------------------------------------------------------------
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', width: '100%' }}>
      {/* Top Search Bar, Add '+' Button, and 'View All Closets' Button */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 10, 
        marginBottom: 20,
        flexWrap: 'nowrap'
      }}>
        {/* Search Friends Input */}
        <div style={{ 
          position: 'relative', 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center' 
        }}>
          <Search 
            style={{ 
              position: 'absolute', 
              left: 14, 
              width: 16, 
              height: 16, 
              color: 'var(--text-muted)' 
            }} 
          />
          <input
            type="text"
            placeholder="Search Friends"
            value={searchFriendsQuery}
            onChange={(e) => setSearchFriendsQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 38,
              paddingRight: 14,
              paddingTop: 10,
              paddingBottom: 10,
              borderRadius: 24,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: 13,
              boxShadow: 'none'
            }}
          />
        </div>

        {/* Add '+' circular button */}
        <button
          type="button"
          className="icobtn"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#FFFFFF',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
          }}
          onClick={() => setIsAddFriendModalOpen(true)}
          title="Add friend by code"
        >
          <Plus style={{ width: 20, height: 20 }} />
        </button>

        {/* 'View All Closets' button */}
        <button
          type="button"
          className="btn btn-p"
          style={{
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            padding: '8px 16px',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
          onClick={handleOpenAllClosets}
        >
          View All Closets
        </button>
      </div>

      {/* Incoming Requests Banner (if any) */}
      {incomingRequests.length > 0 && (
        <div className="card" style={{ padding: 14, marginBottom: 16, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Inbox className="ico" style={{ color: 'var(--primary)' }} />
            <strong style={{ fontSize: 13 }}>Incoming Friend Requests ({incomingRequests.length})</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {incomingRequests.map(req => {
              const sender = req.sender;
              const senderName = sender ? `${sender.first_name} ${sender.last_name}` : 'A fellow user';
              return (
                <div key={req.request_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface)', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{senderName}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-p" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => onAcceptFriendRequest(req.request_id, senderName)}>Accept</button>
                    <button type="button" className="btn btn-g" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => onRejectFriendRequest(req.request_id)}>Decline</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Friends List (Rows matching Figure .10.1) */}
      {filteredFriends.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Users style={{ width: 40, height: 40, opacity: 0.3, margin: '0 auto 8px' }} />
          <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text-muted)' }}>
            {friends.length === 0 ? 'No friends connected yet.' : 'No friends match your search.'}
          </p>
          <button
            type="button"
            className="btn btn-p"
            style={{ fontSize: 12, margin: '8px auto 0' }}
            onClick={() => setIsAddFriendModalOpen(true)}
          >
            <UserPlus className="ico" style={{ width: 14, height: 14 }} /> Connect with a Friend
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredFriends.map(friend => {
            const initials = `${friend.first_name[0] || ''}${friend.last_name[0] || ''}`.toUpperCase();
            const count = itemCounts[friend.user_id] ?? 0;

            return (
              <div
                key={friend.user_id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderRadius: 14,
                  gap: 12
                }}
              >
                {/* Left: Avatar Circle + Name & Items count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'var(--surface-2)',
                    color: 'var(--primary)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0
                  }}>
                    {initials}
                  </div>
                  <div>
                    <strong style={{ fontSize: 14, display: 'block', color: 'var(--text)' }}>
                      {friend.first_name} {friend.last_name}
                    </strong>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {count} items
                    </span>
                  </div>
                </div>

                {/* Right: 'View Closet' Button (Figure .10.1) */}
                <button
                  type="button"
                  className="btn btn-p"
                  style={{
                    borderRadius: 20,
                    fontSize: 12.5,
                    fontWeight: 600,
                    padding: '7px 16px',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={() => handleOpenFriendCloset(friend)}
                >
                  View Closet
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Friend / Friend Code Modal */}
      {isAddFriendModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16
          }}
          onClick={() => setIsAddFriendModalOpen(false)}
        >
          <div 
            className="card"
            style={{ maxWidth: 440, width: '100%', padding: 24, borderRadius: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 14px', fontSize: 17, fontFamily: 'var(--font-display)' }}>
              Connect with Friends
            </h3>

            {/* Your unique friend code */}
            <div style={{ marginBottom: 18, padding: 12, background: 'var(--surface-2)', borderRadius: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Your Unique Friend Code
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <input
                  type="text"
                  readOnly
                  value={currentUser.friend_code}
                  style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}
                />
                <button
                  type="button"
                  className="btn btn-p"
                  style={{ fontSize: 12, padding: '7px 12px' }}
                  onClick={handleCopyCode}
                >
                  {copiedCode ? <Check className="ico" /> : <Copy className="ico" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Enter friend code */}
            <form onSubmit={handleSendRequest}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Enter Friend's Code
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="e.g. lee101"
                  value={friendCodeInput}
                  onChange={(e) => setFriendCodeInput(e.target.value)}
                  style={{ fontSize: 13 }}
                />
                <button
                  type="submit"
                  className="btn btn-p"
                  disabled={isSendingRequest}
                  style={{ fontSize: 12, padding: '7px 14px', whiteSpace: 'nowrap' }}
                >
                  <UserPlus className="ico" />
                  <span>Connect</span>
                </button>
              </div>
            </form>

            <button
              type="button"
              className="btn btn-g"
              style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
              onClick={() => setIsAddFriendModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
