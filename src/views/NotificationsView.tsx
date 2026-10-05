import React from 'react';
import { User, Borrow, FriendRequest, AppNotification } from '../types/database';
import { friendsService } from '../services/friendsService';
import { isSameUser } from '../services/supabaseClient';
import { Inbox, ChevronDown, Check, X, Eye } from 'lucide-react';

/**
 * ============================================================================
 * NOTIFICATIONS VIEW (NotificationsView.tsx)
 * Matches Wireframe Figure .8.1 (Desktop & Mobile Notification Page)
 * ============================================================================
 */

interface NotificationsViewProps {
  currentUser: User;
  borrows: Borrow[];
  friendRequests: FriendRequest[];
  notifications?: AppNotification[];
  onAcceptBorrow?: (borrowId: number) => void;
  onDenyBorrow?: (borrowId: number) => void;
  onAcceptFriend?: (requestId: number) => void;
  onDenyFriend?: (requestId: number) => void;
  onNavigateToRequests?: () => void;
  onClearNotifications?: () => void;
  onDeleteNotification?: (id: string) => void;
  onMarkNotificationRead?: (id: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  currentUser,
  borrows,
  friendRequests,
  notifications,
  onAcceptBorrow,
  onDenyBorrow,
  onAcceptFriend,
  onDenyFriend,
  onNavigateToRequests,
  onClearNotifications,
  onDeleteNotification,
  onMarkNotificationRead
}) => {
  // Pending incoming borrow requests
  const pendingBorrows = borrows.filter(b => 
    (isSameUser(b.lender?.user_id, currentUser.user_id) || 
     isSameUser(b.item?.user_id, currentUser.user_id) ||
     b.lender?.user_id === currentUser.user_id || 
     b.item?.user_id === currentUser.user_id) && 
    b.status === 'Pending'
  );

  // Pending incoming friend requests
  const pendingFriends = friendRequests.filter(r => 
    r.receiver_id === currentUser.user_id && r.status === 'pending'
  );

  // Real dynamic notifications from props or friendsService (no fake hardcoded items)
  const inboxItems: AppNotification[] = notifications !== undefined
    ? notifications
    : friendsService.getNotifications(currentUser.user_id);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      
      {/* 2-Column Split matching Figure .8.1 (Inbox & Requests) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        alignItems: 'start'
      }}>
        
        {/* COLUMN 1: Inbox ∨ */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-display)' }}>
                Inbox
              </h3>
              <ChevronDown className="ico" style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {inboxItems.length} {inboxItems.length === 1 ? 'message' : 'messages'}
              </span>
              {inboxItems.length > 0 && onClearNotifications && (
                <button
                  type="button"
                  onClick={onClearNotifications}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 11,
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {inboxItems.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Inbox style={{ width: 36, height: 36, opacity: 0.35, margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>No notifications</p>
              <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--text-muted)' }}>
                You're all caught up! Updates regarding borrow requests, returns, and friend activity will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {inboxItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => onMarkNotificationRead && onMarkNotificationRead(item.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: item.read ? 'var(--surface)' : 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    cursor: onMarkNotificationRead ? 'pointer' : 'default'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <strong style={{ fontSize: 13, color: 'var(--text)' }}>
                        {item.title}
                      </strong>
                    </div>
                    {item.message && (
                      <p style={{ margin: '0 0 4px', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {item.message}
                      </p>
                    )}

                    {/* Quick Action buttons for friend request notifications in Inbox */}
                    {item.type === 'friend_request' && (() => {
                      const pendingReq = friendRequests.find(r => 
                        (r.request_id === item.request_id || 
                         (r.sender_id === item.sender_id && r.receiver_id === currentUser.user_id)) && 
                        r.status === 'pending'
                      );
                      if (pendingReq) {
                        return (
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, marginBottom: 6 }}>
                            {onAcceptFriend && (
                              <button
                                type="button"
                                className="btn btn-p"
                                style={{ fontSize: 11, padding: '3px 10px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAcceptFriend(pendingReq.request_id);
                                }}
                              >
                                <Check className="ico" style={{ width: 11, height: 11 }} /> Accept
                              </button>
                            )}
                            {onDenyFriend && (
                              <button
                                type="button"
                                className="btn btn-g"
                                style={{ fontSize: 11, padding: '3px 10px', color: 'var(--danger)' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDenyFriend(pendingReq.request_id);
                                }}
                              >
                                <X className="ico" style={{ width: 11, height: 11 }} /> Decline
                              </button>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Quick Action buttons for borrow notifications in Inbox */}
                    {(item.type === 'borrow' || item.type === 'borrow_request') && (() => {
                      const pendingBorrow = borrows.find(b => 
                        (b.borrow_id === item.request_id || 
                         (isSameUser(b.borrower_id, item.sender_id) && 
                          (isSameUser(b.lender?.user_id, currentUser.user_id) || isSameUser(b.item?.user_id, currentUser.user_id)))) && 
                        b.status === 'Pending'
                      );
                      if (pendingBorrow) {
                        return (
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, marginBottom: 6 }}>
                            {onAcceptBorrow && (
                              <button
                                type="button"
                                className="btn btn-p"
                                style={{ fontSize: 11, padding: '3px 10px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAcceptBorrow(pendingBorrow.borrow_id);
                                }}
                              >
                                <Check className="ico" style={{ width: 11, height: 11 }} /> Accept Loan
                              </button>
                            )}
                            {onDenyBorrow && (
                              <button
                                type="button"
                                className="btn btn-g"
                                style={{ fontSize: 11, padding: '3px 10px', color: 'var(--danger)' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDenyBorrow(pendingBorrow.borrow_id);
                                }}
                              >
                                <X className="ico" style={{ width: 11, height: 11 }} /> Decline
                              </button>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                      {item.time}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    {!item.read && (
                      <span
                        title="Unread"
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          display: 'inline-block'
                        }}
                      />
                    )}
                    {onDeleteNotification && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNotification(item.id);
                        }}
                        title="Dismiss notification"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 2,
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMN 2: Requests ∨ */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-display)' }}>
                Requests
              </h3>
              <ChevronDown className="ico" style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
            </div>
            {onNavigateToRequests && (
              <button
                type="button"
                className="btn btn-g"
                style={{ fontSize: 11.5, padding: '3px 8px' }}
                onClick={onNavigateToRequests}
              >
                View Board &rarr;
              </button>
            )}
          </div>

          {pendingBorrows.length === 0 && pendingFriends.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Inbox style={{ width: 36, height: 36, opacity: 0.35, margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: 13 }}>No pending requests.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Incoming Borrow Requests */}
              {pendingBorrows.map(borrow => (
                <div
                  key={borrow.borrow_id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13, color: 'var(--text)' }}>
                      {borrow.borrower?.first_name || 'A friend'} requested to borrow:
                    </strong>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--primary-soft)', color: '#ffffff' }}>
                      BORROW
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Item: <strong>{borrow.item?.name || 'Garment'}</strong> ({borrow.start_date} to {borrow.end_date})
                  </div>

                  {/* Actions matching Figure .8.1: [Accept] [Deny] [View details] */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {onAcceptBorrow && (
                      <button
                        type="button"
                        className="btn btn-p"
                        style={{ fontSize: 11.5, padding: '4px 10px' }}
                        onClick={() => onAcceptBorrow(borrow.borrow_id)}
                      >
                        <Check className="ico" style={{ width: 12, height: 12 }} /> Accept
                      </button>
                    )}
                    {onDenyBorrow && (
                      <button
                        type="button"
                        className="btn btn-g"
                        style={{ fontSize: 11.5, padding: '4px 10px', color: 'var(--danger)' }}
                        onClick={() => onDenyBorrow(borrow.borrow_id)}
                      >
                        <X className="ico" style={{ width: 12, height: 12 }} /> Deny
                      </button>
                    )}
                    {onNavigateToRequests && (
                      <button
                        type="button"
                        className="btn btn-g"
                        style={{ fontSize: 11.5, padding: '4px 10px', marginLeft: 'auto' }}
                        onClick={onNavigateToRequests}
                      >
                        <Eye className="ico" style={{ width: 12, height: 12 }} /> View details
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Incoming Friend Requests */}
              {pendingFriends.map(req => {
                const sender = req.sender || friendsService.getAllUsers().find(u => u.user_id === req.sender_id);
                const senderDisplayName = sender ? `${sender.first_name} ${sender.last_name}` : 'Peer';
                return (
                  <div
                    key={req.request_id}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 13, color: 'var(--text)' }}>
                        Friend Request from {senderDisplayName}
                      </strong>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--primary)', color: '#ffffff' }}>
                        FRIEND
                      </span>
                    </div>

                    {sender?.friend_code && (
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        Friend code: <code style={{ fontWeight: 600 }}>{sender.friend_code}</code>
                      </div>
                    )}

                    {/* Actions matching Figure .8.1: [Accept] [Deny] */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {onAcceptFriend && (
                        <button
                          type="button"
                          className="btn btn-p"
                          style={{ fontSize: 11.5, padding: '4px 10px' }}
                          onClick={() => onAcceptFriend(req.request_id)}
                        >
                          <Check className="ico" style={{ width: 12, height: 12 }} /> Accept
                        </button>
                      )}
                      {onDenyFriend && (
                        <button
                          type="button"
                          className="btn btn-g"
                          style={{ fontSize: 11.5, padding: '4px 10px', color: 'var(--danger)' }}
                          onClick={() => onDenyFriend(req.request_id)}
                        >
                          <X className="ico" style={{ width: 12, height: 12 }} /> Deny
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
