import React, { useState } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  UserPlus, 
  Shirt, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowRight,
  Sparkles,
  Inbox,
  Send,
  Eye,
  AlertCircle
} from 'lucide-react';
import { User, FriendRequest, Borrow, ClothingItem } from '../../types/database';
import { friendsService } from '../../services/friendsService';

interface FriendsViewProps {
  currentUser: User;
  friends: User[];
  friendRequests: FriendRequest[];
  borrows: Borrow[];
  onSendFriendRequest: (code: string) => { success: boolean; message: string };
  onRespondFriendRequest: (requestId: number, status: 'accepted' | 'rejected') => void;
  onRequestBorrow: (itemId: number, startDate: string, endDate: string) => void;
  onUpdateBorrowStatus: (borrowId: number, status: Borrow['status']) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentUser,
  friends,
  friendRequests,
  borrows,
  onSendFriendRequest,
  onRespondFriendRequest,
  onRequestBorrow,
  onUpdateBorrowStatus
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [requestStatusMsg, setRequestStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Friend closet view state
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [friendCloset, setFriendCloset] = useState<ClothingItem[]>([]);

  // Borrow modal state
  const [borrowItemTarget, setBorrowItemTarget] = useState<ClothingItem | null>(null);
  const [borrowStartDate, setBorrowStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [borrowEndDate, setBorrowEndDate] = useState(
    new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
  );

  const [activeTab, setActiveTab] = useState<'directory' | 'incoming' | 'my-borrows'>('directory');

  const incomingPendingRequests = friendRequests.filter(
    r => r.receiver_id === currentUser.user_id && r.status === 'pending'
  );

  const incomingBorrows = borrows.filter(b => b.lender?.user_id === currentUser.user_id);
  const myBorrowRequests = borrows.filter(b => b.borrower_id === currentUser.user_id);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentUser.friend_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendFriendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCodeInput.trim()) return;

    const res = onSendFriendRequest(friendCodeInput.trim());
    setRequestStatusMsg({ text: res.message, error: !res.success });
    if (res.success) {
      setFriendCodeInput('');
    }
  };

  const handleOpenFriendCloset = (friend: User) => {
    setSelectedFriend(friend);
    const closet = friendsService.getFriendCloset(friend.user_id);
    setFriendCloset(closet);
  };

  const handleOpenBorrowModal = (item: ClothingItem) => {
    setBorrowItemTarget(item);
  };

