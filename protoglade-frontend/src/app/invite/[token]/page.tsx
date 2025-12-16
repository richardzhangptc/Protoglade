'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Invitation } from '@/types';

export default function InvitePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (token) {
      loadInvitation();
    }
  }, [token]);

  const loadInvitation = async () => {
    try {
      const data = await api.getInvitationByToken(token);
      setInvitation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user) {
      // Store the token and redirect to login
      localStorage.setItem('pendingInviteToken', token);
      router.push('/auth/login');
      return;
    }

    setIsAccepting(true);
    setError('');

    try {
      await api.acceptInvitation(token);
      setAccepted(true);
      // Redirect to the workspace after a short delay
      setTimeout(() => {
        router.push(`/workspaces/${invitation?.workspace.id}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  // Check for pending invite token after login
  useEffect(() => {
    if (user && !authLoading) {
      const pendingToken = localStorage.getItem('pendingInviteToken');
      if (pendingToken === token) {
        localStorage.removeItem('pendingInviteToken');
        handleAccept();
      }
    }
  }, [user, authLoading, token]);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Invalid Invitation</h1>
          <p className="text-[var(--color-text-muted)] mb-6">{error}</p>
          <Link href="/" className="btn btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Welcome to the Team! 🎉</h1>
          <p className="text-[var(--color-text-muted)] mb-4">
            You&apos;ve successfully joined <strong>{invitation?.workspace.name}</strong>
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">Redirecting you to the workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Protoglade
          </h1>
        </div>

        {/* Invitation Card */}
        <div className="card">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">You&apos;re Invited!</h2>
            <p className="text-[var(--color-text-muted)]">
              <strong>{invitation?.invitedBy.name || invitation?.invitedBy.email}</strong> has invited you to join
            </p>
          </div>

          {/* Workspace Info */}
          <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                {invitation?.workspace.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold">{invitation?.workspace.name}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  as {invitation?.role === 'admin' ? 'Admin' : 'Member'}
                </p>
              </div>
            </div>
          </div>

          {/* Email Note */}
          <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
            This invitation was sent to <strong>{invitation?.email}</strong>
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {/* Actions */}
          {user ? (
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="btn btn-primary w-full"
            >
              {isAccepting ? 'Joining...' : 'Accept Invitation'}
            </button>
          ) : (
            <div className="space-y-3">
              <Link
                href={`/auth/login?redirect=/invite/${token}`}
                className="btn btn-primary w-full block text-center"
              >
                Sign in to Accept
              </Link>
              <Link
                href={`/auth/register?redirect=/invite/${token}`}
                className="btn btn-secondary w-full block text-center"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

