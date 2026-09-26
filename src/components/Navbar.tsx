import React from 'react';
import { 
  Shirt, 
  Calendar, 
  BrainCircuit, 
  BarChart3, 
  Users, 
  MapPin, 
  Database, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { User } from '../types/database';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (userId: string) => void;
  onOpenDatabaseModal: () => void;
  isSupabaseConfigured: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  allUsers,
  onSwitchUser,
  onOpenDatabaseModal,
  isSupabaseConfigured
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);

  const navItems = [
    { id: 'closet', label: 'Virtual Closet', icon: Shirt },
    { id: 'daily-log', label: 'Daily Outfit Log', icon: Calendar },
    { id: 'bsas', label: 'BSAS Recovery', icon: BrainCircuit },
    { id: 'analytics', label: 'Closet Analytics', icon: BarChart3 },
    { id: 'friends', label: 'Friends & Lending', icon: Users },
    { id: 'donations', label: 'Donation Map', icon: MapPin },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & SDG 12 Identity */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('closet')} 
              className="flex items-center gap-2.5 text-left group transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition">
                <Shirt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg tracking-tight text-slate-900 font-display">ReApparel</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    SDG 12
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Responsible Closet Utilization & Recovery
                </p>
              </div>
            </button>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Bar: Database & User Switcher */}
          <div className="flex items-center gap-2.5">
            {/* Supabase Status / Schema trigger */}
            <button
              onClick={onOpenDatabaseModal}
              title="Supabase Schema & Settings"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Supabase</span>
              <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500' : 'bg-teal-500 ring-2 ring-teal-200 animate-pulse'}`} />
            </button>

            {/* User Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              >
                <img
                  src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt={currentUser.first_name}
                  className="w-7 h-7 rounded-full object-cover border border-slate-200"
                />
                <div className="text-left hidden lg:block">
                  <span className="text-xs font-semibold text-slate-800 block leading-tight">
                    {currentUser.first_name} {currentUser.last_name[0]}.
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {currentUser.friend_code}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Switch User Account (Testing)
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Switch profiles to test friend closets & borrow requests
                    </p>
                  </div>

                  {allUsers.map((u) => {
                    const isSelected = u.user_id === currentUser.user_id;
                    return (
                      <button
                        key={u.user_id}
                        onClick={() => {
                          onSwitchUser(u.user_id);
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition cursor-pointer ${
                          isSelected ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <img
                          src={u.avatar_url}
                          alt={u.first_name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        />
                        <div className="flex-1 truncate">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">{u.first_name} {u.last_name}</span>
                            {isSelected && <span className="text-[10px] text-emerald-600 font-bold">Active</span>}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{u.friend_code}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Navigation Strip */}
      <div className="md:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-slate-100 gap-1 scrollbar-none bg-slate-50/50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