  const handleConfirmBorrow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowItemTarget) return;

    onRequestBorrow(borrowItemTarget.item_id, borrowStartDate, borrowEndDate);
    setBorrowItemTarget(null);
    alert(`Loan request for "${borrowItemTarget.name}" submitted to the owner!`);
  };

  return (
    <div className="space-y-6">
      
      {/* 5.1.1 Personal Friend Code Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Community Wardrobe Passport
            </span>
          </div>
          <h2 className="text-xl font-bold font-display text-white">
            Share Your Wardrobe, Stop Buying Fast-Fashion
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Give your friend code to friends to let them view and borrow your garments. In ReApparel, every closet item is lendable to connected friends.
          </p>
        </div>

        {/* Friend Code Badge & Copy */}
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2 pl-4 shrink-0 shadow-inner">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Your Friend Code
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-300">
              {currentUser.friend_code}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Friend Request Input Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <form onSubmit={handleSendFriendRequest} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-600 shrink-0" />
            <input
              type="text"
              value={friendCodeInput}
              onChange={(e) => setFriendCodeInput(e.target.value)}
              placeholder="Enter friend code to connect (e.g., RP-MARCUS-1903, RP-SOPHIA-4411)..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Request</span>
          </button>
        </form>

        {requestStatusMsg && (
          <p className={`text-xs mt-2 font-medium ${requestStatusMsg.error ? 'text-rose-600' : 'text-emerald-700'}`}>
            {requestStatusMsg.text}
          </p>
        )}
      </div>

      {/* Pending Incoming Friend Requests Banner */}
      {incomingPendingRequests.length > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Incoming Friend Handshakes ({incomingPendingRequests.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {incomingPendingRequests.map((req) => (
              <div key={req.request_id} className="p-3 rounded-xl bg-white border border-indigo-100 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <img
                    src={req.sender?.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'}
                    alt={req.sender?.first_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {req.sender?.first_name} {req.sender?.last_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{req.sender?.friend_code}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onRespondFriendRequest(req.request_id, 'accepted')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onRespondFriendRequest(req.request_id, 'rejected')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs: Friends Directory vs Borrow Request Board */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-100 text-xs font-medium">
          <button
            onClick={() => { setActiveTab('directory'); setSelectedFriend(null); }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'directory' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Connected Friends ({friends.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('incoming'); setSelectedFriend(null); }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'incoming' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Owner Requests ({incomingBorrows.filter(b => b.status === 'Pending').length} pending)</span>
          </button>

          <button
            onClick={() => { setActiveTab('my-borrows'); setSelectedFriend(null); }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'my-borrows' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>My Active Loans ({myBorrowRequests.length})</span>
          </button>
        </div>
      </div>

      {/* 5.1.2 & 5.1.3: Friends Directory & View-Only Closet */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          
          {selectedFriend ? (
            /* 5.1.3 View-Only Virtual Closet of Selected Friend */
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedFriend.avatar_url}
                    alt={selectedFriend.first_name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900 font-display">
                        {selectedFriend.first_name}'s Shared Closet
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        View-Only Mode
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Select any garment below to submit a community borrow request.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedFriend(null)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  ← Back to Friends Directory
                </button>
              </div>

              {friendCloset.length === 0 ? (
                <p className="text-xs text-slate-400 py-12 text-center">
                  This friend hasn’t added garments to their virtual closet yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {friendCloset.map((item) => (
                    <div
                      key={item.item_id}
                      className="bg-slate-50 rounded-2xl border border-slate-200 p-3 flex flex-col justify-between hover:shadow-md transition"
                    >
                      <div className="aspect-square w-full rounded-xl bg-white border border-slate-100 flex items-center justify-center p-3 mb-2 overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="max-h-full max-w-full object-contain filter drop-shadow-xs"
                        />
                      </div>

                      <div className="space-y-1 mb-3">
                        <span className="text-xs font-bold text-slate-900 line-clamp-1">{item.name}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span>{item.category}</span>
                          <span>•</span>
                          <span>{item.color}</span>
                          <span>•</span>
                          <span>{item.wear_count} wears</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenBorrowModal(item)}
                        className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Request to Borrow</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Friend Cards Grid */
            friends.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-800 font-display">No Friends Connected Yet</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Share your unique code (<span className="font-mono font-semibold text-slate-700">{currentUser.friend_code}</span>) or enter a friend's code above to link closets and start borrowing.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map((friend) => {
                  const friendItems = friendsService.getFriendCloset(friend.user_id);
                  return (
                    <div
                      key={friend.user_id}
                      className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-3.5 mb-4">
                        <img
                          src={friend.avatar_url}
                          alt={friend.first_name}
                          className="w-12 h-12 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 font-display">
                            {friend.first_name} {friend.last_name}
                          </h4>
                          <span className="text-xs font-mono text-slate-400 block">{friend.friend_code}</span>
                          <span className="text-[11px] text-emerald-700 font-medium">
                            {friendItems.length} lendable pieces
                          </span>
                        </div>
                      </div>

                      {/* Closet preview thumbnails */}
                      <div className="flex items-center gap-2 mb-4 bg-slate-50 p-2 rounded-xl border border-slate-100 overflow-x-auto">
                        {friendItems.slice(0, 3).map((fi) => (
                          <div key={fi.item_id} className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0">
                            <img src={fi.image_url} alt={fi.name} className="max-h-full max-w-full object-contain" />
                          </div>
                        ))}
                        {friendItems.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-bold px-1.5">
                            +{friendItems.length - 3} more
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenFriendCloset(friend)}
                        className="w-full py-2.5 rounded-xl border border-slate-200 hover:border-slate-900 bg-white hover:bg-slate-900 hover:text-white text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Browse Closet Grid</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}

        </div>
      )}

      {/* 5.1.4 Borrow Request Board: Incoming Owner Reviews */}
      {activeTab === 'incoming' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 font-display">
              Incoming Borrow Requests (Garment Owner Board)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and authorize community wardrobe loans on your garments.
            </p>
          </div>

          {incomingBorrows.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center">
              No incoming borrow requests on your closet items at this time.
            </p>
          ) : (
            <div className="space-y-3">
              {incomingBorrows.map((b) => (
                <div
                  key={b.borrow_id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={b.item?.image_url}
                      alt={b.item?.name}
                      className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 p-1"
                    />
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">{b.item?.name}</h5>
                      <span className="text-xs text-slate-500 block">
                        Borrower: <strong>{b.borrower?.first_name} {b.borrower?.last_name}</strong>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Loan Duration: {b.start_date} to {b.end_date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                      b.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' :
                      b.status === 'Returned' ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {b.status}
                    </span>

                    {b.status === 'Pending' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onUpdateBorrowStatus(b.borrow_id, 'Accepted')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          Accept Loan
                        </button>
                        <button
                          onClick={() => onUpdateBorrowStatus(b.borrow_id, 'Rejected')}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {b.status === 'Accepted' && (
                      <button
                        onClick={() => onUpdateBorrowStatus(b.borrow_id, 'Returned')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-emerald-400" />
                        <span>Mark as Returned</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5.1.4 Borrow Request Board: My Active Borrows */}
      {activeTab === 'my-borrows' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 font-display">
              My Borrowed Garments & Pending Requests
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Items you have requested to borrow from friends' virtual closets.
            </p>
          </div>

          {myBorrowRequests.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center">
              You have not borrowed any garments yet. Visit a friend's closet to borrow a piece!
            </p>
          ) : (
            <div className="space-y-3">
              {myBorrowRequests.map((b) => (
                <div
                  key={b.borrow_id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={b.item?.image_url}
                      alt={b.item?.name}
                      className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 p-1"
                    />
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">{b.item?.name}</h5>
                      <span className="text-xs text-slate-500 block">
                        Lender: <strong>{b.lender?.first_name} {b.lender?.last_name}</strong>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Dates: {b.start_date} → {b.end_date}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      b.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                      b.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' :
                      b.status === 'Returned' ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Borrow Request Modal */}
      {borrowItemTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-base text-slate-900 font-display">
                Request to Borrow Garment
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Community loan from {selectedFriend?.first_name}'s wardrobe
              </p>
            </div>

            <form onSubmit={handleConfirmBorrow} className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <img
                  src={borrowItemTarget.image_url}
                  alt={borrowItemTarget.name}
                  className="w-14 h-14 rounded-lg object-contain bg-white border border-slate-200"
                />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{borrowItemTarget.name}</h4>
                  <span className="text-xs text-slate-500">{borrowItemTarget.category} • {borrowItemTarget.color}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date (Pickup / Delivery)
                </label>
                <input
                  type="date"
                  required
                  value={borrowStartDate}
                  onChange={(e) => setBorrowStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Return Date
                </label>
                <input
                  type="date"
                  required
                  value={borrowEndDate}
                  onChange={(e) => setBorrowEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBorrowItemTarget(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Submit Loan Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
