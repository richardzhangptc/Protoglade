'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';

interface UserPopupProps {
  user: User;
  onLogout: () => void;
}

export function UserPopup({ user, onLogout }: UserPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSettingsClick = () => {
    setIsOpen(false);
    router.push('/settings');
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    onLogout();
  };

  const getUserInitial = () => {
    if (user.name) return user.name.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const getUserDisplayName = () => {
    return user.name || user.email?.split('@')[0] || 'User';
  };

  return (
    <div className="relative" ref={popupRef}>
      {/* User Button - triggers popup */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-2 py-2 w-full rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ring-2 ring-transparent group-hover:ring-[var(--color-border)] transition-all">
          {getUserInitial()}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-[var(--color-text)] truncate">
            {getUserDisplayName()}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {user.email}
          </p>
        </div>
        <svg 
          className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Popup Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* User Profile Header */}
          <div className="p-4 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-lg font-semibold shadow-lg">
                {getUserInitial()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--color-text)] truncate">
                  {getUserDisplayName()}
                </p>
                <p className="text-sm text-[var(--color-text-muted)] truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Options */}
          <div className="p-2">
            {/* Settings */}
            <button
              onClick={handleSettingsClick}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-hover)] group-hover:bg-[var(--color-border)] flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Settings</p>
                <p className="text-xs text-[var(--color-text-muted)]">Manage your account</p>
              </div>
            </button>

            {/* Divider */}
            <div className="my-2 border-t border-[var(--color-border)]" />

            {/* Logout */}
            <button
              onClick={handleLogoutClick}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-red-500 hover:bg-red-500/10 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Log Out</p>
                <p className="text-xs text-red-400/70">Sign out of your account</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

