import React from 'react';
import { User, Borrow, FriendRequest, AppNotification } from '../../shared/types/database';
import { friendsService } from './friendsService';
import { isSameUser } from '../../shared/services/supabaseClient';
import { Inbox, ChevronDown, Check, X, Eye } from 'lucide-react';

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

// Renders the notifications dashboard split into informational updates and actionable requests
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

  // Filters pending borrow requests where the current user is the owner/lender awaiting response
  const pendingBorrows = borrows.filter(b =>
    (isSameUser(b.lender?.user_id, currentUser.user_id) ||
     isSameUser(b.item?.user_id, currentUser.user_id) ||
     b.lender?.user_id === currentUser.user_id ||
     b.item?.user_id === currentUser.user_id) &&
    b.status === 'Pending'
  );

  // Filters incoming friend requests that are waiting for the user to accept or deny
  const pendingFriends = friendRequests.filter(r =>
    r.receiver_id === currentUser.user_id && r.status === 'pending'
  );

  // Retrieves notifications from component props or falls back to friendsService
  const rawNotifications: AppNotification[] = notifications !== undefined
    ? notifications
    : friendsService.getNotifications(currentUser.user_id);

  // Filters out actionable requests so the inbox strictly shows status updates and alerts
  const inboxItems: AppNotification[] = rawNotifications.filter(item => {
    // Actionable requests belong exclusively in the Requests column, not Inbox
    if (item.type === 'borrow_request') return false;
    if (item.type === 'borrow' && (
      item.title?.toLowerCase().includes('new borrow') ||
      item.message?.toLowerCase().includes('requested to borrow')
    )) {
      return false;
    }
    if (item.type === 'friend_request' && (
      item.title?.toLowerCase().includes('sent you a friend request') ||
      item.message?.toLowerCase().includes('wants to connect')
    )) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        alignItems: 'start'
      }}>

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
                // Clears all informational notifications from the inbox
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
                // Marks notification as read when clicked
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
                      // Dismisses an individual notification
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

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-display)' }}>
                Requests
              </h3>
              <ChevronDown className="ico" style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
            </div>
            {onNavigateToRequests && (
              // Navigates to the dedicated lending request board
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

                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {onAcceptBorrow && (
                      // Approves the friend's borrow request
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
                      // Declines the friend's borrow request
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
                      // Navigates to the request board for item and date details
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

                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {onAcceptFriend && (
                        // Accepts the friend request to connect closets
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
                        // Declines the incoming friend request
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
