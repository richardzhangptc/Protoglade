'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user, isLoading: authLoading, updateProfile, logout } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState('');

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateSuccess(false);
    setUpdateError('');
    setIsUpdating(true);

    try {
      const updates: { name?: string; email?: string } = {};
      
      // Only include changed fields
      if (name !== user?.name) {
        updates.name = name;
      }
      if (email !== user?.email) {
        updates.email = email;
      }

      // If nothing changed, just show success
      if (Object.keys(updates).length === 0) {
        setUpdateSuccess(true);
        setIsUpdating(false);
        return;
      }

      await updateProfile(updates);
      setUpdateSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-text-muted)] border-t-transparent" />
      </div>
    );
  }

  const getUserInitial = () => {
    if (user.name) return user.name.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-[var(--color-text)]">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Profile Section */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            {/* Profile Header */}
            <div className="p-6 border-b border-[var(--color-border)] bg-gradient-to-r from-violet-500/5 to-purple-500/5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {getUserInitial()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text)]">
                    {user.name || user.email?.split('@')[0]}
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)]">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <h3 className="text-sm font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                Profile Information
              </h3>

              {/* Success Message */}
              {updateSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Profile updated successfully!
                </div>
              )}

              {/* Error Message */}
              {updateError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {updateError}
                </div>
              )}

              {/* Name Input */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2 text-[var(--color-text)]">
                  Display Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full"
                />
                <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                  This is how your name will appear to others in workspaces
                </p>
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-[var(--color-text)]">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full"
                />
                <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                  Used for login and notifications
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2.5 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-xl font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdating ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                {(name !== user.name || email !== user.email) && (
                  <button
                    type="button"
                    onClick={() => {
                      setName(user.name || '');
                      setEmail(user.email || '');
                    }}
                    className="px-4 py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Account Actions Section */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-sm font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
                Account
              </h3>

              <div className="space-y-3">
                {/* Log Out Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left text-red-500 hover:bg-red-500/10 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Log Out</p>
                    <p className="text-xs text-red-400/70">Sign out of your account on this device</p>
                  </div>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

