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
  Inbox,
  RotateCcw,
  UserMinus,
  AlertCircle
} from 'lucide-react';
import { User, FriendRequest, ClothingItem } from '../../shared/types/database';
import { friendsService } from './friendsService';
import { closetService, inferCategoryFromName, inferColorFromName, resolveGarmentCategory, resolveGarmentColor } from '../VirtualCloset';
import { NORMAL_CLOTHING_COLORS } from '../../shared/data/seedData';

interface FriendsViewProps {
  currentUser: User;
  friends: User[];
  friendRequests: FriendRequest[];
  onAcceptFriendRequest: (requestId: number, senderName?: string) => Promise<void>;
  onRejectFriendRequest: (requestId: number) => Promise<void>;
  onRemoveFriend?: (friendId: string, friendName?: string) => void;
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
  onRemoveFriend,
  onInitiateBorrow,
  onRefreshData,
  toast
}) => {

  const [subView, setSubView] = useState<'list' | 'single-closet' | 'all-closets'>('list');
  const [viewingFriend, setViewingFriend] = useState<User | null>(null);

  const [searchFriendsQuery, setSearchFriendsQuery] = useState('');

  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [friendGarments, setFriendGarments] = useState<ClothingItem[]>([]);
  const [isLoadingSingleCloset, setIsLoadingSingleCloset] = useState(false);

  const [allFriendsGarments, setAllFriendsGarments] = useState<ItemWithFriend[]>([]);
  const [isLoadingAllClosets, setIsLoadingAllClosets] = useState(false);

  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const toggleTypeFilter = (typeName: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(typeName)) next.delete(typeName);
      else next.add(typeName);
      return next;
    });
  };

  const toggleColorFilter = (colorName: string) => {
    setSelectedColors(prev => {
      const next = new Set(prev);
      if (next.has(colorName)) next.delete(colorName);
      else next.add(colorName);
      return next;
    });
  };

  const clearAllFilters = () => {
    setSelectedTypes(new Set());
    setSelectedColors(new Set());
  };

  const hasActiveFilters = selectedTypes.size > 0 || selectedColors.size > 0;

  const [detailItem, setDetailItem] = useState<{ item: ClothingItem; owner: User } | null>(null);

  const handleCopyCode = () => {
    if (currentUser.friend_code) {
      navigator.clipboard.writeText(currentUser.friend_code);
      setCopiedCode(true);
      toast('Friend code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2200);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestFeedback(null);
    const code = friendCodeInput.trim();
    if (!code) {
      setRequestFeedback({ type: 'error', message: 'Please enter a friend code.' });
      return;
    }
    if (code.toUpperCase() === (currentUser.friend_code || '').toUpperCase()) {
      setRequestFeedback({ type: 'error', message: 'You cannot add yourself as a friend.' });
      return;
    }
    setIsSendingRequest(true);
    try {
      const res = await friendsService.sendFriendRequest(code);
      if (res.success) {
        setRequestFeedback({ type: 'success', message: res.message });
        toast(res.message);
        setTimeout(() => {
          setFriendCodeInput('');
          setRequestFeedback(null);
          setIsAddFriendModalOpen(false);
          onRefreshData();
        }, 1200);
      } else {
        setRequestFeedback({ type: 'error', message: res.message });
        toast(res.message);
      }
    } catch (err: any) {
      const errTxt = err?.message || 'An error occurred while connecting. Please try again.';
      setRequestFeedback({ type: 'error', message: errTxt });
      toast(errTxt);
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleOpenFriendCloset = async (friend: User) => {
    setViewingFriend(friend);
    setSubView('single-closet');
    clearAllFilters();
    setIsLoadingSingleCloset(true);
    try {
      const items = await closetService.getItems(friend.user_id);
      const publicItems = items.filter(i => i.is_public !== false);
      setFriendGarments(publicItems);
    } finally {
      setIsLoadingSingleCloset(false);
    }
  };

  const handleOpenAllClosets = async () => {
    setSubView('all-closets');
    clearAllFilters();
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

  const filteredSingleGarments = useMemo(() => {
    let result = friendGarments.filter(item => {
      const resolvedCat = resolveGarmentCategory(item);
      const resolvedCol = resolveGarmentColor(item);

      const matchType = selectedTypes.size === 0 || Array.from(selectedTypes).some(sel => {
        return (resolvedCat.toLowerCase() === sel.toLowerCase()) ||
               (item.type_tag && item.type_tag.toLowerCase() === sel.toLowerCase());
      });
      if (!matchType) return false;

      const matchColor = selectedColors.size === 0 || Array.from(selectedColors).some(sel => {
        const itemColor = resolvedCol.name.toLowerCase();
        const itemColorTag = (item.color_tag || resolvedCol.hex || '').toLowerCase();
        const selLower = sel.toLowerCase();
        return itemColor.includes(selLower) || itemColorTag.includes(selLower);
      });
      if (!matchColor) return false;

      return true;
    });

    result.sort((a, b) => {
      const nameA = a.name || a.category || '';
      const nameB = b.name || b.category || '';
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    return result;
  }, [friendGarments, selectedTypes, selectedColors, sortOrder]);

  const filteredAllGarments = useMemo(() => {
    let result = allFriendsGarments.filter(item => {
      const resolvedCat = resolveGarmentCategory(item);
      const resolvedCol = resolveGarmentColor(item);

      const matchType = selectedTypes.size === 0 || Array.from(selectedTypes).some(sel => {
        return (resolvedCat.toLowerCase() === sel.toLowerCase()) ||
               (item.type_tag && item.type_tag.toLowerCase() === sel.toLowerCase());
      });
      if (!matchType) return false;

      const matchColor = selectedColors.size === 0 || Array.from(selectedColors).some(sel => {
        const itemColor = resolvedCol.name.toLowerCase();
        const itemColorTag = (item.color_tag || resolvedCol.hex || '').toLowerCase();
        const selLower = sel.toLowerCase();
        return itemColor.includes(selLower) || itemColorTag.includes(selLower);
      });
      if (!matchColor) return false;

      return true;
    });

    result.sort((a, b) => {
      const nameA = a.name || a.category || '';
      const nameB = b.name || b.category || '';
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    return result;
  }, [allFriendsGarments, selectedTypes, selectedColors, sortOrder]);

  const filteredFriends = useMemo(() => {
    const q = searchFriendsQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(f =>
      f.first_name.toLowerCase().includes(q) ||
      f.last_name.toLowerCase().includes(q) ||
      f.friend_code.toLowerCase().includes(q)
    );
  }, [friends, searchFriendsQuery]);

  const incomingRequests = friendRequests.filter(
    r => r.receiver_id === currentUser.user_id && r.status === 'pending'
  );

  const outgoingRequests = friendRequests.filter(
    r => r.sender_id === currentUser.user_id && r.status === 'pending'
  );

  const renderFilterBar = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      marginBottom: 20,
      paddingBottom: 14,
      borderBottom: '1px solid var(--border)'
    }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`pill ${selectedTypes.size === 0 && selectedColors.size === 0 ? 'on' : ''}`}
            style={{
              cursor: 'pointer',
              padding: '6px 14px',
              fontSize: 12.5,
              borderRadius: 20,
              background: (selectedTypes.size === 0 && selectedColors.size === 0) ? 'var(--primary)' : 'var(--surface-2)',
              color: (selectedTypes.size === 0 && selectedColors.size === 0) ? '#ffffff' : 'var(--text)',
              border: (selectedTypes.size === 0 && selectedColors.size === 0) ? '1px solid var(--primary)' : '1px solid var(--border)',
              fontWeight: 600
            }}
            onClick={clearAllFilters}
          >
            All
          </button>

          {['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes'].map(cat => {
            const isSelected = selectedTypes.has(cat);
            return (
              <button
                key={cat}
                type="button"
                className={`pill ${isSelected ? 'on' : ''}`}
                style={{
                  cursor: 'pointer',
                  padding: '6px 14px',
                  fontSize: 12.5,
                  borderRadius: 20,
                  background: isSelected ? 'var(--primary)' : 'var(--surface-2)',
                  color: isSelected ? '#ffffff' : 'var(--text)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                  fontWeight: isSelected ? 600 : 500
                }}
                onClick={() => toggleTypeFilter(cat)}
              >
                {cat}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-g"
              style={{ fontSize: 11.5, padding: '4px 10px', color: 'var(--danger)', borderRadius: 20 }}
              onClick={clearAllFilters}
            >
              <RotateCcw className="ico" style={{ width: 12, height: 12 }} /> Reset
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn btn-g"
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20 }}
        >
          <ArrowUpDown className="ico" style={{ width: 13, height: 13 }} />
          <span>Sort {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {NORMAL_CLOTHING_COLORS.map(color => {
          const isSelected = selectedColors.has(color.name);
          return (
            <button
              key={color.name}
              type="button"
              className={`pill ${isSelected ? 'on' : ''}`}
              style={{
                cursor: 'pointer',
                padding: '5px 12px',
                fontSize: 12,
                borderRadius: 20,
                background: isSelected ? 'var(--primary)' : 'var(--surface-2)',
                color: isSelected ? '#ffffff' : 'var(--text)',
                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                fontWeight: isSelected ? 600 : 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
              onClick={() => toggleColorFilter(color.name)}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: color.hex,
                border: color.name === 'White' ? '1px solid #cbd5e1' : 'none',
                display: 'inline-block'
              }} />
              {color.name}
            </button>
          );
        })}
      </div>
    </div>
  );

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

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            <span className="pill on" style={{ fontSize: 11 }}>
              {resolveGarmentCategory(detailItem.item)}
            </span>
            {(() => {
              const col = resolveGarmentColor(detailItem.item);
              return (
                <span className="pill" style={{
                  fontSize: 11,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: col.hex,
                    border: col.name.toLowerCase() === 'white' ? '1px solid #cbd5e1' : 'none',
                    display: 'inline-block'
                  }} />
                  Color: {col.name}
                </span>
              );
            })()}
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

          {isUnavailable ? (
            <button
              type="button"
              disabled
              className="btn btn-g"
              style={{ width: '100%', justifyContent: 'center', opacity: 0.6, cursor: 'not-allowed', padding: '10px 16px', fontSize: 13 }}
            >
              Borrow Request Unavailable
            </button>
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

  if (subView === 'single-closet' && viewingFriend) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>

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

          {onRemoveFriend ? (
            <button
              type="button"
              className="btn btn-g"
              style={{ fontSize: 11.5, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={async () => {
                await onRemoveFriend(viewingFriend.user_id, `${viewingFriend.first_name} ${viewingFriend.last_name}`);
                setSubView('list');
              }}
            >
              <UserMinus className="ico" style={{ width: 13, height: 13 }} /> Remove Friend
            </button>
          ) : (
            <div style={{ width: 90 }} />
          )}
        </div>

        {renderFilterBar()}

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
              const categoryTag = resolveGarmentCategory(item);
              const colorInfo = resolveGarmentColor(item);
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

                  <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    {categoryTag && (
                      <span style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                        fontWeight: 500
                      }}>
                        {categoryTag}
                      </span>
                    )}
                    {colorInfo.name && (
                      <span style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <span style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: colorInfo.hex,
                          border: colorInfo.name.toLowerCase() === 'white' ? '1px solid #cbd5e1' : 'none',
                          display: 'inline-block'
                        }} />
                        {colorInfo.name}
                      </span>
                    )}
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

        {renderFilterBar()}

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
              const categoryTag = resolveGarmentCategory(item);
              const colorInfo = resolveGarmentColor(item);
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

                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
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
                      border: '1px solid var(--border)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <span style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: colorInfo.hex,
                        border: colorInfo.name.toLowerCase() === 'white' ? '1px solid #cbd5e1' : 'none',
                        display: 'inline-block'
                      }} />
                      {colorInfo.name}
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

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
        flexWrap: 'nowrap'
      }}>

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

      {incomingRequests.length > 0 && (
        <div className="card" style={{ padding: 14, marginBottom: 16, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Inbox className="ico" style={{ color: 'var(--primary)' }} />
            <strong style={{ fontSize: 13 }}>Incoming Friend Requests ({incomingRequests.length})</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {incomingRequests.map(req => {
              const sender = req.sender || friendsService.getAllUsers().find(u => u.user_id === req.sender_id);
              const senderName = sender ? `${sender.first_name} ${sender.last_name}` : 'A fellow user';
              return (
                <div key={req.request_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{senderName}</span>
                    {sender?.friend_code && (
                      <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>({sender.friend_code})</code>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-p" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => onAcceptFriendRequest(req.request_id, senderName)}>Accept</button>
                    <button type="button" className="btn btn-g" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--danger)' }} onClick={() => onRejectFriendRequest(req.request_id)}>Decline</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {outgoingRequests.length > 0 && (
        <div className="card" style={{ padding: 12, marginBottom: 16, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 13 }}>⏳</span>
            <strong style={{ fontSize: 12.5 }}>Pending Outgoing Requests ({outgoingRequests.length})</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {outgoingRequests.map(req => {
              const receiver = req.receiver || friendsService.getAllUsers().find(u => u.user_id === req.receiver_id);
              const receiverName = receiver ? `${receiver.first_name} ${receiver.last_name}` : 'Friend';
              return (
                <div key={req.request_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface)', borderRadius: 8, fontSize: 12 }}>
                  <span>Request sent to <strong>{receiverName}</strong> {receiver?.friend_code && <code style={{ fontSize: 11, marginLeft: 4 }}>({receiver.friend_code})</code>}</span>
                  <span className="pill" style={{ fontSize: 10, padding: '2px 8px', fontWeight: 600 }}>Awaiting Acceptance</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                    <strong style={{ fontSize: 14, color: 'var(--text)' }}>
                      {friend.first_name} {friend.last_name}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

                  {onRemoveFriend && (
                    <button
                      type="button"
                      className="btn btn-g"
                      title="Remove friend from list"
                      style={{
                        borderRadius: 20,
                        fontSize: 12,
                        padding: '7px 12px',
                        color: 'var(--danger)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      onClick={() => onRemoveFriend(friend.user_id, `${friend.first_name} ${friend.last_name}`)}
                    >
                      <UserMinus className="ico" style={{ width: 13, height: 13 }} /> Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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

            {requestFeedback && (
              <div style={{
                padding: '9px 12px',
                borderRadius: 8,
                marginBottom: 14,
                fontSize: 12.5,
                lineHeight: 1.4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: requestFeedback.type === 'error' ? 'var(--danger-soft, #fee2e2)' : 'var(--primary-soft, #d1fae5)',
                color: requestFeedback.type === 'error' ? 'var(--danger, #dc2626)' : 'var(--primary, #059669)',
                border: `1px solid ${requestFeedback.type === 'error' ? 'var(--danger, #dc2626)' : 'var(--primary, #059669)'}`
              }}>
                <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
                <span>{requestFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSendRequest}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Enter Friend's Code
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="e.g. RP-MARI-8464"
                  value={friendCodeInput}
                  onChange={(e) => {
                    setFriendCodeInput(e.target.value);
                    if (requestFeedback) setRequestFeedback(null);
                  }}
                  style={{ fontSize: 13 }}
                  disabled={isSendingRequest}
                />
                <button
                  type="submit"
                  className="btn btn-p"
                  disabled={isSendingRequest}
                  style={{ fontSize: 12, padding: '7px 14px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {isSendingRequest ? (
                    <>
                      <div style={{
                        width: 12,
                        height: 12,
                        border: '2px solid #ffffff',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite'
                      }} />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="ico" />
                      <span>Connect</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <button
              type="button"
              className="btn btn-g"
              style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
              onClick={() => {
                setIsAddFriendModalOpen(false);
                setRequestFeedback(null);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
