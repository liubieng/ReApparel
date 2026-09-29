import React, { useState } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  UserPlus, 
  Shirt, 
  Calendar, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles,
  Search,
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
 * CAPSTONE DEFENSE CONTEXT & METHODOLOGY:
 * - Implements peer-to-peer wardrobe sharing (SDG 12: Circular Fashion Economy).
 * - Borrowing items for temporary events avoids fast-fashion one-time purchases.
 * - Allows users to share their unique Friend Code, connect accounts, and browse
 *   each other's virtual wardrobes to borrow garments.
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
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Friend Closet View Substate
  const [viewingFriend, setViewingFriend] = useState<User | null>(null);
  const [friendGarments, setFriendGarments] = useState<ClothingItem[]>([]);
  const [isLoadingCloset, setIsLoadingCloset] = useState(false);

  // Copy Friend Code to Clipboard
  const handleCopyCode = () => {
    if (currentUser.friend_code) {
      navigator.clipboard.writeText(currentUser.friend_code);
      setCopiedCode(true);
      toast('Friend code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2200);
    }
  };

  // Send Connection Request
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
      const res = friendsService.sendFriendRequest(code);
      toast(res.message);
      if (res.success) {
        setFriendCodeInput('');
        await onRefreshData();
      }
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Open Friend's Virtual Closet
  const handleOpenFriendCloset = async (friend: User) => {
    setViewingFriend(friend);
    setIsLoadingCloset(true);
    try {
      const items = await closetService.getItems(friend.user_id);
      setFriendGarments(items);
    } finally {
      setIsLoadingCloset(false);
    }
  };

  // Pending incoming requests
  const incomingRequests = friendRequests.filter(
    r => r.receiver_id === currentUser.user_id && r.status === 'pending'
  );

  // --------------------------------------------------------------------------
  // SUBVIEW: BROWSE FRIEND'S WARDROBE
  // --------------------------------------------------------------------------
  if (viewingFriend) {
    return (
      <div>
        {/* Back navigation header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-g"
            style={{ fontSize: 12.5 }}
            onClick={() => setViewingFriend(null)}
          >
            <ArrowLeft className="ico" /> Back to Friends List
          </button>
          
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-display)' }}>
              {viewingFriend.first_name}'s Virtual Closet
            </h3>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {friendGarments.length} garments available to borrow
            </span>
          </div>
        </div>

        {isLoadingCloset ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading wardrobe...
          </div>
        ) : friendGarments.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <Shirt style={{ width: 40, height: 40, opacity: 0.3, margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              {viewingFriend.first_name} hasn't added any clothing items to their closet yet.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12
          }}>
            {friendGarments.map(item => {
              const isHex = item.image_url?.startsWith('#');
              return (
                <div key={item.item_id} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column' }}>
                  <div style={{
                    height: 140,
                    width: '100%',
                    borderRadius: 6,
                    marginBottom: 8,
                    background: isHex ? item.image_url : 'var(--surface-2)',
                    backgroundImage: isHex ? undefined : `url(${item.image_url})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }} />

                  <strong style={{ fontSize: 13, marginBottom: 2 }}>{item.name}</strong>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                    {item.category || item.type_tag || 'Garment'} &middot; {item.color || 'Curated'}
                  </div>

                  <button
                    type="button"
                    className="btn btn-p"
                    style={{ width: '100%', justifyContent: 'center', fontSize: 12, marginTop: 'auto' }}
                    onClick={() => onInitiateBorrow(viewingFriend, item)}
                  >
                    Request to Borrow
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // MAIN FRIENDS VIEW
  // --------------------------------------------------------------------------
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontSize: 22, fontFamily: 'var(--font-display)' }}>
            Friends &amp; Wardrobe Sharing
          </h2>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            Connect with friends, explore their closets, and share garments to reduce new purchases
          </div>
        </div>
      </div>

      {/* Friend Code & Add Friend Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 20 }}>
        
        {/* Your Friend Code Card */}
        <div className="card" style={{ padding: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your Unique Friend Code
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input
              type="text"
              readOnly
              value={currentUser.friend_code}
              style={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em', fontSize: 14 }}
            />
            <button
              type="button"
              className="btn btn-p"
              style={{ fontSize: 12, padding: '7px 12px', whiteSpace: 'nowrap' }}
              onClick={handleCopyCode}
            >
              {copiedCode ? <Check className="ico" /> : <Copy className="ico" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
            Give this code to friends so they can link with your wardrobe.
          </p>
        </div>

        {/* Add Friend by Code */}
        <div className="card" style={{ padding: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Add Friend by Code
          </span>
          <form onSubmit={handleSendRequest} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input
              type="text"
              placeholder="e.g. RP-LIUC-2048"
              value={friendCodeInput}
              onChange={(e) => setFriendCodeInput(e.target.value)}
              style={{ fontSize: 13 }}
            />
            <button
              type="submit"
              className="btn btn-p"
              disabled={isSendingRequest}
              style={{ fontSize: 12, padding: '7px 12px', whiteSpace: 'nowrap' }}
            >
              <UserPlus className="ico" />
              <span>Connect</span>
            </button>
          </form>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
            Demo codes: <code>RP-MARI-1024</code> (Mario) &middot; <code>RP-LIUC-2048</code> (Liu)
          </p>
        </div>

      </div>

      {/* Incoming Friend Requests Alert */}
      {incomingRequests.length > 0 && (
        <div className="card" style={{ padding: 14, marginBottom: 20, background: 'var(--surface-2)', border: '1px solid var(--primary-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Inbox className="ico" style={{ color: 'var(--primary)' }} />
            <strong style={{ fontSize: 13 }}>Incoming Friend Requests ({incomingRequests.length})</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {incomingRequests.map(req => {
              const sender = req.sender;
              const senderName = sender ? `${sender.first_name} ${sender.last_name}` : 'A fellow user';

              return (
                <div
                  key={req.request_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 13, display: 'block' }}>{senderName}</strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Wants to connect wardrobes with you
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-p"
                      style={{ fontSize: 11.5, padding: '4px 10px' }}
                      onClick={() => onAcceptFriendRequest(req.request_id, senderName)}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn btn-g"
                      style={{ fontSize: 11.5, padding: '4px 10px', color: 'var(--danger)' }}
                      onClick={() => onRejectFriendRequest(req.request_id)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connected Friends List */}
      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontFamily: 'var(--font-display)' }}>
          Connected Friends ({friends.length})
        </h3>

        {friends.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <Users style={{ width: 36, height: 36, opacity: 0.3, margin: '0 auto 8px' }} />
            <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text-muted)' }}>
              No friends connected yet.
            </p>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Share your friend code or enter a friend's code above to start sharing closets!
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
            {friends.map(friend => {
              const initials = `${friend.first_name[0] || ''}${friend.last_name[0] || ''}`.toUpperCase();

              return (
                <div
                  key={friend.user_id}
                  className="card"
                  style={{ padding: 14, display: 'flex', flexDirection: 'column' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: 'var(--surface-2)',
                      color: 'var(--primary)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 14
                    }}>
                      {initials}
                    </div>
                    <div>
                      <strong style={{ fontSize: 13.5, display: 'block', color: 'var(--text)' }}>
                        {friend.first_name} {friend.last_name}
                      </strong>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {friend.friend_code}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-g"
                    style={{ width: '100%', justifyContent: 'center', fontSize: 12, marginTop: 'auto' }}
                    onClick={() => handleOpenFriendCloset(friend)}
                  >
                    <Shirt className="ico" style={{ width: 13, height: 13 }} />
                    <span>Browse {friend.first_name}'s Closet</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
